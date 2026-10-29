'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserAvatar } from '@/components/ui/avatar';
import { Goal, GoalStatus, ProjectSummary } from '@/lib/types';
import { getGoals, createGoal } from '@/lib/services/productivityService';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function GoalsPage() {
  const { workspace } = useWorkspace();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [krTitle, setKrTitle] = useState('');
  const [krTarget, setKrTarget] = useState('100');
  const [krUnit, setKrUnit] = useState('%');
  const [keyResultsList, setKeyResultsList] = useState<
    { title: string; targetValue: number; unit: string }[]
  >([]);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (!workspace.id) return;
    try {
      const [goalsData, projsData] = await Promise.all([
        getGoals(workspace.id),
        getWorkspaceProjects(workspace.id),
      ]);
      setGoals(goalsData);
      setProjects(projsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id]);

  const handleAddKr = () => {
    if (!krTitle.trim()) return;
    setKeyResultsList([
      ...keyResultsList,
      {
        title: krTitle.trim(),
        targetValue: Number(krTarget) || 100,
        unit: krUnit || '%',
      },
    ]);
    setKrTitle('');
    setKrTarget('100');
  };

  const handleRemoveKr = (idx: number) => {
    setKeyResultsList(keyResultsList.filter((_, i) => i !== idx));
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !workspace.id) return;

    setCreating(true);
    try {
      const newGoal = await createGoal({
        workspaceId: workspace.id,
        projectId: selectedProjectId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate || undefined,
        keyResults: keyResultsList,
      });

      setGoals([newGoal, ...goals]);
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setTargetDate('');
      setSelectedProjectId('');
      setKeyResultsList([]);
    } catch (err: any) {
      alert(err.message || 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              Strategic Alignment
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            Goals & OKRs
          </h1>
          <p className="text-xs text-[#778079] mt-0.5">
            Deliverable commitments, quantitative key results, and sprint targets in {workspace.name}.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          variant="primary"
          size="sm"
          className="font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal / OKR</span>
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const statusBadge =
            goal.status === 'on_track' ? (
              <Badge variant="on_track" dot>
                On Track
              </Badge>
            ) : goal.status === 'at_risk' ? (
              <Badge variant="at_risk" dot>
                At Risk
              </Badge>
            ) : (
              <Badge variant="completed" dot>
                Completed
              </Badge>
            );

          return (
            <div
              key={goal.id}
              className="bg-white rounded-2xl border border-[#E5E9E6] p-5 shadow-card hover:border-[#CBD3CE] transition-all space-y-4"
            >
              {/* Top Row: Title + Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#064E24]" />
                    <h3 className="text-sm font-extrabold text-[#18251D] leading-snug">
                      {goal.title}
                    </h3>
                  </div>
                  {goal.projectName && (
                    <span className="text-[10px] font-bold text-[#064E24] bg-[#E9FBEA] px-2 py-0.5 rounded-md">
                      Project: {goal.projectName}
                    </span>
                  )}
                </div>
                {statusBadge}
              </div>

              {goal.description && (
                <p className="text-xs text-[#5E6962] leading-relaxed">
                  {goal.description}
                </p>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#778079] text-[11px]">Goal Completion</span>
                  <span className="text-[#18251D] font-bold">{goal.progressPercent}%</span>
                </div>
                <Progress
                  value={goal.progressPercent}
                  color={goal.status === 'at_risk' ? 'amber' : 'lime'}
                  size="sm"
                />
              </div>

              {/* Key Results Checklist */}
              {goal.keyResults && goal.keyResults.length > 0 && (
                <div className="pt-2 border-t border-[#F0F1F3] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#778079]">
                    Key Results ({goal.keyResults.length})
                  </span>
                  <div className="space-y-2">
                    {goal.keyResults.map((kr) => {
                      const krPercent = Math.min(
                        100,
                        Math.round((kr.currentValue / (kr.targetValue || 1)) * 100)
                      );
                      return (
                        <div key={kr.id} className="p-2 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#18251D] truncate pr-2">
                              {kr.title}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#064E24] shrink-0">
                              {kr.currentValue} / {kr.targetValue} {kr.unit}
                            </span>
                          </div>
                          <Progress value={krPercent} color="lime" size="sm" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Meta */}
              <div className="pt-2 border-t border-[#F0F1F3] flex items-center justify-between text-[11px] text-[#778079]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#CBD3CE]" />
                  <span>
                    Target: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </div>
                {goal.owner && (
                  <div className="flex items-center gap-1.5 text-[#18251D] font-medium">
                    <UserAvatar user={goal.owner} size="xs" />
                    <span>{goal.owner.name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security badge */}
      <div className="p-3.5 rounded-xl bg-white border border-[#E5E9E6] flex items-center gap-2.5 text-xs text-[#778079] shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-[#064E24] shrink-0" />
        <span>
          Goals and Key Results reflect authenticated project RBAC. Private deliverables are hidden from non-members.
        </span>
      </div>

      {/* Create Goal Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E6] bg-[#F7F8F8]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E9FBEA] text-[#064E24]">
                  <Target className="w-5 h-5 text-[#20E34A]" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#18251D]">Create Strategic Goal / OKR</h2>
                  <p className="text-xs text-[#778079]">Workspace: {workspace.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#778079] hover:text-[#18251D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                  Goal Title *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Q4 Core Platform Release Readiness"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                  placeholder="Why is this goal important? What is the outcome?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Target Date
                  </label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Project (Optional)
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Workspace-wide Goal</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add Key Results Section */}
              <div className="pt-2 border-t border-[#E5E9E6] space-y-3">
                <span className="text-xs font-bold text-[#18251D] uppercase tracking-wider block">
                  Add Quantitative Key Results
                </span>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Key result title..."
                    value={krTitle}
                    onChange={(e) => setKrTitle(e.target.value)}
                    className="flex-1 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="100"
                    value={krTarget}
                    onChange={(e) => setKrTarget(e.target.value)}
                    className="w-20 text-xs"
                  />
                  <Input
                    type="text"
                    placeholder="%"
                    value={krUnit}
                    onChange={(e) => setKrUnit(e.target.value)}
                    className="w-14 text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleAddKr}
                    variant="outline"
                    size="sm"
                    className="font-bold text-xs"
                  >
                    + Add
                  </Button>
                </div>

                {keyResultsList.length > 0 && (
                  <div className="space-y-1.5">
                    {keyResultsList.map((kr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] text-xs"
                      >
                        <span className="font-semibold text-[#18251D]">{kr.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#064E24] font-bold">
                            Target: {kr.targetValue} {kr.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKr(idx)}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E5E9E6] flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={creating || !title.trim()}
                  className="font-bold"
                >
                  {creating ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
