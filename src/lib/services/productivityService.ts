import { createClient } from '@/lib/supabase/client';
import {
  DocumentItem,
  Goal,
  KeyResult,
  TimeEntry,
  Sprint,
  CalendarEvent,
  UserProfile,
  GoalStatus,
  TaskPriority,
} from '@/lib/types';

function parseProfile(raw: any): UserProfile {
  const name = raw?.full_name || raw?.email?.split('@')[0] || 'Team Member';
  const initials =
    name
      .split(' ')
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'TM';

  return {
    id: raw?.id || '',
    name,
    email: raw?.email || '',
    avatarUrl: raw?.avatar_url || undefined,
    initials,
    role: raw?.job_title || 'Member',
  };
}

// ------------------------------------------------------------------------------
// 1. Documents & Wiki
// ------------------------------------------------------------------------------

export async function getDocuments(
  workspaceId: string,
  projectId?: string
): Promise<DocumentItem[]> {
  const supabase = createClient();

  let query = supabase
    .from('documents')
    .select(`
      *,
      project:projects(id, key, name),
      author:profiles!created_by(id, full_name, email, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    workspaceId: d.workspace_id,
    projectId: d.project_id || undefined,
    projectName: d.project?.name || undefined,
    parentDocId: d.parent_doc_id || undefined,
    title: d.title,
    content: d.content || '',
    icon: d.icon || '📄',
    isPublished: Boolean(d.is_published),
    author: d.author ? parseProfile(d.author) : undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

export async function createDocument(input: {
  workspaceId: string;
  projectId?: string;
  title: string;
  content?: string;
  icon?: string;
}): Promise<DocumentItem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      title: input.title.trim() || 'Untitled Document',
      content: input.content || '',
      icon: input.icon || '📄',
      created_by: user?.id || null,
    })
    .select('*, author:profiles!created_by(id, full_name, email, avatar_url)')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    projectId: data.project_id || undefined,
    title: data.title,
    content: data.content,
    icon: data.icon,
    isPublished: data.is_published,
    author: data.author ? parseProfile(data.author) : undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateDocument(
  docId: string,
  updates: { title?: string; content?: string; icon?: string }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('documents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId);

  if (error) throw error;
}

export async function deleteDocument(docId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('documents').delete().eq('id', docId);
  if (error) throw error;
}

// ------------------------------------------------------------------------------
// 2. Goals & OKRs
// ------------------------------------------------------------------------------

export async function getGoals(workspaceId: string, projectId?: string): Promise<Goal[]> {
  const supabase = createClient();

  let query = supabase
    .from('goals')
    .select(`
      *,
      project:projects(id, key, name),
      owner:profiles!owner_id(id, full_name, email, avatar_url),
      key_results(*)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((g: any) => ({
    id: g.id,
    workspaceId: g.workspace_id,
    projectId: g.project_id || undefined,
    projectName: g.project?.name || undefined,
    title: g.title,
    description: g.description || undefined,
    status: g.status as GoalStatus,
    progressPercent: g.progress_percent,
    targetDate: g.target_date || undefined,
    owner: g.owner ? parseProfile(g.owner) : undefined,
    keyResults: (g.key_results || []).map((kr: any) => ({
      id: kr.id,
      goalId: kr.goal_id,
      title: kr.title,
      initialValue: Number(kr.initial_value),
      currentValue: Number(kr.current_value),
      targetValue: Number(kr.target_value),
      unit: kr.unit || '%',
    })),
    createdAt: g.created_at,
  }));
}

export async function createGoal(input: {
  workspaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  targetDate?: string;
  keyResults?: { title: string; targetValue: number; unit?: string }[];
}): Promise<Goal> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goal, error } = await supabase
    .from('goals')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      target_date: input.targetDate || null,
      owner_id: user?.id || null,
      status: 'on_track',
      progress_percent: 0,
    })
    .select('*, owner:profiles!owner_id(id, full_name, email, avatar_url)')
    .single();

  if (error) throw error;

  // Insert key results if provided
  const keyResults: KeyResult[] = [];
  if (input.keyResults && input.keyResults.length > 0) {
    const krRows = input.keyResults.map((kr) => ({
      goal_id: goal.id,
      title: kr.title,
      target_value: kr.targetValue,
      current_value: 0,
      initial_value: 0,
      unit: kr.unit || '%',
    }));

    const { data: insertedKrs } = await supabase
      .from('key_results')
      .insert(krRows)
      .select();

    if (insertedKrs) {
      insertedKrs.forEach((r: any) => {
        keyResults.push({
          id: r.id,
          goalId: r.goal_id,
          title: r.title,
          initialValue: Number(r.initial_value),
          currentValue: Number(r.current_value),
          targetValue: Number(r.target_value),
          unit: r.unit,
        });
      });
    }
  }

  return {
    id: goal.id,
    workspaceId: goal.workspace_id,
    projectId: goal.project_id || undefined,
    title: goal.title,
    description: goal.description || undefined,
    status: goal.status as GoalStatus,
    progressPercent: 0,
    targetDate: goal.target_date || undefined,
    owner: goal.owner ? parseProfile(goal.owner) : undefined,
    keyResults,
    createdAt: goal.created_at,
  };
}

