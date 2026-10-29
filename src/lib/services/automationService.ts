import { createClient } from '@/lib/supabase/client';
import {
  AutomationRule,
  AutomationRun,
  AuditLog,
  AutomationTriggerType,
  AutomationActionType,
  AutomationCondition,
} from '@/lib/types';

// Loop prevention call stack tracker
const executionRecursionDepth = new Map<string, number>();
const MAX_RECURSION_DEPTH = 3;

export const PRESET_RECIPES: {
  name: string;
  description: string;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, any>;
  conditions: AutomationCondition[];
  actionType: AutomationActionType;
  actionConfig: Record<string, any>;
}[] = [
  {
    name: 'Review Gatekeeper',
    description: 'When a deliverable is submitted for review, automatically notify team reviewers and dispatch an inbox item.',
    triggerType: 'review_requested',
    triggerConfig: {},
    conditions: [],
    actionType: 'send_notification',
    actionConfig: {
      title: 'Deliverable Review Required',
      body: 'A deliverable has been moved to Ready for Review and awaits sign-off.',
    },
  },
  {
    name: 'Urgent Task Escalation',
    description: 'When a deliverable is marked with Urgent priority, immediately alert workspace leads.',
    triggerType: 'task_created',
    triggerConfig: { priority: 'urgent' },
    conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }],
    actionType: 'send_notification',
    actionConfig: {
      title: 'Urgent Deliverable Flagged',
      body: 'An urgent deliverable was created. Immediate sprint scheduling required.',
    },
  },
  {
    name: 'Auto-QA Subtask Generator',
    description: 'When a new deliverable is created, automatically generate standard QA and documentation subtasks.',
    triggerType: 'task_created',
    triggerConfig: {},
    conditions: [],
    actionType: 'create_subtask',
    actionConfig: {
      title: 'Run QA regression checklist & verify acceptance criteria',
    },
  },
  {
    name: 'Milestone Completion Broadcast',
    description: 'When a deliverable is completed, post an achievement update to the project channel.',
    triggerType: 'task_completed',
    triggerConfig: {},
    conditions: [],
    actionType: 'send_notification',
    actionConfig: {
      title: 'Deliverable Completed',
      body: 'Work has been approved and successfully marked as completed.',
    },
  },
];

