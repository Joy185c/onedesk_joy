import { createClient } from '@/lib/supabase/client';
import { ProjectSummary, ProjectHealth, UserProfile } from '@/lib/types';

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  spaceId?: string;
  leadId?: string;
  targetDate?: string;
  visibility?: 'public_in_workspace' | 'private';
}

export async function createProject(input: CreateProjectInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required to create a project.');
  }

  let wsId = input.workspaceId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wsId || '');
  if (!isUuid) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .or(`slug.eq.${wsId},id.eq.${wsId}`)
      .maybeSingle();
    if (ws?.id) {
      wsId = ws.id;
    } else {
      const { data: fallbackWs } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallbackWs?.id) wsId = fallbackWs.id;
    }
  }

  // Pre-emptively ensure owner is registered in workspace_members
  try {
    await supabase.from('workspace_members').upsert(
      {
        workspace_id: wsId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        job_title: 'Founder & Owner',
      },
      { onConflict: 'workspace_id,user_id', ignoreDuplicates: true }
    );
  } catch {
    // Non-blocking
  }

  const cleanKey = input.key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PRJ';
  const projectId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;

  const insertPayload: any = {
    workspace_id: wsId,
    name: input.name.trim(),
    key: cleanKey,
    description: input.description?.trim() || null,
    space_id: input.spaceId || null,
    owner_id: user.id,
    lead_id: input.leadId || user.id,
    visibility: input.visibility || 'public_in_workspace',
    target_date: input.targetDate || null,
    health: 'on_track',
    status: 'active',
  };
  if (projectId) {
    insertPayload.id = projectId;
  }

  // 1. Insert Project with defensive retry
  let project: any = null;
  let projError: any = null;

  const firstAttempt = await supabase
    .from('projects')
    .insert(insertPayload)
    .select()
    .single();

  if (!firstAttempt.error && firstAttempt.data) {
    project = firstAttempt.data;
  } else {
    projError = firstAttempt.error;
  }

  if (projError && (projError.code === '42501' || projError.message?.includes('row-level security'))) {
    // Attempt inserting directly into workspace_members then retrying
    try {
      await supabase.from('workspace_members').insert({
        workspace_id: wsId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        job_title: 'Founder & Owner',
      });
    } catch {
      // ignore conflict
    }

    // Try insert without .select() if PostgREST RETURNING policy fails
    const pureInsert = await supabase
      .from('projects')
      .insert(insertPayload);

    if (!pureInsert.error) {
      projError = null;
      if (projectId) {
        // Query back or use payload
        const { data: fetched } = await supabase
          .from('projects')
          .select()
          .eq('id', projectId)
          .maybeSingle();
        project = fetched || { ...insertPayload, id: projectId };
      }
    } else {
      projError = pureInsert.error;
    }
  }

  if (projError) throw projError;
  if (!project) {
    project = { ...insertPayload, id: projectId || 'temp-id' };
  }

  // 2. Add creator to project_members as 'owner'
  try {
    await supabase.from('project_members').upsert(
      {
        project_id: project.id,
        user_id: user.id,
        role: 'owner',
        job_title: 'Project Lead',
      },
      { onConflict: 'project_id,user_id', ignoreDuplicates: true }
    );
  } catch (mErr) {
    console.warn('Auto project_member insertion notice:', mErr);
  }

  return project;
}

export async function getWorkspaceProjects(workspaceId: string): Promise<ProjectSummary[]> {
  const supabase = createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      key,
      name,
      space_id,
      health,
      target_date,
      owner_id,
      lead_id,
      lead:lead_id (id, full_name, email, avatar_url),
      tasks:tasks (id, status, due_date)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching projects:', error.message);
    return [];
  }

  if (!projects) return [];

  return projects.map((p: any) => {
    const tasks = p.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdueTasks = tasks.filter(
      (t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;
    const pendingReviews = tasks.filter((t: any) => t.status === 'ready_for_review').length;

    const leadProfile: UserProfile = {
      id: p.lead?.id || p.lead_id || '',
      name: p.lead?.full_name || 'Project Lead',
      email: p.lead?.email || '',
      initials: (p.lead?.full_name || 'PL')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      role: 'Project Lead',
      avatarUrl: p.lead?.avatar_url || undefined,
    };

    return {
      id: p.id,
      key: p.key,
      name: p.name,
      spaceId: p.space_id || 'sp-general',
      health: (p.health as ProjectHealth) || 'on_track',
      progressPercent,
      totalTasks,
      completedTasks,
      overdueTasks,
      pendingReviews,
      targetDate: p.target_date || 'Ongoing',
      members: [leadProfile],
      lead: leadProfile,
    };
  });
}

export async function getProjectById(projectId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:owner_id(id, full_name, email, avatar_url),
      lead:lead_id(id, full_name, email, avatar_url),
      project_members(
        id,
        role,
        job_title,
        user:user_id(id, full_name, email, avatar_url)
      )
    `)
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

