'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Filter,
  Search,
  Plus,
  Calendar,
  ShieldCheck,
  FolderKanban,
  Columns3,
  List as ListIcon,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskDetailDrawer } from '@/components/task/TaskDetailDrawer';
import { Task, ProjectSummary, TaskStatus, TaskPriority } from '@/lib/types';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { getProjectTasks, updateTaskStatus } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { sampleTasks } from '@/lib/mockData';

export default function AllTasksPage() {
  const { workspace, isDemoMode } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!workspace.id) return;
    try {
      if (isDemoMode) {
        setTasks(sampleTasks);
      } else {
        const projs = await getWorkspaceProjects(workspace.id);
        setProjects(projs);
        const taskPromises = projs.map((p) => getProjectTasks(p.id));
        const allTasks = (await Promise.all(taskPromises)).flat();
        setTasks(allTasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id, isDemoMode]);

  const handleToggleTask = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const nextStatus: TaskStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    try {
      await updateTaskStatus(task.id, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.projectKey.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              Cross-Project Task Engine
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            All Deliverables
          </h1>
          <p className="text-xs text-[#778079] mt-0.5">
            Consolidated task directory across all authorized delivery projects in {workspace.name}.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#778079]" />
            <input
              type="text"
              placeholder="Search all tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-[#CBD3CE] rounded-xl text-xs text-[#18251D] focus:outline-none focus:ring-1 focus:ring-[#20E34A] w-48 shadow-2xs"
            />
          </div>

          <select
            className="h-9 px-3 rounded-xl border border-[#CBD3CE] bg-white text-xs font-semibold text-[#18251D] focus:ring-1 focus:ring-[#20E34A] shadow-2xs"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          <select
            className="h-9 px-3 rounded-xl border border-[#CBD3CE] bg-white text-xs font-semibold text-[#18251D] focus:ring-1 focus:ring-[#20E34A] shadow-2xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="ready_for_review">Ready for Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E9E6] bg-[#F7F8F8] text-[11px] font-bold uppercase tracking-wider text-[#778079]">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 w-32">Task ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 w-32">Project</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 w-28">Priority</th>
                <th className="py-3 px-4 w-32">Due Date</th>
                <th className="py-3 px-4 w-28">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E6]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#778079]">
                    No deliverables found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-[#F7F8F8] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onClick={(e) => handleToggleTask(e, task)}
                          className="w-4 h-4 rounded text-[#20E34A] focus:ring-[#20E34A] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#082F1B]">
                        <span className="px-2 py-0.5 rounded-md bg-[#E9FBEA] text-[#064E24]">
                          {task.projectKey}-{task.taskNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#18251D] group-hover:text-[#064E24]">
                        <div className="flex items-center gap-1.5 max-w-sm truncate">
                          <span className={isCompleted ? 'line-through text-[#778079]' : ''}>
                            {task.title}
                          </span>
                          {task.reviewRequired && (
                            <span className="p-0.5 rounded bg-[#E9FBEA] text-[#064E24]" title="Review Gate">
                              <ShieldCheck className="w-3 h-3 text-[#20E34A]" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#5E6962] font-medium truncate max-w-[120px]">
                        {task.projectName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F1F3] text-[#5E6962] uppercase">
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getPriorityBadge(task.priority)}</td>
                      <td className="py-3 px-4 text-[#778079] font-mono">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-[#18251D]">
                        {task.assignees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-[#082F1B] text-white flex items-center justify-center font-bold text-[8px]">
                              {task.assignees[0].initials}
                            </span>
                            <span className="truncate max-w-[80px]">
                              {task.assignees[0].name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8E9891] italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={() => loadData()}
      />
    </div>
  );
}