export async function updateGoalProgress(
  goalId: string,
  progressPercent: number,
  status: GoalStatus
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('goals')
    .update({
      progress_percent: progressPercent,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId);

  if (error) throw error;
}

// ------------------------------------------------------------------------------
// 3. Time Tracking & Timesheets
// ------------------------------------------------------------------------------

export async function getTimeEntries(
  workspaceId: string,
  userId?: string,
  projectId?: string
): Promise<TimeEntry[]> {
  const supabase = createClient();

  let query = supabase
    .from('time_entries')
    .select(`
      *,
      project:projects(id, key, name),
      task:tasks(id, task_number, title),
      user:profiles!user_id(id, full_name, email, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    workspaceId: t.workspace_id,
    projectId: t.project_id,
    projectName: t.project?.name,
    projectKey: t.project?.key,
    taskId: t.task_id || undefined,
    taskTitle: t.task?.title || undefined,
    taskNumber: t.task?.task_number || undefined,
    user: parseProfile(t.user),
    durationMinutes: t.duration_minutes,
    description: t.description || undefined,
    entryDate: t.entry_date,
    createdAt: t.created_at,
  }));
}

export async function logTimeEntry(input: {
  workspaceId: string;
  projectId: string;
  taskId?: string;
  durationMinutes: number;
  description?: string;
  entryDate?: string;
}): Promise<TimeEntry> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required to log time.');

  const dateToUse = input.entryDate || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      task_id: input.taskId || null,
      user_id: user.id,
      duration_minutes: input.durationMinutes,
      description: input.description?.trim() || null,
      entry_date: dateToUse,
    })
    .select(`
      *,
      project:projects(id, key, name),
      task:tasks(id, task_number, title),
      user:profiles!user_id(id, full_name, email, avatar_url)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    projectId: data.project_id,
    projectName: data.project?.name,
    projectKey: data.project?.key,
    taskId: data.task_id || undefined,
    taskTitle: data.task?.title || undefined,
    taskNumber: data.task?.task_number || undefined,
    user: parseProfile(data.user),
    durationMinutes: data.duration_minutes,
    description: data.description || undefined,
    entryDate: data.entry_date,
    createdAt: data.created_at,
  };
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
}

// ------------------------------------------------------------------------------
// 4. Calendar & Schedule Aggregator
// ------------------------------------------------------------------------------

export async function getCalendarEvents(workspaceId: string): Promise<CalendarEvent[]> {
  const supabase = createClient();

  const events: CalendarEvent[] = [];

  try {
    // 1. Fetch tasks with due dates
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, task_number, title, due_date, priority, status, project:projects(id, key, name)')
      .eq('workspace_id', workspaceId)
      .not('due_date', 'is', null);

    if (tasks) {
      tasks.forEach((t: any) => {
        if (t.due_date) {
          events.push({
            id: `task-${t.id}`,
            title: `${t.project?.key ? `[${t.project.key}-${t.task_number}] ` : ''}${t.title}`,
            date: t.due_date.split('T')[0],
            type: 'task',
            priority: t.priority as TaskPriority,
            status: t.status,
            projectKey: t.project?.key,
            projectName: t.project?.name,
            projectId: t.project?.id,
            taskId: t.id,
          });
        }
      });
    }

    // 2. Fetch project target dates
    const { data: projects } = await supabase
      .from('projects')
      .select('id, key, name, target_date, health')
      .eq('workspace_id', workspaceId)
      .not('target_date', 'is', null);

    if (projects) {
      projects.forEach((p: any) => {
        if (p.target_date) {
          events.push({
            id: `proj-${p.id}`,
            title: `🏁 ${p.name} Target Delivery`,
            date: p.target_date.split('T')[0],
            type: 'milestone',
            projectKey: p.key,
            projectName: p.name,
            projectId: p.id,
          });
        }
      });
    }

    // 3. Fetch goals target dates
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, target_date, status')
      .eq('workspace_id', workspaceId)
      .not('target_date', 'is', null);

    if (goals) {
      goals.forEach((g: any) => {
        if (g.target_date) {
          events.push({
            id: `goal-${g.id}`,
            title: `🎯 ${g.title}`,
            date: g.target_date,
            type: 'goal',
            status: g.status,
          });
        }
      });
    }
  } catch (err) {
    console.warn('Failed to aggregate calendar events:', err);
  }

  // Return empty if no real data
  return events;
}

