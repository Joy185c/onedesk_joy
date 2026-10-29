-- ==============================================================================
-- Fix Invitation Notifications & Retroactive Backfill for Pending Invites
-- Migration: 20261028000006_fix_invitation_notifications.sql
-- ==============================================================================

-- 1. Upgrade send_workspace_invitation to use native gen_random_uuid and check auth.users
CREATE OR REPLACE FUNCTION public.send_workspace_invitation(
  target_workspace_id UUID,
  invitee_email TEXT,
  invitee_role public.workspace_role DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inviter_id UUID := auth.uid();
  v_inviter_name TEXT;
  v_ws_name TEXT;
  v_ws_slug TEXT;
  v_invite_token TEXT;
  v_target_user_id UUID;
  v_invite_id UUID;
BEGIN
  -- 1. Authorization check: caller must be owner or admin of target workspace
  IF NOT (
    public.get_workspace_role(target_workspace_id, v_inviter_id) IN ('owner', 'admin')
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = target_workspace_id AND owner_id = v_inviter_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only workspace owners and admins can send invitations';
  END IF;

  -- 2. Fetch inviter info & workspace details
  SELECT COALESCE(full_name, email) INTO v_inviter_name FROM public.profiles WHERE id = v_inviter_id;
  SELECT name, slug INTO v_ws_name, v_ws_slug FROM public.workspaces WHERE id = target_workspace_id;

  -- 3. Generate unique invitation token (zero external extensions required)
  v_invite_token := 'tok_' || replace(gen_random_uuid()::text, '-', '');

  -- 4. Insert or update workspace_invitations
  INSERT INTO public.workspace_invitations (
    workspace_id,
    email,
    role,
    token,
    invited_by,
    status,
    expires_at
  ) VALUES (
    target_workspace_id,
    LOWER(TRIM(invitee_email)),
    invitee_role,
    v_invite_token,
    v_inviter_id,
    'pending',
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invite_id;

  -- 5. Look up if invitee already has an account in profiles or auth.users
  SELECT id INTO v_target_user_id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(TRIM(invitee_email))
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(invitee_email))
    LIMIT 1;

    -- Backfill public.profiles if missing
    IF v_target_user_id IS NOT NULL THEN
      INSERT INTO public.profiles (id, email, full_name)
      SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
      FROM auth.users u
      WHERE u.id = v_target_user_id
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;

  -- 6. If target user has an account, dispatch instant In-App Notification with join link & greeting
  IF v_target_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      workspace_id,
      recipient_id,
      actor_id,
      type,
      title,
      body,
      link_url
    ) VALUES (
      target_workspace_id,
      v_target_user_id,
      v_inviter_id,
      'system',
      'Team Invitation: ' || v_ws_name,
      COALESCE(v_inviter_name, 'A team lead') || ' invited you to join ' || v_ws_name || ' as ' || initcap(invitee_role::text) || '. Click below to accept the invitation and start collaborating!',
      '/invite/' || v_invite_token
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invite_id,
    'token', v_invite_token,
    'invite_url', '/invite/' || v_invite_token,
    'notified_user', (v_target_user_id IS NOT NULL),
    'workspace_name', v_ws_name
  );
END;
$$;

-- 2. Ensure notifications RLS allows workspace owners/members
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- 3. Ensure profiles are backfilled for any registered auth.users
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 4. RETROACTIVELY DELIVER IN-APP NOTIFICATION FOR EXISTING PENDING INVITATIONS (e.g. joy224564@gmail.com)
INSERT INTO public.notifications (
  workspace_id,
  recipient_id,
  actor_id,
  type,
  title,
  body,
  link_url
)
SELECT 
  inv.workspace_id,
  u.id,
  inv.invited_by,
  'system'::public.notification_type,
  'Team Invitation: ' || w.name,
  COALESCE(p.full_name, 'A team lead') || ' invited you to join ' || w.name || ' as ' || initcap(inv.role::text) || '. Click below to accept the invitation and start collaborating!',
  '/invite/' || inv.token
FROM public.workspace_invitations inv
JOIN public.workspaces w ON w.id = inv.workspace_id
LEFT JOIN public.profiles p ON p.id = inv.invited_by
JOIN auth.users u ON LOWER(u.email) = LOWER(inv.email)
WHERE inv.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.recipient_id = u.id AND n.link_url LIKE '%' || inv.token
  );

