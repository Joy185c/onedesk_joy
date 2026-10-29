'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  FolderKanban,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskDetailDrawer } from '@/components/task/TaskDetailDrawer';
import { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { getProjectTasks, updateTaskStatus } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { sampleTasks } from '@/lib/mockData';

export default function MyTasksPage() {
  const { workspace, user, isAdminOrOwner, isDemoMode } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'today' | 'overdue' | 'review' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!workspace.id) return;
    try {
      if (isDemoMode) {
        setTasks(sampleTasks);
      } else {
        const projs = await getWorkspaceProjects(workspace.id);
        const taskPromises = projs.map((p) => getProjectTasks(p.id));
        const allProjectTasks = (await Promise.all(taskPromises)).flat();

        // Assignment-based visibility: Filter deliverables assigned to current user
        const userAssigned = allProjectTasks.filter((t) =>
          t.assignees.some((a) => a.id === user.id)
        );

        if (userAssigned.length > 0) {
          setTasks(userAssigned);
        } else if (isAdminOrOwner) {
          // Workspace Owners/Admins see active deliverables across projects
          setTasks(allProjectTasks);
        } else {
          setTasks([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id, user.id, isDemoMode]);

  const handleToggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const nextStatus: TaskStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    try {
      await updateTaskStatus(task.id, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    const isCompleted = t.status === 'completed';
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !isCompleted;
    const isToday = t.dueDate && t.dueDate.split('T')[0] === todayStr;

    switch (filterTab) {
      case 'today':
        return isToday && !isCompleted;
      case 'overdue':
        return isOverdue;
      case 'review':
        return t.status === 'ready_for_review';
      case 'completed':
        return isCompleted;
      default:
        return !isCompleted;
    }
  });

  const assignedCount = tasks.filter((t) => t.status !== 'completed').length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;
  const inReviewCount = tasks.filter((t) => t.status === 'ready_for_review').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="urgent">Urgent</Badge>;
      case 'high':
        return <Badge variant="high">High</Badge>;
      case 'medium':
        return <Badge variant="medium">Medium</Badge>;
      case 'low':
        return <Badge variant="low">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
            Personal Work Center
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
          My Deliverables
        </h1>
        <p className="text-xs text-[#778079] mt-0.5">
          Actionable tasks, reviews, and sprint commitments assigned to you across {workspace.name}.
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E6] shadow-card">
          <span className="text-[11px] font-bold text-[#778079] uppercase">Active Assigned</span>
          <div className="text-2xl font-extrabold text-[#18251D] mt-1">{assignedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E6] shadow-card">
          <span className="text-[11px] font-bold text-rose-600 uppercase">Overdue</span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{overdueCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E6] shadow-card">
          <span className="text-[11px] font-bold text-purple-600 uppercase">In Review</span>
          <div className="text-2xl font-extrabold text-purple-700 mt-1">{inReviewCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E6] shadow-card">
          <span className="text-[11px] font-bold text-[#064E24] uppercase">Completed</span>
          <div className="text-2xl font-extrabold text-[#064E24] mt-1">{completedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'all'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          All Active ({assignedCount})
        </button>

        <button
          onClick={() => setFilterTab('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'today'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          Due Today
        </button>

        <button
          onClick={() => setFilterTab('overdue')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'overdue'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          Overdue ({overdueCount})
        </button>

        <button
          onClick={() => setFilterTab('review')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'review'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          In Review ({inReviewCount})
        </button>

        <button
          onClick={() => setFilterTab('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'completed'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Deliverables List */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card divide-y divide-[#E5E9E6] overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E9FBEA] text-[#064E24] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#20E34A]" />
            </div>
            <h3 className="text-sm font-bold text-[#18251D]">No deliverables found</h3>
            <p className="text-xs text-[#778079]">
              You have no active deliverables matching this filter view.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-4 hover:bg-[#F7F8F8] transition-colors cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onClick={(e) => handleToggleComplete(e, task)}
                    className="w-4 h-4 rounded text-[#20E34A] focus:ring-[#20E34A] cursor-pointer"
                  />

                  <span className="font-mono text-xs font-bold bg-[#082F1B] text-[#20E34A] px-2 py-0.5 rounded-md shrink-0">
                    {task.projectKey}-{task.taskNumber}
                  </span>

                  <span
                    className={`text-xs font-semibold truncate ${
                      isCompleted ? 'line-through text-[#778079]' : 'text-[#18251D]'
                    }`}
                  >
                    {task.title}
                  </span>

                  {task.reviewRequired && (
                    <span className="p-1 rounded bg-[#E9FBEA] text-[#064E24]" title="Review Gate">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#20E34A]" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {getPriorityBadge(task.priority)}

                  {task.dueDate && (
                    <span
                      className={`flex items-center gap-1 text-[11px] font-mono ${
                        isOverdue ? 'text-rose-600 font-bold' : 'text-[#778079]'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#CBD3CE]" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </span>
                  )}

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F0F1F3] text-[#5E6962]">
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={() => loadData()}
      />
    </div>
  );
}