// Fallback sample rules for mock or offline workspaces
export const sampleAutomationRules: AutomationRule[] = [
  {
    id: 'rule-1',
    workspaceId: 'ws-demo',
    name: 'Notify Reviewer on Submission',
    description: 'When a task is submitted for review, automatically notify team reviewers and alert the project channel.',
    isActive: true,
    triggerType: 'review_requested',
    triggerConfig: {},
    conditions: [],
    actionType: 'send_notification',
    actionConfig: {
      title: 'Review Required',
      body: 'A deliverable is ready for sign-off.',
    },
    executionCount: 14,
    lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'rule-2',
    workspaceId: 'ws-demo',
    name: 'Auto-Assign Urgent Deliverables',
    description: 'When an urgent task is created without an assignee, dispatch an alert to workspace owners.',
    isActive: true,
    triggerType: 'task_created',
    triggerConfig: { priority: 'urgent' },
    conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }],
    actionType: 'send_notification',
    actionConfig: {
      title: 'Urgent Deliverable Flagged',
      body: 'Urgent deliverable requires immediate attention.',
    },
    executionCount: 5,
    lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'rule-3',
    workspaceId: 'ws-demo',
    name: 'Celebrate Completed Milestones',
    description: 'Send milestone completion notification when a task is moved to Completed.',
    isActive: false,
    triggerType: 'task_completed',
    triggerConfig: {},
    conditions: [],
    actionType: 'send_notification',
    actionConfig: {
      title: 'Deliverable Completed',
      body: 'Deliverable was marked as complete.',
    },
    executionCount: 22,
    lastTriggeredAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const sampleAutomationRuns: AutomationRun[] = [
  {
    id: 'run-1',
    ruleId: 'rule-1',
    ruleName: 'Notify Reviewer on Submission',
    workspaceId: 'ws-demo',
    triggerEvent: 'review_requested',
    triggerPayload: { taskId: 'task-101', taskTitle: 'Implement Interactive Map Search' },
    status: 'success',
    actionResult: { deliveredNotifications: 1 },
    executionDurationMs: 42,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'run-2',
    ruleId: 'rule-2',
    ruleName: 'Auto-Assign Urgent Deliverables',
    workspaceId: 'ws-demo',
    triggerEvent: 'task_created',
    triggerPayload: { taskId: 'task-102', priority: 'urgent', title: 'Hotfix Auth Token Leak' },
    status: 'success',
    actionResult: { alertDispatched: true },
    executionDurationMs: 38,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const sampleAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    workspaceId: 'ws-demo',
    action: 'automation.executed',
    resourceType: 'automation',
    resourceId: 'rule-1',
    details: { ruleName: 'Notify Reviewer on Submission', status: 'success' },
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'audit-2',
    workspaceId: 'ws-demo',
    action: 'task.status_changed',
    resourceType: 'task',
    resourceId: 'J-1',
    details: { from: 'in_progress', to: 'ready_for_review', taskTitle: 'Planning' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'audit-3',
    workspaceId: 'ws-demo',
    action: 'member.invited',
    resourceType: 'member',
    resourceId: 'joy224564@gmail.com',
    details: { invitedEmail: 'joy224564@gmail.com', role: 'member' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function getAutomationRules(workspaceId: string): Promise<AutomationRule[]> {
  if (!workspaceId || workspaceId.startsWith('ws-')) {
    return sampleAutomationRules;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('automation_rules')
    .select(`
      *,
      project:projects(name),
      creator:profiles!created_by(full_name, email)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    if (error) console.warn('getAutomationRules fallback:', error.message);
    return sampleAutomationRules;
  }

  return data.map((r: any) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    projectId: r.project_id || undefined,
    projectName: r.project?.name || undefined,
    name: r.name,
    description: r.description || undefined,
    isActive: Boolean(r.is_active),
    triggerType: r.trigger_type as AutomationTriggerType,
    triggerConfig: r.trigger_config || {},
    conditions: r.conditions || [],
    actionType: r.action_type as AutomationActionType,
    actionConfig: r.action_config || {},
    executionCount: Number(r.execution_count || 0),
    lastTriggeredAt: r.last_triggered_at || undefined,
    createdByName: r.creator?.full_name || r.creator?.email || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createAutomationRule(input: {
  workspaceId: string;
  projectId?: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig?: Record<string, any>;
  conditions?: AutomationCondition[];
  actionType: AutomationActionType;
  actionConfig?: Record<string, any>;
}): Promise<AutomationRule> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_active: true,
      trigger_type: input.triggerType,
      trigger_config: input.triggerConfig || {},
      conditions: input.conditions || [],
      action_type: input.actionType,
      action_config: input.actionConfig || {},
      created_by: user?.id || null,
    })
    .select('*, project:projects(name)')
    .single();

  if (error) throw error;

  // Record audit log
  await recordAuditLog({
    workspaceId: input.workspaceId,
    action: 'automation.created',
    resourceType: 'automation',
    resourceId: data.id,
    details: { name: data.name, triggerType: data.trigger_type, actionType: data.action_type },
  });

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    projectId: data.project_id || undefined,
    projectName: data.project?.name || undefined,
    name: data.name,
    description: data.description || undefined,
    isActive: data.is_active,
    triggerType: data.trigger_type,
    triggerConfig: data.trigger_config || {},
    conditions: data.conditions || [],
    actionType: data.action_type,
    actionConfig: data.action_config || {},
    executionCount: 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function toggleAutomationRule(ruleId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('automation_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId);

  if (error) throw error;
}

export async function deleteAutomationRule(ruleId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('automation_rules').delete().eq('id', ruleId);
  if (error) throw error;
}

export async function getAutomationRuns(workspaceId: string): Promise<AutomationRun[]> {
  if (!workspaceId || workspaceId.startsWith('ws-')) {
    return sampleAutomationRuns;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('automation_runs')
    .select(`
      *,
      rule:automation_rules(name)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    if (error) console.warn('getAutomationRuns fallback:', error.message);
    return sampleAutomationRuns;
  }

  return data.map((run: any) => ({
    id: run.id,
    ruleId: run.rule_id,
    ruleName: run.rule?.name || 'Automation Rule',
    workspaceId: run.workspace_id,
    triggerEvent: run.trigger_event,
    triggerPayload: run.trigger_payload || {},
    status: run.status,
    actionResult: run.action_result || {},
    errorMessage: run.error_message || undefined,
    executionDurationMs: run.execution_duration_ms || 0,
    createdAt: run.created_at,
  }));
}

export async function getAuditLogs(workspaceId: string): Promise<AuditLog[]> {
  if (!workspaceId || workspaceId.startsWith('ws-')) {
    return sampleAuditLogs;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:profiles!actor_id(id, full_name, email, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    if (error) console.warn('getAuditLogs fallback:', error.message);
    return sampleAuditLogs;
  }

  return data.map((log: any) => ({
    id: log.id,
    workspaceId: log.workspace_id,
    actor: log.actor
      ? {
          id: log.actor.id,
          name: log.actor.full_name || log.actor.email?.split('@')[0] || 'User',
          email: log.actor.email,
          avatarUrl: log.actor.avatar_url || undefined,
          initials: (log.actor.full_name || 'U')
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          role: 'Team Member',
        }
      : undefined,
    action: log.action,
    resourceType: log.resource_type,
    resourceId: log.resource_id || undefined,
    details: log.details || {},
    createdAt: log.created_at,
  }));
}

export async function recordAuditLog(input: {
  workspaceId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
}): Promise<void> {
  const supabase = createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert({
      workspace_id: input.workspaceId,
      actor_id: user?.id || null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      details: input.details || {},
    });
  } catch (err) {
    console.warn('recordAuditLog skipped:', err);
  }
}

// Blueprint T13: Automation retry with idempotency guarantee
export async function retryAutomationRun(runId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: run, error } = await supabase
    .from('automation_runs')
    .select('*, rule:automation_rules(*)')
    .eq('id', runId)
    .single();

  if (error || !run || !run.rule) {
    return false;
  }

  // Idempotency check: if run already succeeded, avoid duplicate side-effects
  if (run.status === 'success') {
    return true;
  }

  const startTime = Date.now();
  let success = false;
  let errorMsg: string | undefined;

  try {
    const rule = run.rule;
    await executeAutomationAction(rule, run.trigger_payload);
    success = true;
  } catch (err: any) {
    errorMsg = err.message || 'Retry failed';
  }

  const duration = Date.now() - startTime;

  await supabase
    .from('automation_runs')
    .update({
      status: success ? 'success' : 'failed',
      error_message: errorMsg || null,
      execution_duration_ms: duration,
      created_at: new Date().toISOString(),
    })
    .eq('id', runId);

  return success;
}

// Internal action dispatcher
async function executeAutomationAction(
  rule: any,
  payload: Record<string, any>
): Promise<Record<string, any>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actionType = rule.action_type;
  const config = rule.action_config || {};

  switch (actionType) {
    case 'send_notification': {
      // Find recipient (creator or workspace members)
      const recipientId = payload.assigneeId || payload.userId || user?.id;
      if (recipientId) {
        await supabase.from('notifications').insert({
          workspace_id: rule.workspace_id,
          recipient_id: recipientId,
          actor_id: user?.id || null,
          type: 'system',
          title: config.title || 'Automation Notice',
          body: config.body || 'Triggered by workflow rule.',
          link_url: payload.taskId ? `/w/${payload.workspaceSlug || 'fabriq'}/tasks` : null,
        });
      }
      return { sentNotification: true, recipientId };
    }

    case 'create_subtask': {
      if (payload.taskId && config.title) {
        await supabase.from('task_subtasks').insert({
          task_id: payload.taskId,
          title: config.title,
          is_completed: false,
        });
        return { subtaskCreated: true, title: config.title };
      }
      return { skipped: true, reason: 'No taskId in payload' };
    }

    case 'change_status': {
      if (payload.taskId && config.targetStatus) {
        await supabase
          .from('tasks')
          .update({ status: config.targetStatus, updated_at: new Date().toISOString() })
          .eq('id', payload.taskId);
        return { statusChangedTo: config.targetStatus };
      }
      return { skipped: true };
    }

    default:
      return { executed: true, actionType };
  }
}

// Master event-driven trigger pipeline
export async function triggerAutomations(
  workspaceId: string,
  eventType: AutomationTriggerType,
  payload: Record<string, any>
): Promise<void> {
  if (!workspaceId || workspaceId.startsWith('ws-')) return;

  // 1. Loop prevention & recursion guard
  const depthKey = `${workspaceId}:${eventType}`;
  const currentDepth = executionRecursionDepth.get(depthKey) || 0;
  if (currentDepth >= MAX_RECURSION_DEPTH) {
    console.warn(`[LoopPrevention] Max recursion depth reached for ${depthKey}. Skipping execution.`);
    return;
  }
  executionRecursionDepth.set(depthKey, currentDepth + 1);

  const supabase = createClient();

  try {
    // 2. Fetch active rules matching workspace & event
    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .eq('trigger_type', eventType);

    if (error || !rules || rules.length === 0) return;

    for (const rule of rules) {
      // 3. Condition evaluation
      let matches = true;
      if (rule.conditions && Array.isArray(rule.conditions)) {
        for (const cond of rule.conditions) {
          const val = payload[cond.field];
          if (cond.operator === 'equals' && val !== cond.value) {
            matches = false;
            break;
          }
          if (cond.operator === 'not_equals' && val === cond.value) {
            matches = false;
            break;
          }
        }
      }

      if (!matches) continue;

      // 4. Execute action
      const startTime = Date.now();
      let status: 'success' | 'failed' = 'success';
      let errorMsg: string | undefined;
      let actionResult: Record<string, any> = {};

      try {
        actionResult = await executeAutomationAction(rule, payload);
      } catch (err: any) {
        status = 'failed';
        errorMsg = err.message || 'Execution failed';
      }

      const durationMs = Date.now() - startTime;

      // 5. Durable execution run log
      await supabase.from('automation_runs').insert({
        rule_id: rule.id,
        workspace_id: workspaceId,
        trigger_event: eventType,
        trigger_payload: payload,
        status,
        action_result: actionResult,
        error_message: errorMsg || null,
        execution_duration_ms: durationMs,
        idempotency_key: `${rule.id}:${payload.taskId || Date.now()}`,
      });

      // 6. Increment execution counter
      await supabase
        .from('automation_rules')
        .update({
          execution_count: (rule.execution_count || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', rule.id);

      // 7. Audit log entry
      await recordAuditLog({
        workspaceId,
        action: 'automation.executed',
        resourceType: 'automation',
        resourceId: rule.id,
        details: { ruleName: rule.name, status, durationMs },
      });
    }
  } catch (err) {
    console.warn('triggerAutomations error:', err);
  } finally {
    // Reset recursion depth counter
    executionRecursionDepth.set(depthKey, Math.max(0, currentDepth));
  }
}

