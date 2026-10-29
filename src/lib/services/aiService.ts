import { createClient } from '@/lib/supabase/client';
import { AIProposalPlan, AIProposedTask, TaskPriority } from '@/lib/types';
import { createTask, addSubtask } from '@/lib/services/taskService';
import { recordAuditLog } from '@/lib/services/automationService';

// Permission-aware context retrieval for the AI assistant
export async function getAIWorkspaceContext(workspaceId: string): Promise<{
  workspaceName: string;
  projectCount: number;
  taskCount: number;
  overdueCount: number;
  projects: { id: string; name: string; key: string }[];
}> {
  const supabase = createClient();

  const { data: ws } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  const { data: projs } = await supabase
    .from('projects')
    .select('id, name, key')
    .eq('workspace_id', workspaceId);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, due_date, status')
    .eq('workspace_id', workspaceId);

  const now = new Date();
  const overdueCount = (tasks || []).filter(
    (t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
  ).length;

  return {
    workspaceName: ws?.name || 'Workspace',
    projectCount: (projs || []).length,
    taskCount: (tasks || []).length,
    overdueCount,
    projects: (projs || []).map((p: any) => ({ id: p.id, name: p.name, key: p.key })),
  };
}

export async function getAIProviderStatus(): Promise<{
  provider: 'gemini' | 'groq' | 'heuristic';
  model: string;
  isLive: boolean;
  statusText: string;
}> {
  try {
    const res = await fetch('/api/ai/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to probe AI status endpoint:', err);
  }

  return {
    provider: 'heuristic',
    model: 'deterministic-planner-v2',
    isLive: false,
    statusText: 'Semantic Heuristic Engine (Add GEMINI_API_KEY to .env.local for live LLM)',
  };
}

// Blueprint T14: AI task creation proposal: Schema-validated proposal with NO write before confirmation
export async function generateAIProposal(
  workspaceId: string,
  userPrompt: string,
  targetProjectId?: string
): Promise<AIProposalPlan> {
  const context = await getAIWorkspaceContext(workspaceId);
  const targetProject =
    context.projects.find((p) => p.id === targetProjectId) || context.projects[0];

  const pKey = targetProject?.key || 'PRJ';
  const pName = targetProject?.name || 'Primary Delivery';

  try {
    // Call server-side LLM endpoint (Gemini / Groq / Schema Validator)
    const apiRes = await fetch('/api/ai/proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt,
        workspaceName: context.workspaceName,
        projectName: pName,
        projectKey: pKey,
        overdueCount: context.overdueCount,
        taskCount: context.taskCount,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.proposal) {
        const prop = data.proposal;
        return {
          id: `proposal-${Date.now()}`,
          title: prop.title || `AI Delivery Plan: ${pName}`,
          summary: prop.summary || `Decomposed scope for ${pName}.`,
          targetProjectId: targetProject?.id || '',
          projectName: pName,
          tasks: (prop.tasks || []).map((t: any) => ({
            title: t.title,
            description: t.description || '',
            priority: (t.priority || 'medium') as TaskPriority,
            storyPoints: t.storyPoints ? Number(t.storyPoints) : undefined,
            estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : undefined,
            subtasks: t.subtasks || [],
          })),
          risks: prop.risks || [],
          recommendations: prop.recommendations || [],
          createdAt: new Date().toISOString(),
        };
      }
    }
  } catch (apiErr) {
    console.warn('AI proposal API fetch failed, utilizing client fallback:', apiErr);
  }

  // Fallback if network or offline
  return {
    id: `proposal-${Date.now()}`,
    title: `AI Delivery Plan: ${pName}`,
    summary: `Structured sprint scope for "${userPrompt.slice(0, 40)}..."`,
    targetProjectId: targetProject?.id || '',
    projectName: pName,
    tasks: [
      {
        title: `${userPrompt.slice(0, 30)} - Architecture & Schema`,
        description: 'Establish interface contracts, database constraints, and state transitions.',
        priority: 'high',
        storyPoints: 5,
        estimatedHours: 8,
        subtasks: ['Define schema migrations', 'Document API contracts'],
      },
      {
        title: `${userPrompt.slice(0, 30)} - Core Feature Delivery`,
        description: 'Implement full-stack service handlers and reactive UI components.',
        priority: 'urgent',
        storyPoints: 8,
        estimatedHours: 14,
        subtasks: ['Connect Supabase persistence', 'Implement real-time sync'],
      },
      {
        title: `${userPrompt.slice(0, 30)} - QA Review Gate`,
        description: 'Verify acceptance criteria and conduct peer review sign-off.',
        priority: 'medium',
        storyPoints: 3,
        estimatedHours: 4,
        subtasks: ['Run automated regression suite', 'Obtain manager approval'],
      },
    ],
    risks: ['Ensure project membership is assigned prior to task distribution.'],
    recommendations: ['Enable "Review Gatekeeper" rule in Automations Studio.'],
    createdAt: new Date().toISOString(),
  };
}

// Blueprint T14: Explicit user confirmation execution - ONLY writes to DB when confirmed
export async function applyAIProposal(
  workspaceId: string,
  proposal: AIProposalPlan,
  selectedIndices: number[]
): Promise<{
  success: boolean;
  createdTaskCount: number;
  createdTasks: any[];
}> {
  if (!proposal.targetProjectId) {
    throw new Error('Target project required to apply AI proposal.');
  }

  const tasksToCreate = proposal.tasks.filter((_, idx) => selectedIndices.includes(idx));
  if (tasksToCreate.length === 0) {
    throw new Error('Please select at least one task to apply.');
  }

  const createdTasks: any[] = [];

  for (const taskItem of tasksToCreate) {
    const task = await createTask({
      workspaceId,
      projectId: proposal.targetProjectId,
      title: taskItem.title,
      description: taskItem.description,
      priority: taskItem.priority,
      storyPoints: taskItem.storyPoints,
      estimatedHours: taskItem.estimatedHours,
      reviewRequired: true,
    });

    // Create subtasks if specified
    if (taskItem.subtasks && taskItem.subtasks.length > 0) {
      for (const st of taskItem.subtasks) {
        try {
          await addSubtask(task.id, st);
        } catch (e) {
          console.warn('Failed to add subtask for AI task:', e);
        }
      }
    }

    createdTasks.push(task);
  }

  // Record audit trail event
  await recordAuditLog({
    workspaceId,
    action: 'ai.plan_applied',
    resourceType: 'ai_proposal',
    resourceId: proposal.id,
    details: {
      planTitle: proposal.title,
      targetProjectId: proposal.targetProjectId,
      projectName: proposal.projectName,
      tasksCreated: createdTasks.length,
    },
  });

  return {
    success: true,
    createdTaskCount: createdTasks.length,
    createdTasks,
  };
}
