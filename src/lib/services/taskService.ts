import { createClient } from '@/lib/supabase/client';
import { Task, TaskStatus, TaskPriority, UserProfile } from '@/lib/types';
import { triggerAutomations } from '@/lib/services/automationService';

export interface CreateTaskInput {
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  storyPoints?: number;
  reviewRequired?: boolean;
  assigneeIds?: string[];
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = createClient();

  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, key, name),
      assignees:task_assignees(
        user:profiles(id, full_name, email, avatar_url)
      ),
      subtasks:task_subtasks(id, title, is_completed, position)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching tasks:', error.message);
    return [];
  }

  if (!rawTasks) return [];

  return rawTasks.map((t: any) => {
    const assignees: UserProfile[] = (t.assignees || []).map((a: any) => {
      const u = a.user || {};
      const name = u.full_name || 'Member';
      return {
        id: u.id || '',
        name,
        email: u.email || '',
        avatarUrl: u.avatar_url || undefined,
        initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TM',
        role: 'Contributor',
      };
    });

    const subtasks = t.subtasks || [];
    const completedSubtasks = subtasks.filter((s: any) => s.is_completed).length;

    return {
      id: t.id,
      taskNumber: t.task_number || 1,
      projectId: t.project_id,
      projectKey: t.project?.key || 'PRJ',
      projectName: t.project?.name || 'Project',
      title: t.title,
      description: t.description || undefined,
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      dueDate: t.due_date || undefined,
      assignees,
      estimatedHours: t.estimated_hours ? Number(t.estimated_hours) : undefined,
      loggedHours: t.logged_hours ? Number(t.logged_hours) : 0,
      storyPoints: t.story_points || undefined,
      reviewRequired: Boolean(t.review_required),
      isBlocked: Boolean(t.is_blocked),
      blockReason: t.block_reason || undefined,
      subtaskCount: subtasks.length,
      completedSubtasks,
      commentsCount: 0,
    };
  });
}

export async function createTask(input: CreateTaskInput): Promise<any> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required to create a task.');
  }

  // 1. Insert task
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority || 'medium',
      due_date: input.dueDate || null,
      start_date: input.startDate || null,
      estimated_hours: input.estimatedHours || null,
      story_points: input.storyPoints || null,
      review_required: Boolean(input.reviewRequired),
      created_by: user.id,
      status: 'todo',
    })
    .select('*, project:projects(key, name)')
    .single();

  if (error) throw error;

  // 2. Assign members if specified
  if (input.assigneeIds && input.assigneeIds.length > 0) {
    const assigneeRows = input.assigneeIds.map((userId) => ({
      task_id: task.id,
      user_id: userId,
    }));
    await supabase.from('task_assignees').insert(assigneeRows);
  }

  // 3. Trigger Phase 6 automations asynchronously
  try {
    await triggerAutomations(input.workspaceId, 'task_created', {
      taskId: task.id,
      projectId: input.projectId,
      title: input.title,
      priority: input.priority || 'medium',
    });
  } catch (autoErr) {
    console.warn('Automation trigger failed:', autoErr);
  }

  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('*, project:projects(workspace_id)')
    .single();

  if (error) throw error;

  // Trigger Phase 6 automations
  try {
    const wsId = data.workspace_id || (data.project as any)?.workspace_id;
    if (wsId) {
      await triggerAutomations(wsId, 'task_status_changed', {
        taskId,
        status,
        title: data.title,
      });

      if (status === 'completed') {
        await triggerAutomations(wsId, 'task_completed', {
          taskId,
          title: data.title,
        });
      }
    }
  } catch (autoErr) {
    console.warn('Automation trigger failed:', autoErr);
  }

  return data;
}

