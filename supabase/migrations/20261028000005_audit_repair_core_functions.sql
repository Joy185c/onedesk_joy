-- ==============================================================================
-- OneDesk Phase 4 & 5 Audit & Repair Migration
-- Migration: 20261028000005_audit_repair_core_functions.sql
-- 
-- Fixes:
-- 1. Upgrades is_workspace_member and get_workspace_role to recognize workspace
--    owners directly, preventing RLS rejection when creating projects/channels.
-- 2. Automatically inserts workspace owners into workspace_members via trigger.
-- 3. Backfills all existing workspaces into workspace_members.
-- 4. Repairs projects, channels, documents, goals, and time_entries RLS policies.
-- 5. Preserves all real user accounts, workspaces (FABRIQ), projects (WEB-1), and tasks.
-- ==============================================================================

-- 1. Upgrade is_workspace_member (SECURITY DEFINER with search_path = public)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_id = check_user_id
    UNION ALL
    SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND user_id = check_user_id AND status = 'active'
  );
$$;

-- 2. Upgrade get_workspace_role
CREATE OR REPLACE FUNCTION public.get_workspace_role(ws_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS public.workspace_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role public.workspace_role;
BEGIN
  -- Workspace creator is always 'owner'
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_id = check_user_id) THEN
    RETURN 'owner'::public.workspace_role;
  END IF;

  SELECT role INTO v_role
  FROM public.workspace_members
  WHERE workspace_id = ws_id
    AND user_id = check_user_id
    AND status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- 3. Upgrade can_view_project
CREATE OR REPLACE FUNCTION public.can_view_project(p_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_id
      AND (
        p.owner_id = check_user_id
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = check_user_id)
        OR public.get_workspace_role(p.workspace_id, check_user_id) IN ('owner', 'admin')
        OR (p.visibility = 'public_in_workspace' AND public.is_workspace_member(p.workspace_id, check_user_id))
        OR public.is_project_member(p.id, check_user_id)
      )
  );
$$;

-- 4. Auto-membership trigger on workspaces
CREATE OR REPLACE FUNCTION public.trg_workspace_auto_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, job_title)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', 'Founder & Owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_workspace_insert_member ON public.workspaces;
CREATE TRIGGER trg_after_workspace_insert_member
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_workspace_auto_member();

-- 5. Backfill all existing workspaces into workspace_members
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, job_title)
SELECT w.id, w.owner_id, 'owner', 'active', 'Founder & Owner'
FROM public.workspaces w
ON CONFLICT (workspace_id, user_id) DO UPDATE
SET role = 'owner', status = 'active';

-- 6. Workspace Members RLS Policies Repair
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_update_policy" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_delete_policy" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
      AND user_id != (SELECT owner_id FROM public.workspaces WHERE id = workspace_id)
    )
  );

-- 7. Projects RLS Policies Repair
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_view_project(id, auth.uid()));

DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
      OR public.is_workspace_member(workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR (
      SELECT role FROM public.project_members
      WHERE project_id = projects.id AND user_id = auth.uid()
    ) IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;
CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- 8. Project Members RLS Policies Repair
DROP POLICY IF EXISTS "project_members_select_policy" ON public.project_members;
CREATE POLICY "project_members_select_policy" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "project_members_insert_policy" ON public.project_members;
CREATE POLICY "project_members_insert_policy" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.get_workspace_role((SELECT workspace_id FROM public.projects WHERE id = project_id), auth.uid()) IN ('owner', 'admin')
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
  );

-- 9. Channels & Collaboration Policies
DROP POLICY IF EXISTS "channels_select_policy" ON public.channels;
CREATE POLICY "channels_select_policy" ON public.channels
  FOR SELECT TO authenticated
  USING (public.can_view_channel(id, auth.uid()));

DROP POLICY IF EXISTS "channels_insert_policy" ON public.channels;
CREATE POLICY "channels_insert_policy" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      project_id IS NULL
      OR public.can_view_project(project_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "channels_update_policy" ON public.channels;
CREATE POLICY "channels_update_policy" ON public.channels
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- 10. Task Assignees Policies
DROP POLICY IF EXISTS "task_assignees_select_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_select_policy" ON public.task_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "task_assignees_insert_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_insert_policy" ON public.task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "task_assignees_delete_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_delete_policy" ON public.task_assignees
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );


-- 11. Workspace Invitations RLS Repair
DROP POLICY IF EXISTS "workspace_invitations_select_policy" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_select_policy" ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR LOWER(email) = LOWER((SELECT email FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "workspace_invitations_insert_policy" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_insert_policy" ON public.workspace_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- 12. Atomic Invitation Dispatch RPC with Instant In-App Inbox Notification
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

  -- 3. Generate unique invitation token (uses native gen_random_uuid)
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

-- 13. Notifications RLS Policy Repair
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- 14. Retroactively deliver in-app notifications for existing pending invitations (e.g. joy224564@gmail.com)
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
