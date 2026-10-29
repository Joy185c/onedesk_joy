import { createClient } from '@/lib/supabase/client';
import { ProjectSummary, ProjectHealth, UserProfile, ProjectRole, ProjectMemberDetail } from '@/lib/types';
import { getCache, setCache, invalidateCache } from '@/lib/cache';

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

  // Invalidate cached projects for this workspace
  invalidateCache(`ws-projects-${wsId}`);

  return project;
}

export async function getWorkspaceProjects(workspaceId: string): Promise<ProjectSummary[]> {
  const cacheKey = `ws-projects-${workspaceId}`;
  const cached = getCache<ProjectSummary[]>(cacheKey);
  if (cached) return cached;

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
      project_members (
        id,
        role,
        job_title,
        created_at,
        profiles:user_id (id, full_name, email, avatar_url)
      ),
      tasks:tasks (id, status, due_date)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching projects:', error.message);
    return [];
  }

  if (!projects) return [];

  const result: ProjectSummary[] = projects.map((p: any) => {
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

    const members: UserProfile[] = (p.project_members || []).map((pm: any) => {
      const u = pm.profiles || {};
      const name = u.full_name || 'Member';
      return {
        id: u.id || pm.id,
        name,
        email: u.email || '',
        avatarUrl: u.avatar_url || undefined,
        initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TM',
        role: pm.job_title || (pm.role === 'owner' ? 'Project Lead' : pm.role),
      };
    });

    if (members.length === 0) {
      members.push(leadProfile);
    }

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
      members,
      lead: leadProfile,
    };
  });

  setCache(cacheKey, result);
  return result;
}

export async function getProjectById(projectId: string) {
  const supabase = createClient();

  // 1. Fetch project with owner and lead
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select(`
      *,
      owner:owner_id(id, full_name, email, avatar_url),
      lead:lead_id(id, full_name, email, avatar_url)
    `)
    .eq('id', projectId)
    .maybeSingle();

  if (projErr) {
    console.error('Error fetching project:', projErr.message);
    throw projErr;
  }
  if (!project) return null;

  // 2. Fetch project members with profiles
  try {
    const { data: members, error: memErr } = await supabase
      .from('project_members')
      .select(`
        id,
        role,
        job_title,
        created_at,
        profiles:user_id(id, full_name, email, avatar_url)
      `)
      .eq('project_id', projectId);

    if (!memErr && members) {
      project.project_members = members.map((m: any) => ({
        id: m.id,
        role: m.role,
        job_title: m.job_title,
        created_at: m.created_at,
        user: m.profiles || {},
      }));
    } else {
      project.project_members = [];
    }
  } catch {
    project.project_members = [];
  }

  return project;
}

export async function getProjectMembers(projectId: string): Promise<ProjectMemberDetail[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id,
      project_id,
      user_id,
      role,
      job_title,
      created_at,
      profiles:user_id(
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Error fetching project members:', error.message);
    return [];
  }

  if (!data) return [];

  return data.map((pm: any) => {
    const p = pm.profiles || {};
    const name = p.full_name || p.email?.split('@')[0] || 'Member';
    return {
      id: pm.id,
      projectId: pm.project_id,
      userId: pm.user_id,
      role: pm.role as ProjectRole,
      jobTitle: pm.job_title || (pm.role === 'owner' ? 'Project Lead' : pm.role),
      joinedAt: pm.created_at || pm.joined_at,
      user: {
        id: p.id || pm.user_id,
        name,
        email: p.email || '',
        avatarUrl: p.avatar_url || undefined,
        initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TM',
        role: pm.job_title || pm.role,
      },
    };
  });
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole = 'contributor',
  jobTitle?: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role,
    job_title: jobTitle || (role === 'owner' ? 'Project Lead' : role),
  });

  if (error && error.code !== '23505') {
    throw error;
  }

  // Auto-sync into project #general channel
  try {
    const { data: generalChan } = await supabase
      .from('channels')
      .select('id')
      .eq('project_id', projectId)
      .eq('slug', 'general')
      .maybeSingle();

    if (generalChan?.id) {
      await supabase.from('channel_members').upsert(
        {
          channel_id: generalChan.id,
          user_id: userId,
          role: role === 'owner' || role === 'manager' ? 'admin' : 'member',
        },
        { onConflict: 'channel_id,user_id', ignoreDuplicates: true }
      );
    }
  } catch (syncErr) {
    console.warn('Project channel membership sync notice:', syncErr);
  }

  // Invalidate caches
  invalidateCache();
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
  jobTitle?: string
): Promise<void> {
  const supabase = createClient();

  const updates: any = { role };
  if (jobTitle !== undefined) updates.job_title = jobTitle;

  const { error } = await supabase
    .from('project_members')
    .update(updates)
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
  invalidateCache();
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const supabase = createClient();

  // Safety check: ensure we do not remove the last owner
  const { data: owners } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('role', 'owner');

  if (owners && owners.length === 1 && owners[0].user_id === userId) {
    throw new Error('Cannot remove the sole Project Lead/Owner. Please transfer ownership first.');
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;

  // Remove from project channel
  try {
    const { data: generalChan } = await supabase
      .from('channels')
      .select('id')
      .eq('project_id', projectId)
      .eq('slug', 'general')
      .maybeSingle();

    if (generalChan?.id) {
      await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', generalChan.id)
        .eq('user_id', userId);
    }
  } catch {
    // Non-blocking
  }

  invalidateCache();
}

export async function getWorkspaceEligibleMembers(
  workspaceId: string,
  projectId: string
): Promise<UserProfile[]> {
  const supabase = createClient();

  // 1. Get all active workspace members
  const { data: wsMembers } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      job_title,
      profiles:user_id(id, full_name, email, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  // 2. Get existing project member user_ids
  const { data: projMembers } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const existingIds = new Set((projMembers || []).map((pm) => pm.user_id));

  const eligible: UserProfile[] = [];
  (wsMembers || []).forEach((m: any) => {
    if (!existingIds.has(m.user_id)) {
      const p = m.profiles || {};
      const name = p.full_name || p.email?.split('@')[0] || 'Team Member';
      eligible.push({
        id: p.id || m.user_id,
        name,
        email: p.email || '',
        avatarUrl: p.avatar_url || undefined,
        initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TM',
        role: m.job_title || m.role,
      });
    }
  });

  return eligible;
}

