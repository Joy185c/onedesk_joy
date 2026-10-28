-- ==============================================================================
-- ONEDESK DATABASE SCHEMA - PHASE 4: REALTIME COLLABORATION & NOTIFICATIONS
-- Milestone: Channels, DMs, Messages, Reactions, Task Comments & Notifications
-- Strict Tenancy & Project-Level RBAC Enforcement
-- ==============================================================================

-- 1. Channel Types & Visibility Enums
DO $$ BEGIN
  CREATE TYPE public.channel_type AS ENUM ('public', 'private', 'dm');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('mention', 'assigned', 'review_requested', 'review_decided', 'comment', 'system');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Channels Table (Workspace-level channels, Project channels, and DMs)
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type public.channel_type NOT NULL DEFAULT 'public',
  topic TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Channel Memberships Table (For private channels, project channels, and DMs)
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Message Reactions Table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- 6. Message Reads / Unread Tracker Table
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- 7. Task Comments Table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-VELOCITY CHAT & REALTIME LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON public.channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_project ON public.channels(project_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_chan ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- ==============================================================================
-- SECURITY HELPER FUNCTIONS
-- ==============================================================================

-- Check if user can view a channel
CREATE OR REPLACE FUNCTION public.can_view_channel(c_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_ws_id UUID;
  v_proj_id UUID;
  v_type public.channel_type;
  v_ws_role public.workspace_role;
BEGIN
  SELECT workspace_id, project_id, type INTO v_ws_id, v_proj_id, v_type
  FROM public.channels
  WHERE id = c_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 1. Must belong to the workspace
  IF NOT public.is_workspace_member(v_ws_id, check_user_id) THEN
    RETURN FALSE;
  END IF;

  -- 2. Direct Messages and Private Channels strictly require explicit membership
  IF v_type IN ('private', 'dm') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_id = c_id AND user_id = check_user_id
    );
  END IF;

  -- 3. If attached to a project, user must be able to view the project
  IF v_proj_id IS NOT NULL THEN
    RETURN public.can_view_project(v_proj_id, check_user_id);
  END IF;

  -- 4. Public workspace channel
  RETURN TRUE;
END;
$$;

-- Auto-provision #general channel upon Project Creation
CREATE OR REPLACE FUNCTION public.trg_project_auto_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chan_id UUID;
BEGIN
  -- Create project default #general channel
  INSERT INTO public.channels (
    workspace_id,
    project_id,
    name,
    description,
    type,
    created_by
  ) VALUES (
    NEW.workspace_id,
    NEW.id,
    'general',
    'General discussion for project ' || NEW.name,
    'public',
    NEW.owner_id
  )
  RETURNING id INTO v_chan_id;

  -- Add project owner to channel members
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (v_chan_id, NEW.owner_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_project_insert_channel ON public.projects;
CREATE TRIGGER trg_after_project_insert_channel
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_auto_channel();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Channels RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "channels_select_policy" ON public.channels
  FOR SELECT TO authenticated
  USING (public.can_view_channel(id, auth.uid()));

CREATE POLICY "channels_insert_policy" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      project_id IS NULL 
      OR public.can_view_project(project_id, auth.uid())
    )
  );

CREATE POLICY "channels_update_policy" ON public.channels
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- ------------------------------------------------------------------------------
-- Channel Members RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "channel_members_select_policy" ON public.channel_members
  FOR SELECT TO authenticated
  USING (public.can_view_channel(channel_id, auth.uid()));

CREATE POLICY "channel_members_insert_policy" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_channel(channel_id, auth.uid())
  );

CREATE POLICY "channel_members_delete_policy" ON public.channel_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
        AND (
          c.created_by = auth.uid()
          OR public.get_workspace_role(c.workspace_id, auth.uid()) IN ('owner', 'admin')
        )
    )
  );

-- ------------------------------------------------------------------------------
-- Messages RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT TO authenticated
  USING (public.can_view_channel(channel_id, auth.uid()));

CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_channel(channel_id, auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "messages_update_policy" ON public.messages
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "messages_delete_policy" ON public.messages
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id
        AND public.get_workspace_role(c.workspace_id, auth.uid()) IN ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- Message Reactions RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "reactions_select_policy" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND public.can_view_channel(m.channel_id, auth.uid())
    )
  );

CREATE POLICY "reactions_insert_policy" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND public.can_view_channel(m.channel_id, auth.uid())
    )
  );

CREATE POLICY "reactions_delete_policy" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Message Reads RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "reads_select_policy" ON public.message_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reads_insert_update_policy" ON public.message_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Task Comments RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "task_comments_select_policy" ON public.task_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_comments_insert_policy" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_comments_delete_policy" ON public.task_comments
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.get_workspace_role(t.workspace_id, auth.uid()) IN ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- Notifications RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- ==============================================================================
-- BACKFILL DEFAULT CHANNELS FOR EXISTING WORKSPACES AND PROJECTS
-- ==============================================================================

-- 1. Workspace default #announcements
INSERT INTO public.channels (workspace_id, project_id, name, description, type, created_by)
SELECT w.id, NULL, 'announcements', 'Workspace-wide announcements and updates', 'public'::public.channel_type, w.owner_id
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c WHERE c.workspace_id = w.id AND c.project_id IS NULL AND c.name = 'announcements'
)
ON CONFLICT DO NOTHING;

-- 2. Workspace default #general
INSERT INTO public.channels (workspace_id, project_id, name, description, type, created_by)
SELECT w.id, NULL, 'general', 'General workspace watercooler discussion', 'public'::public.channel_type, w.owner_id
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c WHERE c.workspace_id = w.id AND c.project_id IS NULL AND c.name = 'general'
)
ON CONFLICT DO NOTHING;

-- 3. Project default #general for each existing project
INSERT INTO public.channels (workspace_id, project_id, name, description, type, created_by)
SELECT p.workspace_id, p.id, 'general', 'General discussion for project ' || p.name, 'public'::public.channel_type, p.owner_id
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.channels c WHERE c.project_id = p.id AND c.name = 'general'
)
ON CONFLICT DO NOTHING;