export async function updateTaskPriority(taskId: string, priority: TaskPriority) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tasks')
    .update({
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addSubtask(taskId: string, title: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('task_subtasks')
    .insert({
      task_id: taskId,
      title: title.trim(),
      is_completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleSubtask(subtaskId: string, isCompleted: boolean) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('task_subtasks')
    .update({
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subtaskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitTaskForReview(taskId: string, submissionNote?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required.');

  // 1. Create review request
  const { data: req, error } = await supabase
    .from('review_requests')
    .insert({
      task_id: taskId,
      submitter_id: user.id,
      state: 'pending',
      submission_note: submissionNote?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Transition task to ready_for_review
  const { data: updatedTask } = await supabase
    .from('tasks')
    .update({ status: 'ready_for_review', updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select('title, workspace_id, project:projects(workspace_id)')
    .single();

  // Trigger Phase 6 automations
  try {
    const wsId = updatedTask?.workspace_id || (updatedTask?.project as any)?.workspace_id;
    if (wsId) {
      await triggerAutomations(wsId, 'review_requested', {
        taskId,
        taskTitle: updatedTask?.title,
        submissionNote,
      });
    }
  } catch (autoErr) {
    console.warn('Automation trigger failed:', autoErr);
  }

  return req;
}

export async function decideReview(
  reviewRequestId: string,
  taskId: string,
  decision: 'approved' | 'changes_requested',
  note?: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required.');

  // 1. Update review request
  const { data: req, error } = await supabase
    .from('review_requests')
    .update({
      state: decision,
      reviewer_id: user.id,
      decision_note: note?.trim() || null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', reviewRequestId)
    .select()
    .single();

  if (error) throw error;

  // 2. If approved -> status: completed; If changes_requested -> status: in_progress
  const nextStatus: TaskStatus = decision === 'approved' ? 'completed' : 'in_progress';
  const { data: updatedTask } = await supabase
    .from('tasks')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select('title, workspace_id, project:projects(workspace_id)')
    .single();

  // Trigger Phase 6 automations
  try {
    const wsId = updatedTask?.workspace_id || (updatedTask?.project as any)?.workspace_id;
    if (wsId && decision === 'approved') {
      await triggerAutomations(wsId, 'review_approved', {
        taskId,
        taskTitle: updatedTask?.title,
      });
      await triggerAutomations(wsId, 'task_completed', {
        taskId,
        taskTitle: updatedTask?.title,
      });
    }
  } catch (autoErr) {
    console.warn('Automation trigger failed:', autoErr);
  }

  return req;
}

export async function getWorkspaceMembers(workspaceId: string): Promise<UserProfile[]> {
  if (!workspaceId) {
    return [];
  }

  const supabase = createClient();

  try {
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        role,
        job_title,
        user_id,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    const result: UserProfile[] = [];

    if (members && members.length > 0) {
      for (const m of members) {
        const p = (m as any).profiles;
        if (p) {
          const name = p.full_name || p.email?.split('@')[0] || 'Team Member';
          result.push({
            id: p.id || m.user_id,
            name,
            email: p.email || '',
            avatarUrl: p.avatar_url || undefined,
            initials:
              name
                .split(' ')
                .map((part: string) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'TM',
            role: m.job_title || (m.role === 'owner' ? 'Workspace Owner' : m.role),
          });
        }
      }
    }

    // Ensure currently authenticated user is in the list
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser && !result.some((u) => u.id === authUser.id)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const name = profile?.full_name || authUser.email?.split('@')[0] || 'Member';
      result.unshift({
        id: authUser.id,
        name,
        email: authUser.email || '',
        avatarUrl: profile?.avatar_url || undefined,
        initials:
          name
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'TM',
        role: 'Workspace Owner',
      });
    }

    return result;
  } catch (err) {
    console.warn('Failed to load workspace members:', err);
    return [];
  }
}

export async function assignUserToTask(taskId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validate task and project membership
  const { data: taskData } = await supabase
    .from('tasks')
    .select('title, workspace_id, project_id, project:projects(workspace_id, name, owner_id, lead_id)')
    .eq('id', taskId)
    .single();

  if (!taskData) throw new Error('Task not found');

  const projectId = taskData.project_id;
  const projectInfo = taskData.project as any;

  // Verify userId is a project member or owner/lead
  const { data: isMember } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!isMember && projectInfo?.owner_id !== userId && projectInfo?.lead_id !== userId) {
    throw new Error('Only authorized members of this project can be assigned to deliverables.');
  }

  const { error } = await supabase.from('task_assignees').insert({
    task_id: taskId,
    user_id: userId,
  });

  if (error && error.code !== '23505') {
    throw error;
  }

  // Create an in-app notification for the assigned teammate
  try {
    if (user && userId !== user.id) {
      const wsId = taskData.workspace_id || projectInfo?.workspace_id;

      if (wsId) {
        await supabase.from('notifications').insert({
          workspace_id: wsId,
          recipient_id: userId,
          actor_id: user.id,
          type: 'assigned',
          title: 'Assigned to Deliverable',
          body: `You were assigned to deliverable "${taskData.title}".`,
          link_url: `/w/${wsId}/tasks`,
        });
      }
    }
  } catch (notifErr) {
    console.warn('Failed to dispatch assignment notification:', notifErr);
  }
}

export async function unassignUserFromTask(taskId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId);

  if (error) throw error;
}

