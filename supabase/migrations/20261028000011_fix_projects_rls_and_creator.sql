-- ==============================================================================
-- Migration: 20261028000011_fix_projects_rls_and_creator.sql
-- Description: Complete fix for Projects Row-Level Security (RLS) policies.
-- 1. Eliminates STABLE function subqueries during INSERT ... RETURNING *
--    which caused "new row violates row-level security policy for table 'projects'"
-- 2. Directly grants SELECT permission to project owner, lead, workspace owner & admins
-- 3. Ensures private projects can be immediately read by creator during creation
-- 4. Automatically adds creator to project_members via AFTER INSERT trigger
-- 5. Auto-repairs and backfills workspace_members for all workspaces
-- 6. Schema cache repair: ensure assigned_by exists on task_assignees
-- ==============================================================================

-- 0. Schema cache repair: ensure assigned_by exists on task_assignees
ALTER TABLE public.task_assignees ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id);

-- 1. Upgrade is_workspace_member helper (SECURITY DEFINER with search_path = public)
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

-- 2. Upgrade get_workspace_role helper
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
  WHERE workspace_id = ws_id AND user_id = check_user_id AND status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- 3. Auto-membership trigger on workspaces
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

-- Backfill any existing workspaces missing from workspace_members
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, job_title)
SELECT w.id, w.owner_id, 'owner', 'active', 'Founder & Owner'
FROM public.workspaces w
ON CONFLICT (workspace_id, user_id) DO UPDATE
SET role = 'owner', status = 'active';

-- 4. Projects RLS Policies Repair (DIRECT NON-RECURSIVE EXPRESSIONS)
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

-- 5. Auto-membership trigger on projects (Adds creator & lead immediately in DB)
CREATE OR REPLACE FUNCTION public.trg_project_auto_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert creator as owner
  INSERT INTO public.project_members (project_id, user_id, role, job_title)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'Project Lead')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- If lead is different from owner, add lead as manager
  IF NEW.lead_id IS NOT NULL AND NEW.lead_id != NEW.owner_id THEN
    INSERT INTO public.project_members (project_id, user_id, role, job_title)
    VALUES (NEW.id, NEW.lead_id, 'manager', 'Project Lead')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_project_insert_member ON public.projects;
CREATE TRIGGER trg_after_project_insert_member
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_auto_member();

-- 6. Project Members RLS Policies Repair
DROP POLICY IF EXISTS "project_members_select_policy" ON public.project_members;
CREATE POLICY "project_members_select_policy" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR p.lead_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
          OR public.get_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
          OR (p.visibility = 'public_in_workspace' AND public.is_workspace_member(p.workspace_id, auth.uid()))
          OR public.is_project_member(p.id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "project_members_insert_policy" ON public.project_members;
CREATE POLICY "project_members_insert_policy" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.lead_id = auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
    OR public.get_workspace_role((SELECT workspace_id FROM public.projects WHERE id = project_id), auth.uid()) IN ('owner', 'admin')
  );

-- 7. Upgrade can_view_project for dependent tables (tasks, documents, channels, etc.)
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
        OR p.lead_id = check_user_id
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = check_user_id)
        OR public.get_workspace_role(p.workspace_id, check_user_id) IN ('owner', 'admin')
        OR (p.visibility = 'public_in_workspace' AND public.is_workspace_member(p.workspace_id, check_user_id))
        OR public.is_project_member(p.id, check_user_id)
      )
  );
$$;
