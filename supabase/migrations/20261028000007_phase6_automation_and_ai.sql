-- ==============================================================================
-- ONEDESK DATABASE SCHEMA - PHASE 6: AUTOMATION ENGINE & AI AUDIT LOGS
-- ==============================================================================
-- Implements:
-- 1. Automation Rules (Event triggers, JSONB conditions, action dispatchers)
-- 2. Automation Runs (Durable execution history, status, duration, idempotency)
-- 3. Audit Logs (Immutable platform & AI action audit trail)
-- 4. Tenancy RLS policies & helper execution RPCs
-- ==============================================================================

-- 1. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'task_created', 'task_status_changed', 'review_requested', 'review_approved', 'task_completed'
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_type TEXT NOT NULL, -- 'send_notification', 'assign_user', 'change_status', 'create_subtask', 'post_channel_message'
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_count INT NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Automation Runs Table (Durable Queue & Execution History)
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'skipped', 'retrying'
  action_result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  execution_duration_ms INT DEFAULT 0,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Audit Logs Table (Permission-Aware Security & Action Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'task.assigned', 'task.status_changed', 'automation.executed', 'ai.plan_applied', 'member.invited', etc.
  resource_type TEXT NOT NULL, -- 'task', 'automation', 'project', 'ai_proposal', 'member', 'review'
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR FAST WORKSPACE FILTERING & REALTIME LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_automation_rules_ws ON public.automation_rules(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON public.automation_rules(workspace_id, trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule ON public.automation_runs(rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_ws ON public.automation_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_idempotency ON public.automation_runs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ws ON public.audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Automation Rules Policies
DROP POLICY IF EXISTS "automation_rules_select_policy" ON public.automation_rules;
CREATE POLICY "automation_rules_select_policy" ON public.automation_rules
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "automation_rules_insert_policy" ON public.automation_rules;
CREATE POLICY "automation_rules_insert_policy" ON public.automation_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "automation_rules_update_policy" ON public.automation_rules;
CREATE POLICY "automation_rules_update_policy" ON public.automation_rules
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "automation_rules_delete_policy" ON public.automation_rules;
CREATE POLICY "automation_rules_delete_policy" ON public.automation_rules
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 2. Automation Runs Policies
DROP POLICY IF EXISTS "automation_runs_select_policy" ON public.automation_runs;
CREATE POLICY "automation_runs_select_policy" ON public.automation_runs
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "automation_runs_insert_policy" ON public.automation_runs;
CREATE POLICY "automation_runs_insert_policy" ON public.automation_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- 3. Audit Logs Policies
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- ==============================================================================
-- SEED DEFAULT RECIPE TEMPLATES FOR EXISTING WORKSPACES
-- ==============================================================================
INSERT INTO public.automation_rules (
  workspace_id,
  name,
  description,
  is_active,
  trigger_type,
  trigger_config,
  conditions,
  action_type,
  action_config
)
SELECT
  w.id,
  'Notify Reviewer on Submission',
  'When a task is submitted for review, automatically notify team reviewers and alert the project channel.',
  true,
  'review_requested',
  '{}'::jsonb,
  '[]'::jsonb,
  'send_notification',
  '{"title": "Review Required", "body": "A deliverable is ready for sign-off."}'::jsonb
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.automation_rules ar 
  WHERE ar.workspace_id = w.id AND ar.name = 'Notify Reviewer on Submission'
);

INSERT INTO public.automation_rules (
  workspace_id,
  name,
  description,
  is_active,
  trigger_type,
  trigger_config,
  conditions,
  action_type,
  action_config
)
SELECT
  w.id,
  'Auto-Assign Urgent Deliverables',
  'When an urgent task is created without an assignee, dispatch an alert to workspace owners.',
  true,
  'task_created',
  '{"priority": "urgent"}'::jsonb,
  '[{"field": "priority", "operator": "equals", "value": "urgent"}]'::jsonb,
  'send_notification',
  '{"title": "Urgent Deliverable Flagged", "body": "Urgent deliverable requires immediate attention."}'::jsonb
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.automation_rules ar 
  WHERE ar.workspace_id = w.id AND ar.name = 'Auto-Assign Urgent Deliverables'
);

INSERT INTO public.automation_rules (
  workspace_id,
  name,
  description,
  is_active,
  trigger_type,
  trigger_config,
  conditions,
  action_type,
  action_config
)
SELECT
  w.id,
  'Celebrate Completed Milestones',
  'Send milestone completion notification when a task is moved to Completed.',
  false,
  'task_completed',
  '{}'::jsonb,
  '[]'::jsonb,
  'send_notification',
  '{"title": "Deliverable Completed", "body": "Deliverable was marked as complete."}'::jsonb
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.automation_rules ar 
  WHERE ar.workspace_id = w.id AND ar.name = 'Celebrate Completed Milestones'
);

