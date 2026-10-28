-- ==============================================================================
-- OneDesk Phase 3: Core Project & Task Engine Migration
-- Strictly NO CRM, billing, invoicing, payments, or budget tracking.
-- Multi-tenant Row Level Security enforced via workspace and project memberships.
-- ==============================================================================

-- 1. Space Types & Table
CREATE TABLE IF NOT EXISTS public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT 'FolderOpen',
  color TEXT DEFAULT '#20E34A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- 2. Project Enums & Table
DO $$ BEGIN
  CREATE TYPE public.project_visibility AS ENUM ('public_in_workspace', 'private');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_health AS ENUM ('on_track', 'at_risk', 'off_track');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL, -- e.g. "FBQ", "MOB", uppercase alphanumeric
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visibility public.project_visibility NOT NULL DEFAULT 'public_in_workspace',
  status public.project_status NOT NULL DEFAULT 'active',
  health public.project_health NOT NULL DEFAULT 'on_track',
  target_date DATE,
  start_date DATE,
  task_sequence INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, key)
);

-- 3. Project Memberships & Roles
DO $$ BEGIN
  CREATE TYPE public.project_role AS ENUM ('owner', 'manager', 'contributor', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.project_role NOT NULL DEFAULT 'contributor',
  job_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 4. Tasks & Task Engine
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'ready_for_review', 'completed', 'blocked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('urgent', 'high', 'medium', 'low', 'none');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  task_number INT NOT NULL, -- sequential per project
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  estimated_hours NUMERIC(6,2),
  logged_hours NUMERIC(6,2) DEFAULT 0,
  story_points INT,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  review_required BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Task Assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- 6. Task Subtasks & Checklists
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Review Requests & Decisions (Task Review Gate)
DO $$ BEGIN
  CREATE TYPE public.review_state AS ENUM ('pending', 'approved', 'changes_requested', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewer_id UUID REFERENCES public.profiles(id),
  state public.review_state NOT NULL DEFAULT 'pending',
  submission_note TEXT,
  decision_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_spaces_ws ON public.spaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_ws ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_key ON public.projects(workspace_id, key);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ws ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_task ON public.review_requests(task_id);

-- ==============================================================================
-- SECURITY HELPER FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- Check if user is a member of the project
CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id
      AND user_id = check_user_id
  );
$$;

-- Check if project is visible to user (public in workspace or user is a project member, or workspace owner/admin)
CREATE OR REPLACE FUNCTION public.can_view_project(p_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_ws_id UUID;
  v_visibility public.project_visibility;
  v_ws_role public.workspace_role;
BEGIN
  SELECT workspace_id, visibility INTO v_ws_id, v_visibility
  FROM public.projects
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Must be at least a member of the workspace
  IF NOT public.is_workspace_member(v_ws_id, check_user_id) THEN
    RETURN FALSE;
  END IF;

  -- Workspace Owner or Admin can view all projects in their workspace
  v_ws_role := public.get_workspace_role(v_ws_id, check_user_id);
  IF v_ws_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;

  -- If public in workspace, any workspace member can view
  IF v_visibility = 'public_in_workspace' THEN
    RETURN TRUE;
  END IF;

  -- Otherwise, user must be an assigned project member
  RETURN public.is_project_member(p_id, check_user_id);
END;
$$;

-- Sequential Task Number Generator Trigger
CREATE OR REPLACE FUNCTION public.generate_task_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seq INT;
BEGIN
  -- Increment project task_sequence atomically
  UPDATE public.projects
  SET task_sequence = task_sequence + 1
  WHERE id = NEW.project_id
  RETURNING task_sequence INTO v_seq;

  NEW.task_number := v_seq;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_task_number ON public.tasks;
CREATE TRIGGER trg_generate_task_number
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.task_number IS NULL OR NEW.task_number = 0)
  EXECUTE FUNCTION public.generate_task_number();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Spaces Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "spaces_select_policy" ON public.spaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "spaces_insert_policy" ON public.spaces
  FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "spaces_update_policy" ON public.spaces
  FOR UPDATE TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "spaces_delete_policy" ON public.spaces
  FOR DELETE TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

-- ------------------------------------------------------------------------------
-- Projects Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_view_project(id, auth.uid()));

CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND owner_id = auth.uid()
  );

CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR owner_id = auth.uid()
    OR (
      SELECT role FROM public.project_members
      WHERE project_id = projects.id AND user_id = auth.uid()
    ) IN ('owner', 'manager')
  );

CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE TO authenticated
  USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR owner_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- Project Members Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "project_members_select_policy" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "project_members_insert_policy" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Workspace owner/admin, or project creator/manager
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR public.get_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
          OR (
            SELECT role FROM public.project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
          ) IN ('owner', 'manager')
        )
    )
  );

CREATE POLICY "project_members_delete_policy" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() -- self leave
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.owner_id = auth.uid()
          OR public.get_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
        )
    )
  );

-- ------------------------------------------------------------------------------
-- Tasks Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_project(project_id, auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.can_view_project(project_id, auth.uid()))
  WITH CHECK (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- ------------------------------------------------------------------------------
-- Task Assignees Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "task_assignees_select_policy" ON public.task_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_assignees_insert_policy" ON public.task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_assignees_delete_policy" ON public.task_assignees
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- Task Subtasks Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "task_subtasks_select_policy" ON public.task_subtasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_subtasks_insert_policy" ON public.task_subtasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_subtasks_update_policy" ON public.task_subtasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "task_subtasks_delete_policy" ON public.task_subtasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- Review Requests Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "review_requests_select_policy" ON public.review_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "review_requests_insert_policy" ON public.review_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    submitter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.can_view_project(t.project_id, auth.uid())
    )
  );

CREATE POLICY "review_requests_update_policy" ON public.review_requests
  FOR UPDATE TO authenticated
  USING (
    -- Submitter can cancel; reviewer or project manager/owner can approve or reject
    submitter_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_id AND (
        p.owner_id = auth.uid()
        OR public.get_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
      )
    )
  );

