-- ==============================================================================
-- Quick Fix for Projects Row Level Security (RLS)
-- Prevents recursive policy evaluation and ensures workspace owners can insert projects
-- ==============================================================================

DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;

-- 1. Non-recursive SELECT policy for projects
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR (visibility = 'public_in_workspace' AND public.is_workspace_member(workspace_id, auth.uid()))
    OR public.is_project_member(id, auth.uid())
  );

-- 2. Clean INSERT policy for projects
CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
      OR public.is_workspace_member(workspace_id, auth.uid())
    )
  );

-- 3. UPDATE policy for projects
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

-- 4. DELETE policy for projects
CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- 5. Set search_path and prevent recursion on can_view_project
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

