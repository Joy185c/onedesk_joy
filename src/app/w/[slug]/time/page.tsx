'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Calendar,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeEntry, ProjectSummary, Task } from '@/lib/types';
import {
  getTimeEntries,
  logTimeEntry,
  deleteTimeEntry,
} from '@/lib/services/productivityService';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { getProjectTasks } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function TimeTrackingPage() {
  const { workspace, user } = useWorkspace();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(true);

  // Live Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Manual Log Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualHours, setManualHours] = useState('1.5');
  const [manualDescription, setManualDescription] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [logging, setLogging] = useState(false);

  // Load initial entries and projects
  const loadData = async () => {
    if (!workspace.id) return;
    try {
      const [entriesData, projsData] = await Promise.all([
        getTimeEntries(workspace.id),
        getWorkspaceProjects(workspace.id),
      ]);
      setEntries(entriesData);
      setProjects(projsData);
      if (projsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projsData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id]);

  // Load tasks when selected project changes
  useEffect(() => {
    if (selectedProjectId) {
      getProjectTasks(selectedProjectId).then(setProjectTasks);
    } else {
      setProjectTasks([]);
    }
  }, [selectedProjectId]);

  // Live Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStopAndLogTimer = async () => {
    setTimerRunning(false);
    const minutes = Math.max(1, Math.round(timerSeconds / 60));

    if (!selectedProjectId) {
      alert('Please select a project before logging time.');
      return;
    }

    try {
      const newEntry = await logTimeEntry({
        workspaceId: workspace.id,
        projectId: selectedProjectId,
        taskId: selectedTaskId || undefined,
        durationMinutes: minutes,
        description: `Stopwatch session for ${selectedTaskId ? 'deliverable' : 'project'}`,
      });

      setEntries([newEntry, ...entries]);
      setTimerSeconds(0);
    } catch (err: any) {
      alert(err.message || 'Failed to log timer session');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    const durationMinutes = Math.round(Number(manualHours) * 60);
    if (durationMinutes <= 0) return;

    setLogging(true);
    try {
      const newEntry = await logTimeEntry({
        workspaceId: workspace.id,
        projectId: selectedProjectId,
        taskId: selectedTaskId || undefined,
        durationMinutes,
        description: manualDescription.trim() || undefined,
        entryDate: manualDate,
      });

      setEntries([newEntry, ...entries]);
      setManualModalOpen(false);
      setManualDescription('');
    } catch (err: any) {
      alert(err.message || 'Failed to log time');
    } finally {
      setLogging(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this time entry?')) return;
    try {
      await deleteTimeEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  const totalMinutes = entries.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              Productivity Timesheets
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            Time Tracking & Logs
          </h1>
          <p className="text-xs text-[#778079] mt-0.5">
            Deliverable velocity, sprint capacity, and developer timesheets across {workspace.name}.
          </p>
        </div>

        <Button
          onClick={() => setManualModalOpen(true)}
          variant="primary"
          size="sm"
          className="font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Time Log</span>
        </Button>
      </div>

      {/* Top Section: Live Stopwatch Widget + Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Stopwatch Widget */}
        <div className="lg:col-span-2 bg-[#082F1B] rounded-2xl p-6 text-white shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#20E34A]" />
              <span className="text-sm font-bold">Active Sprint Stopwatch</span>
            </div>
            {timerRunning && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#20E34A] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#20E34A]" />
                Recording
              </span>
            )}
          </div>

          <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-wider text-white">
              {formatTimer(timerSeconds)}
            </div>

            <div className="flex items-center gap-3">
              {!timerRunning ? (
                <button
                  onClick={() => setTimerRunning(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#20E34A] hover:bg-[#1cd243] text-[#082F1B] font-extrabold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{timerSeconds > 0 ? 'Resume' : 'Start Timer'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setTimerRunning(false)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#082F1B] font-extrabold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              {timerSeconds > 0 && (
                <button
                  onClick={handleStopAndLogTimer}
                  className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop & Log</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Selectors for Active Timer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
            <div>
              <label className="block text-[10px] text-[#A3B899] uppercase font-bold mb-1">
                Project
              </label>
              <select
                className="w-full bg-[#12452C] border border-white/10 rounded-xl p-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#20E34A]"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="text-[#18251D]">
                    [{p.key}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-[#A3B899] uppercase font-bold mb-1">
                Deliverable Task (Optional)
              </label>
              <select
                className="w-full bg-[#12452C] border border-white/10 rounded-xl p-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#20E34A]"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="" className="text-[#18251D]">General Project Time</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id} className="text-[#18251D]">
                    {t.projectKey}-{t.taskNumber}: {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Aggregate KPI Summary Card */}
        <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-card flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#778079]">
              Total Time Logged
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#18251D]">{totalHours}</span>
              <span className="text-sm font-semibold text-[#778079]">hours</span>
            </div>
            <p className="text-xs text-[#5E6962] mt-1">
              Across {entries.length} tracked work sessions in {workspace.name}.
            </p>
          </div>

          <div className="pt-4 border-t border-[#F0F1F3] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#5E6962]">
              <span>Active Contributor:</span>
              <span className="font-bold text-[#18251D]">{user.name}</span>
            </div>
            <div className="flex items-center justify-between text-[#5E6962]">
              <span>Timesheet Policy:</span>
              <span className="font-bold text-[#064E24] bg-[#E9FBEA] px-2 py-0.5 rounded-full">
                Sprint Tracking Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheet Entries Table */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E9E6] flex items-center justify-between bg-[#F7F8F8]">
          <h3 className="text-sm font-extrabold text-[#18251D] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#064E24]" />
            <span>Logged Time Sessions</span>
          </h3>
          <span className="text-xs font-mono text-[#778079]">
            {entries.length} entries recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E9E6] bg-[#F7F8F8] text-[11px] font-bold uppercase tracking-wider text-[#778079]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Project / Task</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E6]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#778079]">
                    No time entries logged yet. Start the stopwatch or click &quot;Manual Time Log&quot;.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const hours = (entry.durationMinutes / 60).toFixed(1);
                  return (
                    <tr key={entry.id} className="hover:bg-[#F7F8F8] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#778079] whitespace-nowrap">
                        {entry.entryDate}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#18251D]">
                        <div className="flex items-center gap-1.5">
                          {entry.projectKey && (
                            <span className="px-1.5 py-0.5 rounded bg-[#082F1B] text-[#20E34A] font-mono text-[10px] font-bold">
                              {entry.projectKey}
                            </span>
                          )}
                          <span>{entry.taskTitle || entry.projectName || 'Project work'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6962] max-w-xs truncate">
                        {entry.description || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#18251D]">
                          <span className="w-4 h-4 rounded-full bg-[#082F1B] text-white flex items-center justify-center font-bold text-[8px]">
                            {entry.user.initials}
                          </span>
                          <span>{entry.user.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#064E24]">
                        {hours}h
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-[#778079] hover:text-rose-600 transition-colors p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Log Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E9E6] bg-[#F7F8F8] flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#18251D]">Manual Time Log</h2>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-[#778079] hover:text-[#18251D]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                  Project *
                </label>
                <select
                  required
                  className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">Select target project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                  Deliverable Task (Optional)
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  <option value="">General Project Time</option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.projectKey}-{t.taskNumber}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Hours Worked *
                  </label>
                  <Input
                    type="number"
                    step="0.25"
                    required
                    placeholder="e.g. 2.5"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                  Description / Deliverable Note
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                  placeholder="What tasks or modules were built?"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-[#E5E9E6] flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={logging || !selectedProjectId}
                  className="font-bold"
                >
                  {logging ? 'Logging...' : 'Log Hours'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
