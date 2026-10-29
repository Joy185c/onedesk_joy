'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, AlertCircle, ShieldCheck, Clock, User, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import { TaskPriority, UserProfile } from '@/lib/types';
import { createTask, getWorkspaceMembers } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CreateTaskModalProps {
  isOpen: boolean;
  projectId: string;
  projectKey: string;
  projectName: string;
  onClose: () => void;
  onTaskCreated?: (newTask: any) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  projectId,
  projectKey,
  projectName,
  onClose,
  onTaskCreated,
}) => {
  const { workspace, user } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [reviewRequired, setReviewRequired] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && workspace.id) {
      getWorkspaceMembers(workspace.id).then((m) => {
        setMembers(m);
        // Default to assigning to current user if available
        if (user.id && m.some((u) => u.id === user.id) && assigneeIds.length === 0) {
          setAssigneeIds([user.id]);
        }
      });
    }
  }, [isOpen, workspace.id, user.id]);

  if (!isOpen) return null;

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAssignToMe = () => {
    if (user.id && !assigneeIds.includes(user.id)) {
      setAssigneeIds((prev) => [...prev, user.id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const newTask = await createTask({
        workspaceId: workspace.id,
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        reviewRequired,
        assigneeIds,
      });

      if (onTaskCreated) {
        onTaskCreated(newTask);
      }
      onClose();
      setTitle('');
      setDescription('');
      setAssigneeIds([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E6] bg-[#F7F8F8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E9FBEA] text-[#064E24]">
              <CheckSquare className="w-5 h-5 text-[#20E34A]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#18251D]">Create New Task</h2>
              <p className="text-xs text-[#778079]">
                Project: <span className="font-semibold text-[#18251D]">{projectName}</span> ({projectKey})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#E5E9E6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Task Title *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Implement OAuth callback flow and token storage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Description & Acceptance Criteria
            </label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A] focus:border-transparent transition-all placeholder:text-[#778079]"
              placeholder="Specify requirements, links, or testing criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Priority
              </label>
              <select
                className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Due Date
              </label>
              <Input
                type="date"
                icon={<Calendar className="w-4 h-4" />}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Est. Hours
              </label>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g. 4.0"
                icon={<Clock className="w-4 h-4" />}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          {/* Assignees Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#18251D] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#064E24]" />
                <span>Assignee(s)</span>
              </label>
              {user.id && !assigneeIds.includes(user.id) && (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="text-[11px] font-semibold text-[#064E24] hover:text-[#20E34A] flex items-center gap-1 transition-colors"
                >
                  <User className="w-3 h-3" />
                  <span>Assign to Me</span>
                </button>
              )}
            </div>

            {/* Selected Members Badges */}
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {assigneeIds.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  const name = m?.name || 'Member';
                  const initials = m?.initials || 'TM';
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E9FBEA] border border-[#C6F5CB] text-xs font-semibold text-[#064E24]"
                    >
                      <UserAvatar user={m} size="xs" />
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(id)}
                        className="hover:text-rose-600 transition-colors ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Member Dropdown Picker */}
            <select
              className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  toggleAssignee(e.target.value);
                }
              }}
            >
              <option value="">+ Assign team member...</option>
              {members.map((m) => {
                const isAssigned = assigneeIds.includes(m.id);
                return (
                  <option key={m.id} value={m.id} disabled={isAssigned}>
                    {m.name} ({m.role}) {isAssigned ? '✓ Assigned' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Review Gate Checkbox */}
          <div className="p-3 rounded-xl bg-[#E9FBEA]/60 border border-[#C6F5CB] flex items-start gap-2.5">
            <input
              type="checkbox"
              id="reviewRequired"
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
              className="mt-0.5 rounded text-[#20E34A] focus:ring-[#20E34A]"
            />
            <label htmlFor="reviewRequired" className="text-xs text-[#064E24] cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#20E34A]" />
                Require Review Approval Gate
              </span>
              <span className="text-[11px] text-[#5E6962] block mt-0.5">
                Task cannot be marked as Completed without explicit Lead or Manager sign-off.
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-[#E5E9E6] flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !title.trim()}
              className="font-bold flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

