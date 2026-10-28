'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Briefcase, Calendar, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sampleProjects, sampleUsers } from '@/lib/mockData';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (item: any) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [type, setType] = useState<'task' | 'project'>('task');
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(sampleProjects[0].id);
  const [priority, setPriority] = useState('medium');
  const [reviewRequired, setReviewRequired] = useState(true);
  const [assigneeId, setAssigneeId] = useState(sampleUsers[2].id);
  const [dueDate, setDueDate] = useState('2026-11-05');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Show temporary feedback toast / alert
    alert(`Success: ${type === 'task' ? 'Task' : 'Project'} "${title}" created.`);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-[#E5E9E6] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E6]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setType('task')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === 'task'
                  ? 'bg-[#082F1B] text-white shadow-xs'
                  : 'text-[#5E6962] hover:bg-[#F0F1F3]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#20E34A]" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => setType('project')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === 'project'
                  ? 'bg-[#082F1B] text-white shadow-xs'
                  : 'text-[#5E6962] hover:bg-[#F0F1F3]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-[#20E34A]" />
              <span>New Project</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#F0F1F3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              {type === 'task' ? 'Task Title' : 'Project Name'} *
            </label>
            <Input
              required
              placeholder={type === 'task' ? 'e.g. Implement user permission matrix' : 'e.g. Client Portal v2'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {type === 'task' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Target Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E5E9E6] bg-white px-3 text-xs text-[#18251D] focus:outline-none focus:border-[#20E34A]"
                  >
                    {sampleProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E5E9E6] bg-white px-3 text-xs text-[#18251D] focus:outline-none focus:border-[#20E34A]"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E5E9E6] bg-white px-3 text-xs text-[#18251D] focus:outline-none focus:border-[#20E34A]"
                  >
                    {sampleUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Approval Enforcement Toggle */}
              <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#18251D]">
                    Require Review for Completion
                  </div>
                  <div className="text-[11px] text-[#778079]">
                    Task cannot be marked completed without manager approval.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reviewRequired}
                  onChange={(e) => setReviewRequired(e.target.checked)}
                  className="w-4 h-4 text-[#082F1B] accent-[#20E34A] rounded"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E9E6]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create {type === 'task' ? 'Task' : 'Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

