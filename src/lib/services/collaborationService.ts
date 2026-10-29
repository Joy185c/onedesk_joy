import { createClient } from '@/lib/supabase/client';
import {
  Channel,
  ChatMessage,
  TaskComment,
  AppNotification,
  ChannelType,
  UserProfile,
} from '@/lib/types';
import {
  sampleUsers,
  sampleChannels,
  sampleChatMessages,
  sampleTaskComments,
  sampleNotifications,
} from '@/lib/mockData';

// Helper to format profile
function parseProfile(raw: any, fallbackId?: string): UserProfile {
  const item = Array.isArray(raw) ? raw[0] : raw;
  const name = item?.full_name || item?.email?.split('@')[0] || 'Team Member';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((p: string) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'TM';

  return {
    id: item?.id || fallbackId || '',
    name,
    email: item?.email || '',
    avatarUrl: item?.avatar_url || undefined,
    initials,
    role: item?.job_title || 'Member',
  };
}

// ------------------------------------------------------------------------------
// Channels
// ------------------------------------------------------------------------------

export async function getWorkspaceChannels(workspaceId: string): Promise<Channel[]> {
  if (!workspaceId || workspaceId.startsWith('ws-')) {
    return sampleChannels;
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('channels')
      .select(`
        *,
        project:projects(id, key, name)
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return sampleChannels;
    }

    return data.map((c: any) => ({
      id: c.id,
      workspaceId: c.workspace_id,
      projectId: c.project_id || undefined,
      projectName: c.project?.name || undefined,
      projectKey: c.project?.key || undefined,
      name: c.name,
      description: c.description || undefined,
      type: c.type as ChannelType,
      topic: c.topic || undefined,
      isArchived: Boolean(c.is_archived),
      unreadCount: 0,
    }));
  } catch (err) {
    console.warn('Failed to fetch channels:', err);
    return sampleChannels;
  }
}

export async function getProjectChannel(projectId: string): Promise<Channel | null> {
  if (!projectId || projectId.startsWith('proj-')) {
    return (
      sampleChannels.find((c) => c.projectId === projectId) ||
      sampleChannels[2] ||
      null
    );
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('channels')
      .select(`
        *,
        project:projects(id, key, name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      projectId: data.project_id,
      projectName: data.project?.name,
      projectKey: data.project?.key,
      name: data.name,
      description: data.description || undefined,
      type: data.type as ChannelType,
      topic: data.topic || undefined,
      isArchived: Boolean(data.is_archived),
    };
  } catch {
    return null;
  }
}

export async function createChannel(input: {
  workspaceId: string;
  projectId?: string;
  name: string;
  description?: string;
  type?: ChannelType;
  memberIds?: string[];
}): Promise<Channel> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required to create a channel.');

  const cleanName = input.name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      name: cleanName || 'discussion',
      description: input.description?.trim() || null,
      type: input.type || 'public',
      created_by: user.id,
    })
    .select('*, project:projects(id, key, name)')
    .single();

  if (error) throw error;

  // Add creator to channel members
  await supabase.from('channel_members').insert({
    channel_id: channel.id,
    user_id: user.id,
    role: 'admin',
  });

  // Add extra members if specified
  if (input.memberIds && input.memberIds.length > 0) {
    const extraRows = input.memberIds
      .filter((uid) => uid !== user.id)
      .map((uid) => ({
        channel_id: channel.id,
        user_id: uid,
        role: 'member',
      }));
    if (extraRows.length > 0) {
      await supabase.from('channel_members').insert(extraRows);
    }
  }

  return {
    id: channel.id,
    workspaceId: channel.workspace_id,
    projectId: channel.project_id || undefined,
    projectName: channel.project?.name,
    projectKey: channel.project?.key,
    name: channel.name,
    description: channel.description || undefined,
    type: channel.type as ChannelType,
    isArchived: false,
  };
}

// ------------------------------------------------------------------------------
// Messages & Reactions
// ------------------------------------------------------------------------------

export async function getChannelMessages(channelId: string): Promise<ChatMessage[]> {
  if (!channelId || channelId.startsWith('chan-')) {
    return sampleChatMessages[channelId] || sampleChatMessages['chan-general'] || [];
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        author:author_id(id, full_name, email, avatar_url),
        reactions:message_reactions(
          id,
          emoji,
          user_id
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return sampleChatMessages[channelId] || [];
    }

    return data.map((m: any) => {
      // Aggregate reactions by emoji
      const reactionMap: Record<string, { count: number; userIds: string[] }> = {};
      (m.reactions || []).forEach((r: any) => {
        if (!reactionMap[r.emoji]) {
          reactionMap[r.emoji] = { count: 0, userIds: [] };
        }
        reactionMap[r.emoji].count += 1;
        reactionMap[r.emoji].userIds.push(r.user_id);
      });

      const reactions = Object.entries(reactionMap).map(([emoji, meta]) => ({
        emoji,
        count: meta.count,
        userIds: meta.userIds,
      }));

      return {
        id: m.id,
        channelId: m.channel_id,
        author: parseProfile(m.author, m.author_id),
        parentMessageId: m.parent_message_id || undefined,
        body: m.body,
        attachments: m.attachments || [],
        isPinned: Boolean(m.is_pinned),
        isEdited: Boolean(m.is_edited),
        createdAt: m.created_at,
        reactions,
      };
    });
  } catch {
    return sampleChatMessages[channelId] || [];
  }
}

