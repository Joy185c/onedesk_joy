'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  ThumbsUp,
  RotateCcw,
  Users,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, UserProfile, TaskComment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import {
  updateTaskStatus,
  updateTaskPriority,
  addSubtask,
  toggleSubtask,
  submitTaskForReview,
  decideReview,
  assignUserToTask,
  unassignUserFromTask,
  getWorkspaceMembers,
} from '@/lib/services/taskService';
import { getTaskComments, addTaskComment } from '@/lib/services/collaborationService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TaskDetailDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  const { workspace } = useWorkspace();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskAssignees, setTaskAssignees] = useState<UserProfile[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (task?.assignees) {
      setTaskAssignees(task.assignees);
    } else {
      setTaskAssignees([]);
    }
  }, [task?.id, task?.assignees]);

  useEffect(() => {
    if (isOpen && workspace.id) {
      getWorkspaceMembers(workspace.id).then(setWorkspaceMembers);
    }
  }, [isOpen, workspace.id]);

  useEffect(() => {
    if (isOpen && task?.id) {
      getTaskComments(task.id).then(setComments);
    }
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !task) return;

    setSubmittingComment(true);
    try {
      const newComment = await addTaskComment({
        taskId: task.id,
        content: commentText.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddAssignee = async (userId: string) => {
    const member = workspaceMembers.find((m) => m.id === userId);
    if (!member) return;

    // Optimistic update
    const prev = [...taskAssignees];
    setTaskAssignees([...prev, member]);

    try {
      await assignUserToTask(task.id, userId);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setTaskAssignees(prev);
      alert(err.message || 'Failed to assign member');
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    const prev = [...taskAssignees];
    setTaskAssignees(prev.filter((a) => a.id !== userId));

    try {
      await unassignUserFromTask(task.id, userId);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setTaskAssignees(prev);
      alert(err.message || 'Failed to unassign member');
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(task.id, newStatus);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    try {
      await updateTaskPriority(task.id, newPriority);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      await addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentVal: boolean) => {
    try {
      await toggleSubtask(subtaskId, !currentVal);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle subtask');
    }
  };

  const handleSubmitReview = async () => {
    setLoading(true);
    try {
      await submitTaskForReview(task.id, reviewNote);
      setReviewNote('');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'changes_requested') => {
    setLoading(true);
    try {
      // Direct status resolution via state machine
      const nextStatus: TaskStatus = decision === 'approved' ? 'completed' : 'in_progress';
      await updateTaskStatus(task.id, nextStatus);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to submit decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[#E5E9E6] animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 px-6 border-b border-[#E5E9E6] flex items-center justify-between bg-[#F7F8F8]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#5E6962] bg-[#E5E9E6] px-2 py-0.5 rounded-md">
              {task.projectKey}-{task.taskNumber}
            </span>
            <span className="text-xs text-[#778079]">· {task.projectName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#E5E9E6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-lg font-extrabold text-[#18251D] leading-snug">
              {task.title}
            </h2>
          </div>

          {/* Quick Properties Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6]">
            <div>
              <span className="block text-[10px] font-semibold text-[#778079] uppercase">
                Status
              </span>
              <select
                className="mt-1 w-full text-xs font-bold bg-white border border-[#CBD3CE] rounded-lg p-1.5 text-[#18251D] focus:ring-1 focus:ring-[#20E34A]"
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="ready_for_review">Ready for Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <span className="block text-[10px] font-semibold text-[#778079] uppercase">
                Priority
              </span>
              <select
                className="mt-1 w-full text-xs font-bold bg-white border border-[#CBD3CE] rounded-lg p-1.5 text-[#18251D] focus:ring-1 focus:ring-[#20E34A]"
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <span className="block text-[10px] font-semibold text-[#778079] uppercase">
                Due Date
              </span>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[#18251D] p-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#778079]" />
                <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
              </div>
            </div>
          </div>

          {/* Assignees Section */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#778079] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#064E24]" />
                <span>Assigned Deliverable Owners ({taskAssignees.length})</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {taskAssignees.length === 0 ? (
                <span className="text-xs text-[#778079] italic">No members assigned yet.</span>
              ) : (
                taskAssignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-white border border-[#CBD3CE] text-xs font-semibold text-[#18251D] shadow-2xs group"
                  >
                    <UserAvatar user={assignee} size="xs" />
                    <span>{assignee.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(assignee.id)}
                      className="text-[#778079] hover:text-rose-600 transition-colors p-0.5 rounded"
                      title={`Remove ${assignee.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              {/* Assign Member Dropdown */}
              <div className="relative">
                <select
                  className="h-8 px-2.5 rounded-xl border border-[#CBD3CE] bg-white text-xs font-semibold text-[#064E24] hover:border-[#20E34A] focus:outline-none focus:ring-1 focus:ring-[#20E34A] cursor-pointer"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddAssignee(e.target.value);
                    }
                  }}
                >
                  <option value="">+ Assign Member</option>
                  {workspaceMembers
                    .filter((m) => !taskAssignees.some((a) => a.id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Review Gate Notice / Actions */}
          {task.reviewRequired && (
            <div className="p-4 rounded-xl bg-[#E9FBEA] border border-[#C6F5CB] space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#064E24]" />
                <h4 className="text-xs font-bold text-[#064E24]">
                  Review & Sign-Off Gate Active
                </h4>
              </div>
              <p className="text-xs text-[#5E6962] leading-relaxed">
                This deliverable requires lead verification before it can be marked as completed.
              </p>

              {task.status === 'in_progress' && (
                <div className="pt-2">
                  <Button
                    onClick={handleSubmitReview}
                    variant="primary"
                    size="sm"
                    className="w-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    disabled={loading}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Manager Review</span>
                  </Button>
                </div>
              )}

              {task.status === 'ready_for_review' && (
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    onClick={() => handleDecision('approved')}
                    variant="primary"
                    size="sm"
                    className="flex-1 text-xs font-bold flex items-center justify-center gap-1"
                    disabled={loading}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Approve & Complete</span>
                  </Button>
                  <Button
                    onClick={() => handleDecision('changes_requested')}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-1"
                    disabled={loading}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request Changes</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-[#18251D] mb-1.5 uppercase tracking-wider">
              Description
            </h4>
            <div className="p-3 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] text-xs text-[#5E6962] leading-relaxed min-h-[80px]">
              {task.description || 'No description provided.'}
            </div>
          </div>

          {/* Subtasks & Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#18251D] uppercase tracking-wider">
                Checklist & Subtasks
              </h4>
              <span className="text-xs text-[#778079] font-mono">
                {task.completedSubtasks}/{task.subtaskCount} Done
              </span>
            </div>

            {/* Subtask Add Form */}
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <Input
                type="text"
                placeholder="Add checklist item or subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" variant="outline" size="sm" className="shrink-0 font-bold">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Discussion & Comments */}
          <div className="space-y-3 pt-3 border-t border-[#E5E9E6]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#18251D] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#064E24]" />
                <span>Discussion ({comments.length})</span>
              </h4>
            </div>

            {/* Comments List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-[11px] text-[#778079] italic p-3 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] text-center">
                  No comments yet. Start the conversation about this deliverable.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={c.author} size="xs" />
                        <span className="text-xs font-bold text-[#18251D]">{c.author.name}</span>
                      </div>
                      <span className="text-[10px] text-[#778079]">
                        {new Date(c.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-[#5E6962] leading-relaxed pl-7">
                      {c.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Post Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input
                type="text"
                placeholder="Write a comment or update..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!commentText.trim() || submittingComment}
                className="shrink-0 font-bold flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 px-6 border-t border-[#E5E9E6] bg-[#F7F8F8] flex items-center justify-between">
          <span className="text-[11px] text-[#778079]">
            Tenant: <span className="font-mono">{task.projectKey}</span>
          </span>
          <Button variant="default" size="sm" onClick={onClose} className="font-semibold text-xs">
            Close Panel
          </Button>
        </div>
      </div>
    </div>
  );
};

