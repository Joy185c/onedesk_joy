import { NextRequest, NextResponse } from 'next/server';

interface AIProposalResponse {
  title: string;
  summary: string;
  tasks: {
    title: string;
    description: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    storyPoints?: number;
    estimatedHours?: number;
    subtasks?: string[];
  }[];
  risks?: string[];
  recommendations?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPrompt, workspaceName, projectName, projectKey, overdueCount, taskCount } = body;

    if (!userPrompt) {
      return NextResponse.json({ error: 'User prompt is required.' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // 1. Try Google Gemini API if GEMINI_API_KEY is configured
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `You are OneDesk AI Assistant, an agile software delivery architect.
Generate a structured delivery proposal for workspace "${workspaceName || 'OneDesk'}" and target project "${projectName || 'Delivery'}" (${projectKey || 'PRJ'}).
Context: ${taskCount || 0} active deliverables, ${overdueCount || 0} overdue tasks.
User Request: "${userPrompt}"

You MUST respond with pure JSON strictly matching this schema:
{
  "title": "String title for the proposal plan",
  "summary": "String explanation of the proposal breakdown",
  "tasks": [
    {
      "title": "Clear deliverable title",
      "description": "Specific implementation scope and acceptance criteria",
      "priority": "urgent" | "high" | "medium" | "low",
      "storyPoints": 1-13 number,
      "estimatedHours": 1-40 number,
      "subtasks": ["Checklist item 1", "Checklist item 2", "Checklist item 3"]
    }
  ],
  "risks": ["Identified deadline or technical risk 1"],
  "recommendations": ["Process or sprint recommendation 1"]
}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed: AIProposalResponse = JSON.parse(rawText);
            return NextResponse.json({
              provider: 'gemini',
              model: 'gemini-1.5-flash',
              proposal: parsed,
            });
          }
        } else {
          console.warn('Gemini API call returned non-200:', await geminiRes.text());
        }
      } catch (geminiErr) {
        console.warn('Gemini invocation error, falling back:', geminiErr);
      }
    }

    // 2. Try Groq API if GROQ_API_KEY is configured
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content:
                  'You are OneDesk AI Assistant. Decompose project requests into structured sprint deliverables in JSON format matching { title, summary, tasks: [{ title, description, priority, storyPoints, estimatedHours, subtasks }], risks, recommendations }.',
              },
              {
                role: 'user',
                content: `Workspace: ${workspaceName}. Project: ${projectName} (${projectKey}). User Request: ${userPrompt}`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            const parsed: AIProposalResponse = JSON.parse(content);
            return NextResponse.json({
              provider: 'groq',
              model: 'llama-3.3-70b-versatile',
              proposal: parsed,
            });
          }
        } else {
          console.warn('Groq API call returned non-200:', await groqRes.text());
        }
      } catch (groqErr) {
        console.warn('Groq invocation error, falling back:', groqErr);
      }
    }

    // 3. High-quality Deterministic Semantic Fallback (when no API key or offline)
    const promptLower = userPrompt.toLowerCase();
    const pName = projectName || 'Primary Delivery';

    let fallbackPlan: AIProposalResponse;

    if (promptLower.includes('qa') || promptLower.includes('test') || promptLower.includes('regression')) {
      fallbackPlan = {
        title: `QA & Acceptance Protocol: ${pName}`,
        summary: `Structured end-to-end regression and verification suite for ${pName}.`,
        tasks: [
          {
            title: 'End-to-End Regression Test Suite',
            description: 'Execute automated regression testing across all critical tenant workflows and permission gates.',
            priority: 'high',
            storyPoints: 5,
            estimatedHours: 8,
            subtasks: [
              'Run Playwright tenant isolation scenarios',
              'Verify RLS boundary enforcement on private projects',
              'Audit token revocation on membership termination',
            ],
          },
          {
            title: 'Cross-Browser Visual & UI Inspection',
            description: 'Verify Obsidian Forest & Electric Lime contrast, dark theme tokens, and mobile responsiveness.',
            priority: 'medium',
            storyPoints: 3,
            estimatedHours: 4,
            subtasks: [
              'Verify drawer modals at 375px mobile viewport',
              'Test tablet navigation rail collapse state',
              'Audit keyboard navigation and focus indicators',
            ],
          },
          {
            title: 'Load and Realtime Latency Benchmark',
            description: 'Measure message delivery and notification latency under concurrent WebSocket connections.',
            priority: 'low',
            storyPoints: 2,
            estimatedHours: 3,
            subtasks: ['Profile Supabase channel broadcast rate', 'Verify client-side message deduplication'],
          },
        ],
        risks: ['Ensure staging Supabase instance matches production RLS policies before running destructive test scripts.'],
        recommendations: ['Require a Review Gate sign-off before closing the regression suite.'],
      };
    } else if (promptLower.includes('risk') || promptLower.includes('deadline') || promptLower.includes('audit')) {
      fallbackPlan = {
        title: `Deadline Risk Mitigation: ${pName}`,
        summary: `Analyzed delivery roadmap for ${workspaceName || 'Workspace'}. Identified ${overdueCount || 0} deliverable bottleneck(s).`,
        tasks: [
          {
            title: 'Mitigate Overdue Delivery Roadblocks',
            description: `Resolve dependencies on ${overdueCount || 0} flagged tasks across active sprints.`,
            priority: 'urgent',
            storyPoints: 5,
            estimatedHours: 6,
            subtasks: [
              'Reassign unblocked subtasks to active contributors',
              'Adjust sprint milestone due dates with client stakeholder',
            ],
          },
          {
            title: 'Workload Rebalancing & Capacity Review',
            description: 'Redistribute high-velocity tasks to prevent team burnout across parallel projects.',
            priority: 'high',
            storyPoints: 3,
            estimatedHours: 4,
            subtasks: ['Inspect member timesheets in Time Tracking', 'Balance story point distribution in Sprint Backlog'],
          },
        ],
        risks: [overdueCount && overdueCount > 0 ? `${overdueCount} task(s) currently past deadline.` : 'Tight schedule on sprint milestone deliverables.'],
        recommendations: ['Enable "Review Gatekeeper" automation rule to catch unreviewed PRs earlier.'],
      };
    } else {
      fallbackPlan = {
        title: `Sprint Scope Breakdown: ${pName}`,
        summary: `Decomposed natural language brief "${userPrompt.slice(0, 50)}..." into actionable sprint deliverables for ${pName}.`,
        tasks: [
          {
            title: `${userPrompt.length > 30 ? userPrompt.slice(0, 30) + '...' : userPrompt} - Architectural Blueprint`,
            description: `Establish interface contracts, database constraints, and state machine transitions for "${userPrompt}".`,
            priority: 'high',
            storyPoints: 5,
            estimatedHours: 8,
            subtasks: [
              'Draft schema migration with foreign keys and RLS',
              'Document API contracts and permission matrices',
              'Align UI design tokens with Obsidian Forest specifications',
            ],
          },
          {
            title: `${userPrompt.length > 30 ? userPrompt.slice(0, 30) + '...' : userPrompt} - Core Implementation`,
            description: `Implement full-stack service handlers and reactive UI components.`,
            priority: 'urgent',
            storyPoints: 8,
            estimatedHours: 14,
            subtasks: [
              'Connect Supabase persistence with optimistic client state',
              'Add form validation with Zod schemas',
              'Implement real-time notification dispatch',
            ],
          },
          {
            title: `${userPrompt.length > 30 ? userPrompt.slice(0, 30) + '...' : userPrompt} - QA Review Gate & Sign-off`,
            description: `Execute comprehensive review protocol and collect reviewer approval.`,
            priority: 'medium',
            storyPoints: 3,
            estimatedHours: 4,
            subtasks: ['Submit task for formal manager review', 'Verify audit log persistence'],
          },
        ],
        risks: ['Ensure assignee has authorized membership in target project before task distribution.'],
        recommendations: ['Use Automations Studio to trigger milestone celebrations on completion.'],
      };
    }

    return NextResponse.json({
      provider: 'heuristic',
      model: 'deterministic-planner-v2',
      proposal: fallbackPlan,
    });
  } catch (error: any) {
    console.error('AI proposal route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal AI service error' },
      { status: 500 }
    );
  }
}
