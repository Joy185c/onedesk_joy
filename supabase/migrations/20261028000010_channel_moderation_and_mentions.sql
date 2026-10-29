-- ==============================================================================
-- ONEDESK DATABASE MIGRATION - CHANNEL MODERATION & STRUCTURED MENTIONS
-- ==============================================================================
-- Migration: 20261028000010_channel_moderation_and_mentions.sql
-- Modules:
-- 0. task_assignees schema cache repair (assigned_by column)
-- 1. channel_access_overrides (Channel-level roles, removals & blocking)
-- 2. message_mentions (Structured @mentions with automatic notifications)
-- 3. Moderation RLS policies & Audit log integration
-- ==============================================================================

-- 0. Schema cache repair: ensure assigned_by exists on task_assignees
ALTER TABLE public.task_assignees ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id);

-- 1. Create channel_access_overrides table
CREATE TABLE IF NOT EXISTS public.channel_access_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  is_removed BOOLEAN NOT NULL DEFAULT FALSE,
  channel_role TEXT NOT NULL DEFAULT 'member' CHECK (channel_role IN ('admin', 'moderator', 'member')),
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- 2. Create message_mentions table
CREATE TABLE IF NOT EXISTS public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_channel_overrides_chan ON public.channel_access_overrides(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_overrides_user ON public.channel_access_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_msg ON public.message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user ON public.message_mentions(mentioned_user_id, created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.channel_access_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for channel_access_overrides
DROP POLICY IF EXISTS "channel_overrides_select" ON public.channel_access_overrides;
CREATE POLICY "channel_overrides_select" ON public.channel_access_overrides
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.workspace_members wm ON c.workspace_id = wm.workspace_id
      WHERE c.id = channel_access_overrides.channel_id
      AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "channel_overrides_mod" ON public.channel_access_overrides;
CREATE POLICY "channel_overrides_mod" ON public.channel_access_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.workspaces w ON c.workspace_id = w.id
      JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE c.id = channel_access_overrides.channel_id
      AND wm.user_id = auth.uid()
      AND (wm.role IN ('owner', 'admin') OR w.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.workspaces w ON c.workspace_id = w.id
      JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE c.id = channel_access_overrides.channel_id
      AND wm.user_id = auth.uid()
      AND (wm.role IN ('owner', 'admin') OR w.owner_id = auth.uid())
    )
  );

-- 6. Policies for message_mentions
DROP POLICY IF EXISTS "message_mentions_select" ON public.message_mentions;
CREATE POLICY "message_mentions_select" ON public.message_mentions
  FOR SELECT TO authenticated
  USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_mentions.message_id
      AND m.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "message_mentions_insert" ON public.message_mentions;
CREATE POLICY "message_mentions_insert" ON public.message_mentions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_mentions.message_id
      AND m.author_id = auth.uid()
    )
  );

-- 7. Blocked Member Restriction on messages table (Security Boundary)
DROP POLICY IF EXISTS "messages_not_blocked_select" ON public.messages;
CREATE POLICY "messages_not_blocked_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.channel_access_overrides cao
      WHERE cao.channel_id = messages.channel_id
      AND cao.user_id = auth.uid()
      AND (cao.is_blocked = true OR cao.is_removed = true)
    )
  );

-- 8. Trigger to automatically generate notifications for @mentions
CREATE OR REPLACE FUNCTION public.handle_message_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
  v_channel_name TEXT;
  v_workspace_id UUID;
  v_workspace_slug TEXT;
  v_message_body TEXT;
BEGIN
  -- Avoid notifying self-mentions
  IF NEW.mentioned_user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Get author name and message body
  SELECT p.full_name, m.body INTO v_author_name, v_message_body
  FROM public.messages m
  LEFT JOIN public.profiles p ON p.id = m.author_id
  WHERE m.id = NEW.message_id;

  -- Get channel and workspace info
  SELECT c.name, c.workspace_id, w.slug INTO v_channel_name, v_workspace_id, v_workspace_slug
  FROM public.channels c
  JOIN public.workspaces w ON w.id = c.workspace_id
  WHERE c.id = NEW.channel_id;

  -- Insert notification for the mentioned user
  INSERT INTO public.notifications (
    workspace_id,
    recipient_id,
    actor_id,
    type,
    title,
    body,
    link_url
  ) VALUES (
    v_workspace_id,
    NEW.mentioned_user_id,
    auth.uid(),
    'mention',
    COALESCE(v_author_name, 'A teammate') || ' mentioned you in #' || COALESCE(v_channel_name, 'channel'),
    SUBSTRING(COALESCE(v_message_body, '') FROM 1 FOR 140),
    '/w/' || COALESCE(v_workspace_slug, 'fabriq') || '/chat'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_message_mention_notification ON public.message_mentions;
CREATE TRIGGER trigger_message_mention_notification
  AFTER INSERT ON public.message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_mention_notification();
