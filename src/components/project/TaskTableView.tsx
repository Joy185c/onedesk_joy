'use client';

import React from 'react';
import { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  onTaskClick,
  onAddTask,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E9E6] bg-[#F7F8F8] text-[11px] font-bold uppercase tracking-wider text-[#778079]">
              <th className="py-3 px-4 w-28">Task ID</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4 w-36">Status</th>
              <th className="py-3 px-4 w-28">Priority</th>
              <th className="py-3 px-4 w-32">Due Date</th>
              <th className="py-3 px-4 w-24">Subtasks</th>
              <th className="py-3 px-4 w-28">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E9E6] text-xs">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-[#778079]">
                  No tasks to display. Click &quot;Add Task&quot; to begin.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="hover:bg-[#F7F8F8] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#5E6962]">
                    {task.projectKey}-{task.taskNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#18251D] group-hover:text-[#064E24] max-w-xs truncate">
                    {task.title}
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F1F3] text-[#5E6962]">
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize font-medium text-[#5E6962]">
                    {task.priority}
                  </td>
                  <td className="py-3 px-4 text-[#778079]">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#778079]">
                    {task.subtaskCount > 0 ? `${task.completedSubtasks}/${task.subtaskCount}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-[#18251D]">
                    {task.assignees[0]?.name.split(' ')[0] || 'Unassigned'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

