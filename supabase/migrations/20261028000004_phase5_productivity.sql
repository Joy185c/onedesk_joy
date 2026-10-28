-- ==============================================================================
-- ONEDESK DATABASE SCHEMA - PHASE 5: PRODUCTIVITY ENGINE
-- Milestone: Documents & Wiki, Goals & OKRs, Sprints, Time Tracking & Timesheets
-- Strict Tenancy & Project-Level RBAC Enforcement
-- ==============================================================================

-- 1. Status Enums for Productivity Engine
DO $$ BEGIN
  CREATE TYPE public.goal_status AS ENUM ('on_track', 'at_risk', 'off_track', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sprint_status AS ENUM ('planning', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Documents & Wiki Table (Workspace docs and project-specific docs)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_doc_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT NOT NULL DEFAULT '',
  icon TEXT DEFAULT '📄',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sprints Table
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  status public.sprint_status NOT NULL DEFAULT 'planning',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Goals Table (Workspace & Project OKRs)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.goal_status NOT NULL DEFAULT 'on_track',
  progress_percent INT NOT NULL DEFAULT 0,
  target_date DATE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Key Results Table (Under each Goal)
CREATE TABLE IF NOT EXISTS public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  initial_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_value NUMERIC(10,2) NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT '%',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Time Entries Table (Deliverable & sprint timesheets)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-SPEED PRODUCTIVITY QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_ws ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_proj ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_proj ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_ws ON public.goals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_key_results_goal ON public.key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Documents Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      project_id IS NULL
      OR public.can_view_project(project_id, auth.uid())
    )
  );

CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      project_id IS NULL
      OR public.can_view_project(project_id, auth.uid())
    )
  );

CREATE POLICY "documents_update_policy" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "documents_delete_policy" ON public.documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- ------------------------------------------------------------------------------
-- Sprints Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "sprints_select_policy" ON public.sprints
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id, auth.uid()));

CREATE POLICY "sprints_insert_policy" ON public.sprints
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_project(project_id, auth.uid())
    AND (
      public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "sprints_update_policy" ON public.sprints
  FOR UPDATE TO authenticated
  USING (public.can_view_project(project_id, auth.uid()));

-- ------------------------------------------------------------------------------
-- Goals & Key Results Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "goals_select_policy" ON public.goals
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      project_id IS NULL
      OR public.can_view_project(project_id, auth.uid())
    )
  );

CREATE POLICY "goals_insert_update_policy" ON public.goals
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "key_results_policy" ON public.key_results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND public.is_workspace_member(g.workspace_id, auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- Time Entries Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "time_entries_select_policy" ON public.time_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR public.can_view_project(project_id, auth.uid())
  );

CREATE POLICY "time_entries_insert_policy" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_view_project(project_id, auth.uid())
  );

CREATE POLICY "time_entries_delete_policy" ON public.time_entries
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- ==============================================================================
-- BACKFILL SAMPLE PRODUCTIVITY ENTITIES FOR EXISTING WORKSPACES
-- ==============================================================================

-- 1. Initial Documentation Wiki Page
INSERT INTO public.documents (workspace_id, project_id, title, icon, content)
SELECT w.id, NULL, 'OneDesk Architecture & Engineering Playbook', '📘',
'# OneDesk Architecture & Engineering Playbook

Welcome to the central engineering and product wiki. This documentation space outlines technical standards, design tokens, and delivery conventions across projects.

## Visual Design Reference
- Obsidian Forest: `#082F1B`
- Electric Lime: `#20E34A`
- Canvas Background: `#F0F1F3`
- Card Corners: `rounded-2xl` (16px)

## Code Quality Standards
1. Strict TypeScript mode with zero `any` types where possible.
2. Every database query must respect Supabase Row Level Security.
3. Keep project deliverables completely isolated across workspaces.
'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d WHERE d.workspace_id = w.id
)
ON CONFLICT DO NOTHING;

-- 2. Initial Deliverable Goal / Milestone
INSERT INTO public.goals (workspace_id, project_id, title, description, status, progress_percent, target_date)
SELECT w.id, NULL, 'Q4 SaaS Platform Release Readiness', 'Complete end-to-end multi-tenant delivery engine, collaboration hub, and productivity timesheets.', 'on_track'::public.goal_status, 65, CURRENT_DATE + INTERVAL '30 days'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.goals g WHERE g.workspace_id = w.id
)
ON CONFLICT DO NOTHING;