export async function sendChatMessage(input: {
  channelId: string;
  body: string;
  parentMessageId?: string;
  attachments?: any[];
}): Promise<ChatMessage> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required to send message.');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: input.channelId,
      author_id: user.id,
      parent_message_id: input.parentMessageId || null,
      body: input.body.trim(),
      attachments: input.attachments || [],
    })
    .select(`
      *,
      author:author_id(id, full_name, email, avatar_url)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    channelId: data.channel_id,
    author: parseProfile(data.author, data.author_id || user.id),
    parentMessageId: data.parent_message_id || undefined,
    body: data.body,
    attachments: data.attachments || [],
    isPinned: false,
    isEdited: false,
    createdAt: data.created_at,
    reactions: [],
  };
}

export async function toggleMessageReaction(messageId: string, emoji: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required.');

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id);
    return false; // Removed
  } else {
    await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });
    return true; // Added
  }
}

// ------------------------------------------------------------------------------
// Task Comments
// ------------------------------------------------------------------------------

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  if (!taskId || taskId.startsWith('task-')) {
    return sampleTaskComments[taskId] || [];
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        author:profiles(id, full_name, email, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return sampleTaskComments[taskId] || [];
    }

    return data.map((c: any) => ({
      id: c.id,
      taskId: c.task_id,
      author: parseProfile(c.author),
      parentCommentId: c.parent_comment_id || undefined,
      content: c.content,
      attachments: c.attachments || [],
      isEdited: Boolean(c.is_edited),
      createdAt: c.created_at,
    }));
  } catch {
    return sampleTaskComments[taskId] || [];
  }
}

export async function addTaskComment(input: {
  taskId: string;
  content: string;
  parentCommentId?: string;
}): Promise<TaskComment> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: input.taskId,
      author_id: user.id,
      parent_comment_id: input.parentCommentId || null,
      content: input.content.trim(),
    })
    .select(`
      *,
      author:profiles(id, full_name, email, avatar_url)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    taskId: data.task_id,
    author: parseProfile(data.author),
    parentCommentId: data.parent_comment_id || undefined,
    content: data.content,
    attachments: data.attachments || [],
    isEdited: false,
    createdAt: data.created_at,
  };
}

// ------------------------------------------------------------------------------
// Notifications & Team Invitations
// ------------------------------------------------------------------------------

export async function getNotifications(workspaceId?: string): Promise<AppNotification[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch notifications addressed to this user (both for the active workspace AND invitations from other workspaces)
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!actor_id(id, full_name, email, avatar_url),
      workspace:workspaces!workspace_id(id, name, slug)
    `)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.warn('Error fetching notifications:', error?.message);
    return sampleNotifications;
  }

  if (data.length === 0) {
    return [];
  }

  return data.map((n: any) => {
    const ws = n.workspace;
    return {
      id: n.id,
      workspaceId: n.workspace_id,
      workspaceName: ws?.name,
      workspaceSlug: ws?.slug,
      recipientId: n.recipient_id,
      actor: n.actor ? parseProfile(n.actor) : undefined,
      type: n.type,
      title: n.title,
      body: n.body,
      linkUrl: n.link_url || undefined,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    };
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function markAllNotificationsAsRead(workspaceId?: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  await query;
}

export async function sendWorkspaceInvitation(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member' | 'guest' = 'member'
): Promise<{
  success: boolean;
  token?: string;
  inviteUrl?: string;
  notifiedUser?: boolean;
  workspaceName?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Authentication required.');

  const cleanEmail = email.trim().toLowerCase();

  // 1. Try atomic RPC send_workspace_invitation
  const { data: rpcData, error: rpcError } = await supabase.rpc('send_workspace_invitation', {
    target_workspace_id: workspaceId,
    invitee_email: cleanEmail,
    invitee_role: role,
  });

  if (!rpcError && rpcData) {
    return rpcData;
  }

  // 2. Fallback if RPC not yet run in SQL Editor
  console.warn('RPC send_workspace_invitation fallback:', rpcError?.message);
  const token = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);

  const { error: invErr } = await supabase.from('workspace_invitations').insert({
    workspace_id: workspaceId,
    email: cleanEmail,
    role,
    token,
    invited_by: user.id,
    status: 'pending',
  });

  if (invErr) throw invErr;

  let notifiedUser = false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (profile) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .maybeSingle();
    const wsName = ws?.name || 'Workspace';

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    const inviterName = myProfile?.full_name || user.email?.split('@')[0] || 'Team Lead';

    await supabase.from('notifications').insert({
      workspace_id: workspaceId,
      recipient_id: profile.id,
      actor_id: user.id,
      type: 'system',
      title: `Team Invitation: ${wsName}`,
      body: `${inviterName} has invited you to join ${wsName} as a ${role}! Click below to accept the invitation and start collaborating.`,
      link_url: `/invite/${token}`,
    });
    notifiedUser = true;
  }

  return {
    success: true,
    token,
    inviteUrl: `/invite/${token}`,
    notifiedUser,
  };
}

export async function getWorkspaceInvitations(workspaceId: string): Promise<any[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Failed to load invitations:', error.message);
    return [];
  }
  return data || [];
}

export async function revokeWorkspaceInvitation(invitationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('workspace_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) throw error;
}

export async function acceptInvitationByToken(token: string): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('accept_workspace_invitation', {
    invitation_token: token,
  });

  if (error) throw error;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .ilike('link_url', `%${token}%`);
    }
  } catch (e) {
    // Non-critical
  }

  return data;
}
