'use client';

import React from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  CheckSquare,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask: () => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
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

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">To Do</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>;
      case 'ready_for_review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Review Gate</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'blocked':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Blocked</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card overflow-hidden">
      {tasks.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E9FBEA] text-[#064E24] flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6 text-[#20E34A]" />
          </div>
          <h3 className="text-base font-bold text-[#18251D]">No Tasks in this Project Yet</h3>
          <p className="text-xs text-[#778079] max-w-sm mx-auto">
            Break down this project into actionable deliverables, assign team members, and track delivery progress.
          </p>
          <button
            onClick={onAddTask}
            className="mt-2 px-4 py-2 bg-[#082F1B] hover:bg-[#12452C] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            + Create First Task
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E9E6]">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              !isCompleted;

            return (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="p-3.5 sm:px-6 hover:bg-[#F7F8F8] transition-colors cursor-pointer flex items-center justify-between gap-4 group"
              >
                {/* Left: Checkbox + Key + Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => {
                      e.stopPropagation();
                      onStatusChange(task.id, isCompleted ? 'todo' : 'completed');
                    }}
                    className="w-4 h-4 rounded text-[#20E34A] focus:ring-[#20E34A] cursor-pointer"
                  />

                  <span className="font-mono text-xs font-bold text-[#5E6962] shrink-0">
                    {task.projectKey}-{task.taskNumber}
                  </span>

                  <span
                    className={`text-xs font-semibold truncate ${
                      isCompleted ? 'line-through text-[#778079]' : 'text-[#18251D] group-hover:text-[#064E24]'
                    }`}
                  >
                    {task.title}
                  </span>

                  {task.reviewRequired && (
                    <span
                      className="p-1 rounded bg-[#E9FBEA] text-[#064E24] shrink-0"
                      title="Review Gate Active"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#20E34A]" />
                    </span>
                  )}
                </div>

                {/* Right: Meta (Status, Priority, Due Date, Assignees) */}
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}

                  {task.dueDate && (
                    <span
                      className={`hidden md:inline-flex items-center gap-1 text-[11px] ${
                        isOverdue ? 'text-rose-600 font-bold' : 'text-[#778079]'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </span>
                  )}

                  {/* Assignees */}
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    {task.assignees.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="w-6 h-6 rounded-full bg-[#12452C] text-white flex items-center justify-center font-bold text-[9px] border-2 border-white"
                        title={a.name}
                      >
                        {a.initials}
                      </div>
                    ))}
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#CBD3CE] group-hover:text-[#18251D] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

