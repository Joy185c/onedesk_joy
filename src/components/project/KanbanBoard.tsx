'use client';

import React from 'react';
import {
  Plus,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  CheckSquare,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask: (status?: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-100 text-slate-700', dotColor: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-700', dotColor: 'bg-blue-500' },
  { id: 'ready_for_review', label: 'Ready for Review', color: 'bg-amber-50 text-amber-700', dotColor: 'bg-amber-500' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-50 text-emerald-700', dotColor: 'bg-[#20E34A]' },
  { id: 'blocked', label: 'Blocked', color: 'bg-rose-50 text-rose-700', dotColor: 'bg-rose-500' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  onAddTask,
}) => {
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

  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'todo':
        return 'in_progress';
      case 'in_progress':
        return 'ready_for_review';
      case 'ready_for_review':
        return 'completed';
      case 'blocked':
        return 'in_progress';
      default:
        return null;
    }
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'in_progress':
        return 'todo';
      case 'ready_for_review':
        return 'in_progress';
      case 'completed':
        return 'ready_for_review';
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 select-none">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className="w-80 shrink-0 bg-[#F7F8F8] border border-[#E5E9E6] rounded-2xl flex flex-col max-h-[calc(100vh-220px)] shadow-2xs"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-[#E5E9E6] flex items-center justify-between bg-white/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                <span className="text-xs font-bold text-[#18251D] tracking-tight">
                  {col.label}
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#F0F1F3] text-[#5E6962]">
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => onAddTask(col.id)}
                className="p-1 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#F0F1F3] transition-colors"
                title={`Add task to ${col.label}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Task Cards Column */}
            <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
              {columnTasks.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-[#E5E9E6] rounded-xl text-xs text-[#778079]">
                  No tasks in {col.label.toLowerCase()}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== 'completed';

                  const prev = getPrevStatus(task.status);
                  const next = getNextStatus(task.status);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="group bg-white p-3.5 rounded-xl border border-[#E5E9E6] hover:border-[#CBD3CE] shadow-2xs hover:shadow-card transition-all cursor-pointer space-y-2.5"
                    >
                      {/* Top Meta: Key, Priority, Review Shield */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-mono font-bold text-[#5E6962]">
                          {task.projectKey}-{task.taskNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.reviewRequired && (
                            <span
                              className="p-1 rounded bg-[#E9FBEA] text-[#064E24]"
                              title="Review sign-off required"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-[#20E34A]" />
                            </span>
                          )}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-[#18251D] group-hover:text-[#064E24] transition-colors line-clamp-2 leading-relaxed">
                        {task.title}
                      </h4>

                      {/* Subtasks and Due Date */}
                      <div className="flex items-center justify-between text-[11px] text-[#778079] pt-1 border-t border-[#F0F1F3]">
                        <div className="flex items-center gap-2">
                          {task.subtaskCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px]">
                              <CheckSquare className="w-3 h-3 text-[#5E6962]" />
                              <span>
                                {task.completedSubtasks}/{task.subtaskCount}
                              </span>
                            </span>
                          )}

                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 text-[10px] ${
                                isOverdue ? 'font-bold text-rose-600' : ''
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )}
                        </div>

                        {/* Assignees */}
                        <div className="flex items-center -space-x-1">
                          {task.assignees.slice(0, 3).map((a) => (
                            <UserAvatar
                              key={a.id}
                              user={a}
                              size="xs"
                              className="ring-1 ring-white"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Quick Move Step Controls (visible on hover) */}
                      <div
                        className="pt-1 flex items-center justify-between border-t border-[#F0F1F3] opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {prev ? (
                          <button
                            onClick={() => onStatusChange(task.id, prev)}
                            className="p-1 rounded-md text-[#778079] hover:text-[#18251D] hover:bg-[#F0F1F3] text-[10px] flex items-center gap-0.5"
                            title={`Move back to ${prev.replace(/_/g, ' ')}`}
                          >
                            <ChevronLeft className="w-3 h-3" />
                            <span>Back</span>
                          </button>
                        ) : <div />}

                        {next && (
                          <button
                            onClick={() => onStatusChange(task.id, next)}
                            className="p-1 rounded-md text-[#064E24] hover:bg-[#E9FBEA] font-bold text-[10px] flex items-center gap-0.5"
                            title={`Move to ${next.replace(/_/g, ' ')}`}
                          >
                            <span>Advance</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Add Task Button */}
            <div className="p-2 border-t border-[#E5E9E6] bg-white/50 rounded-b-2xl">
              <button
                onClick={() => onAddTask(col.id)}
                className="w-full py-1.5 rounded-xl border border-transparent hover:border-[#CBD3CE] text-xs font-semibold text-[#5E6962] hover:text-[#18251D] hover:bg-white flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

