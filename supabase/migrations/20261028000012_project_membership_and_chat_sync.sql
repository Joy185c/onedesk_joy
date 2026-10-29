-- ==============================================================================
-- Migration: 20261028000012_project_membership_and_chat_sync.sql
-- Description: Complete & Idempotent Production Repair
-- 1. Schema compatibility: joined_at, job_title, assigned_by
-- 2. Performance composite indexes
-- 3. Direct Projects RLS policies (resolves "new row violates row-level security")
-- 4. Auto-sync project members to project #general channel (TEXT roles, no enum cast)
-- 5. Strict Task Assignees RLS (assignee must belong to project)
-- 6. Project Members RLS policies with safe DROP POLICY IF EXISTS
-- 7. PostgREST schema cache reload
-- ==============================================================================

-- 1. Defensive Schema Columns
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.task_assignees ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id);

-- 2. Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_project_members_proj_user ON public.project_members(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_chan_user ON public.channel_members(channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ws_status ON public.tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_proj_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_chan_created ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_assignees_composite ON public.task_assignees(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_status ON public.workspace_members(workspace_id, status);

-- 3. Auto-repair workspace owners in workspace_members
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, job_title)
SELECT w.id, w.owner_id, 'owner', 'active', 'Founder & Owner'
FROM public.workspaces w
ON CONFLICT (workspace_id, user_id) DO UPDATE
SET role = 'owner', status = 'active';

-- 4. Projects RLS Policies Repair (DIRECT NON-RECURSIVE, NO POSTGREST RETURNING BLOCK)
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR lead_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR (visibility = 'public_in_workspace' AND public.is_workspace_member(workspace_id, auth.uid()))
    OR public.is_project_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND (w.owner_id = auth.uid() OR public.is_workspace_member(w.id, auth.uid())))
      OR public.is_workspace_member(workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR lead_id = auth.uid()
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

-- 5. Auto-sync Project Members into Project #general Channel (TEXT roles, no enum cast)
CREATE OR REPLACE FUNCTION public.trg_sync_project_member_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Find all public channels belonging to this project (e.g. #general)
    FOR v_channel_id IN
      SELECT id FROM public.channels
      WHERE project_id = NEW.project_id AND (type = 'public' OR slug = 'general')
    LOOP
      INSERT INTO public.channel_members (channel_id, user_id, role)
      VALUES (
        v_channel_id,
        NEW.user_id,
        CASE WHEN NEW.role IN ('owner', 'manager') THEN 'admin' ELSE 'member' END
      )
      ON CONFLICT (channel_id, user_id) DO UPDATE
      SET role = CASE WHEN NEW.role IN ('owner', 'manager') THEN 'admin' ELSE 'member' END;
    END LOOP;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Remove from channels belonging to this project
    DELETE FROM public.channel_members
    WHERE user_id = OLD.user_id
      AND channel_id IN (SELECT id FROM public.channels WHERE project_id = OLD.project_id);

    -- Unassign from tasks belonging to this project
    DELETE FROM public.task_assignees
    WHERE user_id = OLD.user_id
      AND task_id IN (SELECT id FROM public.tasks WHERE project_id = OLD.project_id);

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_project_member_channel_sync ON public.project_members;
CREATE TRIGGER trg_after_project_member_channel_sync
  AFTER INSERT OR DELETE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_project_member_channel();

-- Backfill channel_members for existing project members
INSERT INTO public.channel_members (channel_id, user_id, role)
SELECT c.id, pm.user_id, CASE WHEN pm.role IN ('owner', 'manager') THEN 'admin' ELSE 'member' END
FROM public.project_members pm
JOIN public.channels c ON c.project_id = pm.project_id
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- 6. Strict Task Assignees RLS Policy (Assignee MUST belong to the project)
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
      WHERE t.id = task_id
        AND public.can_view_project(t.project_id, auth.uid())
        AND (
          user_id = (SELECT owner_id FROM public.projects WHERE id = t.project_id)
          OR user_id = (SELECT lead_id FROM public.projects WHERE id = t.project_id)
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = t.project_id AND pm.user_id = task_assignees.user_id
          )
        )
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

-- 7. Project Members CRUD Policies
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
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.lead_id = auth.uid()))
  );

DROP POLICY IF EXISTS "project_members_update_policy" ON public.project_members;
CREATE POLICY "project_members_update_policy" ON public.project_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR p.lead_id = auth.uid()
          OR public.get_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
          OR (
            SELECT role FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
          ) IN ('owner', 'manager')
        )
    )
  );

DROP POLICY IF EXISTS "project_members_delete_policy" ON public.project_members;
CREATE POLICY "project_members_delete_policy" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR p.lead_id = auth.uid()
          OR public.get_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
          OR (
            SELECT role FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
          ) IN ('owner', 'manager')
        )
    )
  );

-- 8. Refresh PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
