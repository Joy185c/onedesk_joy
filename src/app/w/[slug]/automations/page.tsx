'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Activity,
  Layers,
  ChevronRight,
  Filter,
  Check,
  X,
  Trash2,
  Sparkles,
  ArrowRight,
  History,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  AutomationRule,
  AutomationRun,
  AuditLog,
  AutomationTriggerType,
  AutomationActionType,
} from '@/lib/types';
import {
  getAutomationRules,
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  getAutomationRuns,
  getAuditLogs,
  retryAutomationRun,
  PRESET_RECIPES,
} from '@/lib/services/automationService';

export default function AutomationsPage() {
  const { workspace, isAdminOrOwner } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'rules' | 'recipes' | 'history' | 'audit'>('rules');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);

  // New Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('task_created');
  const [condField, setCondField] = useState('priority');
  const [condVal, setCondVal] = useState('urgent');
  const [actionType, setActionType] = useState<AutomationActionType>('send_notification');
  const [actionTitle, setActionTitle] = useState('Workflow Alert');
  const [actionBody, setActionBody] = useState('Automated action triggered.');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!workspace.id) return;
    try {
      setLoading(true);
      const [rData, runData, aData] = await Promise.all([
        getAutomationRules(workspace.id),
        getAutomationRuns(workspace.id),
        getAuditLogs(workspace.id),
      ]);
      setRules(rData);
      setRuns(runData);
      setAuditLogs(aData);
    } catch (err) {
      console.error('Failed to load automation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id]);

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextStatus } : r))
    );
    try {
      await toggleAutomationRule(ruleId, nextStatus);
    } catch (err) {
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: currentStatus } : r))
      );
      alert('Failed to toggle rule.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    try {
      await deleteAutomationRule(ruleId);
    } catch (err) {
      loadData();
      alert('Failed to delete rule.');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    setSubmitting(true);
    try {
      const conditions =
        condField && condVal
          ? [{ field: condField, operator: 'equals' as const, value: condVal }]
          : [];

      let actionConfig: Record<string, any> = {};
      if (actionType === 'send_notification') {
        actionConfig = { title: actionTitle, body: actionBody };
      } else if (actionType === 'create_subtask') {
        actionConfig = { title: actionTitle || 'Automated verification checklist' };
      }

      await createAutomationRule({
        workspaceId: workspace.id,
        name: ruleName.trim(),
        description: ruleDesc.trim() || undefined,
        triggerType,
        conditions,
        actionType,
        actionConfig,
      });

      setIsBuilderOpen(false);
      setRuleName('');
      setRuleDesc('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create automation rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstallRecipe = async (recipe: (typeof PRESET_RECIPES)[0]) => {
    try {
      await createAutomationRule({
        workspaceId: workspace.id,
        name: recipe.name,
        description: recipe.description,
        triggerType: recipe.triggerType,
        triggerConfig: recipe.triggerConfig,
        conditions: recipe.conditions,
        actionType: recipe.actionType,
        actionConfig: recipe.actionConfig,
      });
      loadData();
      setActiveTab('rules');
    } catch (err: any) {
      alert(err.message || 'Failed to install recipe.');
    }
  };

  const handleRetryRun = async (runId: string) => {
    setRetryingRunId(runId);
    try {
      const success = await retryAutomationRun(runId);
      if (success) {
        alert('Automation retried successfully with idempotency protection.');
      } else {
        alert('Retry completed.');
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Retry failed.');
    } finally {
      setRetryingRunId(null);
    }
  };

  const getTriggerLabel = (type: AutomationTriggerType) => {
    switch (type) {
      case 'task_created':
        return 'When Task is Created';
      case 'task_status_changed':
        return 'When Task Status Changes';
      case 'review_requested':
        return 'When Task Submitted for Review';
      case 'review_approved':
        return 'When Review is Approved';
      case 'task_completed':
        return 'When Task is Completed';
      default:
        return type;
    }
  };

  const getActionLabel = (type: AutomationActionType) => {
    switch (type) {
      case 'send_notification':
        return 'Send Inbox Notification';
      case 'assign_user':
        return 'Assign Member';
      case 'change_status':
        return 'Update Status';
      case 'create_subtask':
        return 'Generate Subtask';
      case 'post_channel_message':
        return 'Post Channel Message';
      default:
        return type;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E9E6] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[#064E24] bg-[#20E34A]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#064E24]" />
              Event-Driven Workflows
            </span>
            <span className="text-xs text-[#778079]">· {workspace.name}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#18251D] tracking-tight">
            Automations Studio
          </h1>
          <p className="text-sm text-[#5E6962] mt-1 max-w-2xl">
            Design trigger-condition-action pipelines with durable queueing, loop prevention, and full audit logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsBuilderOpen(true)}
            className="bg-[#20E34A] text-[#082F1B] hover:bg-[#1bc740] font-bold shadow-xs flex items-center gap-2 rounded-xl h-10 px-4"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Rule</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E9E6] overflow-x-auto">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rules'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'recipes'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#064E24]" />
          <span>Pre-Built Recipes</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Execution Runs ({runs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Active Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#CBD3CE] bg-[#F7F8F8] space-y-3">
              <Zap className="w-10 h-10 text-[#778079] mx-auto opacity-50" />
              <h3 className="text-base font-bold text-[#18251D]">No automation rules active yet</h3>
              <p className="text-xs text-[#778079] max-w-md mx-auto">
                Create custom trigger-condition-action rules or activate a pre-built recipe to automate notifications and task handoffs.
              </p>
              <Button
                onClick={() => setActiveTab('recipes')}
                className="bg-[#082F1B] text-white hover:bg-[#064E24] text-xs font-bold rounded-xl mt-2"
              >
                Browse Recipes
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    rule.isActive
                      ? 'bg-white border-[#E5E9E6] shadow-xs hover:border-[#20E34A]'
                      : 'bg-[#F7F8F8] border-[#E5E9E6] opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rule.isActive ? 'bg-[#20E34A] animate-pulse' : 'bg-[#CBD3CE]'
                            }`}
                          />
                          <h3 className="font-extrabold text-sm text-[#18251D] leading-tight">
                            {rule.name}
                          </h3>
                        </div>
                        {rule.description && (
                          <p className="text-xs text-[#778079] line-clamp-2">{rule.description}</p>
                        )}
                      </div>

                      {/* Status Toggle Switch */}
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.isActive)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                          rule.isActive ? 'bg-[#082F1B]' : 'bg-[#CBD3CE]'
                        }`}
                        title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                            rule.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Visual Trigger -> Action Flow */}
                    <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#18251D]">
                        <span className="px-2 py-0.5 rounded-md bg-[#E5E9E6] text-[#5E6962] font-mono text-[10px]">
                          TRIGGER
                        </span>
                        <span>{getTriggerLabel(rule.triggerType)}</span>
                      </div>

                      {rule.conditions && rule.conditions.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#5E6962] pl-2 border-l-2 border-[#CBD3CE]">
                          <span className="text-[10px] text-[#778079] uppercase">If:</span>
                          <span>
                            {rule.conditions[0].field} {rule.conditions[0].operator}{' '}
                            <span className="font-mono text-[#064E24]">{rule.conditions[0].value}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] font-bold text-[#064E24]">
                        <span className="px-2 py-0.5 rounded-md bg-[#20E34A]/20 text-[#064E24] font-mono text-[10px]">
                          ACTION
                        </span>
                        <span>{getActionLabel(rule.actionType)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Counters & Actions */}
                  <div className="pt-4 border-t border-[#E5E9E6] flex items-center justify-between text-xs text-[#778079]">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#064E24]" />
                      <span className="font-semibold text-[#18251D]">{rule.executionCount}</span>
                      <span>executions</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pre-Built Recipes */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="bg-[#F7F8F8] border border-[#E5E9E6] p-4 rounded-2xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#064E24] shrink-0" />
            <p className="text-xs text-[#5E6962]">
              These pre-tested recipes implement standard team collaboration patterns. Click <strong>Enable Recipe</strong> to activate instantly for {workspace.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_RECIPES.map((recipe, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-[#E5E9E6] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#20E34A] transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#18251D]">{recipe.name}</h3>
                    <Badge variant="default" className="text-[10px] bg-[#F7F8F8]">
                      Production Ready
                    </Badge>
                  </div>
                  <p className="text-xs text-[#778079] leading-relaxed">{recipe.description}</p>

                  <div className="p-3 rounded-xl bg-[#F7F8F8] text-xs space-y-1.5 font-medium text-[#18251D]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#778079]">WHEN:</span>
                      <span>{getTriggerLabel(recipe.triggerType)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#064E24] font-semibold">
                      <span className="text-[10px] font-mono text-[#778079]">THEN:</span>
                      <span>{getActionLabel(recipe.actionType)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleInstallRecipe(recipe)}
                  className="w-full bg-[#082F1B] text-white hover:bg-[#064E24] font-bold text-xs rounded-xl h-9"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  <span>Enable Recipe</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Execution Runs (Durable Queue & Retries) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E5E9E6] bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E9E6] bg-[#F7F8F8] text-[#778079] font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-6">Status</th>
                    <th className="p-3.5">Workflow Rule</th>
                    <th className="p-3.5">Trigger Event</th>
                    <th className="p-3.5">Execution Duration</th>
                    <th className="p-3.5">Executed At</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E6]">
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#778079] italic">
                        No automation runs logged yet. Events will appear here as deliverables progress.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="hover:bg-[#F7F8F8] transition-colors">
                        <td className="p-3.5 pl-6">
                          {run.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#064E24] bg-[#20E34A]/20 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-[#064E24]" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              {run.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-[#18251D]">{run.ruleName}</td>
                        <td className="p-3.5 font-mono text-[11px] text-[#5E6962]">
                          {run.triggerEvent}
                        </td>
                        <td className="p-3.5 text-[#778079]">{run.executionDurationMs} ms</td>
                        <td className="p-3.5 text-[#778079]">
                          {new Date(run.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="p-3.5 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryingRunId === run.id}
                            onClick={() => handleRetryRun(run.id)}
                            className="h-7 text-[11px] rounded-lg border-[#CBD3CE] hover:border-[#082F1B]"
                            title="Replay event with idempotency guarantee"
                          >
                            <RotateCcw
                              className={`w-3 h-3 mr-1 ${
                                retryingRunId === run.id ? 'animate-spin' : ''
                              }`}
                            />
                            <span>Retry</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E5E9E6] bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E9E6] bg-[#F7F8F8] text-[#778079] font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-6">Actor</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Resource</th>
                    <th className="p-3.5">Payload Details</th>
                    <th className="p-3.5 pr-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E6]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#778079] italic">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F7F8F8] transition-colors">
                        <td className="p-3.5 pl-6 font-semibold text-[#18251D]">
                          {log.actor?.name || 'System / Service'}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#F7F8F8] border border-[#CBD3CE] text-[#064E24] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#5E6962] font-semibold">{log.resourceType}</td>
                        <td className="p-3.5 text-[#778079] max-w-xs truncate font-mono text-[10px]">
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="p-3.5 pr-6 text-[#778079]">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Rule Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#CBD3CE] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#E5E9E6] flex items-center justify-between bg-[#F7F8F8]">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#064E24]" />
                <h3 className="font-extrabold text-base text-[#18251D]">New Automation Rule</h3>
              </div>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="p-1 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#E5E9E6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#18251D]">Rule Name</label>
                <Input
                  required
                  placeholder="e.g. Alert Lead on Urgent Bugs"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#18251D]">Description</label>
                <Input
                  placeholder="Explain what this automation automates..."
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Step 1: Trigger */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] space-y-2">
                <span className="text-[10px] font-bold text-[#064E24] uppercase tracking-wider block">
                  Step 1: When Trigger Event Occurs
                </span>
                <select
                  className="w-full text-xs font-semibold bg-white border border-[#CBD3CE] rounded-lg p-2 text-[#18251D]"
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
                >
                  <option value="task_created">When Task is Created</option>
                  <option value="task_status_changed">When Task Status Changes</option>
                  <option value="review_requested">When Deliverable Submitted for Review</option>
                  <option value="review_approved">When Review is Approved</option>
                  <option value="task_completed">When Task is Completed</option>
                </select>
              </div>

              {/* Step 2: Condition */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] space-y-2">
                <span className="text-[10px] font-bold text-[#5E6962] uppercase tracking-wider block">
                  Step 2: If Conditions Match (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="text-xs font-semibold bg-white border border-[#CBD3CE] rounded-lg p-2 text-[#18251D]"
                    value={condField}
                    onChange={(e) => setCondField(e.target.value)}
                  >
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                  <select
                    className="text-xs font-semibold bg-white border border-[#CBD3CE] rounded-lg p-2 text-[#18251D]"
                    value={condVal}
                    onChange={(e) => setCondVal(e.target.value)}
                  >
                    <option value="urgent">equals "urgent"</option>
                    <option value="high">equals "high"</option>
                    <option value="ready_for_review">equals "ready_for_review"</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Action */}
              <div className="p-3.5 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] space-y-2">
                <span className="text-[10px] font-bold text-[#064E24] uppercase tracking-wider block">
                  Step 3: Execute Action
                </span>
                <select
                  className="w-full text-xs font-semibold bg-white border border-[#CBD3CE] rounded-lg p-2 text-[#18251D]"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as AutomationActionType)}
                >
                  <option value="send_notification">Send In-App Notification</option>
                  <option value="create_subtask">Create Standard Checklist Subtask</option>
                </select>

                <Input
                  placeholder={
                    actionType === 'send_notification'
                      ? 'Notification title...'
                      : 'Subtask title...'
                  }
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E9E6]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBuilderOpen(false)}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#20E34A] text-[#082F1B] hover:bg-[#1bc740] font-bold text-xs h-9 rounded-xl"
                >
                  {submitting ? 'Creating...' : 'Save & Activate Workflow'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
