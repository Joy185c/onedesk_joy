'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, CheckSquare, Briefcase, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createProject, getWorkspaceProjects } from '@/lib/services/projectService';
import { createTask } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { TaskPriority } from '@/lib/types';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (item: any) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const router = useRouter();
  const { workspace, isDemoMode } = useWorkspace();

  const [type, setType] = useState<'task' | 'project'>('task');
  const [title, setTitle] = useState('');
  const [availableProjects, setAvailableProjects] = useState<{ id: string; key: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [reviewRequired, setReviewRequired] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      if (workspace.id) {
        const projs = await getWorkspaceProjects(workspace.id);
        if (projs.length > 0) {
          setAvailableProjects(projs);
          setSelectedProjectId(projs[0].id);
        } else {
          setAvailableProjects([]);
          setType('project'); // Default to project if no projects exist
        }
      }
    }
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, workspace.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      if (type === 'project') {
        const key = title
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4) || 'PRJ';

        const newProj = await createProject({
          workspaceId: workspace.id,
          name: title.trim(),
          key,
        });

        if (onCreated) onCreated(newProj);
        onClose();
        router.push(`/w/${workspace.slug}/projects/${newProj.id}`);
      } else {
        if (!selectedProjectId) {
          throw new Error('Please select a project or create one first.');
        }

        const newTask = await createTask({
          workspaceId: workspace.id,
          projectId: selectedProjectId,
          title: title.trim(),
          priority,
          dueDate: dueDate || undefined,
          reviewRequired,
        });

        if (onCreated) onCreated(newTask);
        onClose();
        window.location.reload();
      }
      setTitle('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-[#E5E9E6] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E6] bg-[#F7F8F8]">
          <div className="flex items-center gap-2">
            <button
              type="button"
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
              type="button"
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
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#F0F1F3]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                    Target Project *
                  </label>
                  {availableProjects.length > 0 ? (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] px-3 text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                    >
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.key}] {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-rose-600 p-2 bg-rose-50 rounded-xl border border-rose-200">
                      No projects found. Please switch tab to &quot;New Project&quot; first.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] px-3 text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
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

              {/* Approval Enforcement Toggle */}
              <div className="p-3 rounded-xl bg-[#E9FBEA]/60 border border-[#C6F5CB] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#064E24]">
                    Require Review for Completion
                  </div>
                  <div className="text-[11px] text-[#5E6962]">
                    Task cannot be marked completed without manager approval.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reviewRequired}
                  onChange={(e) => setReviewRequired(e.target.checked)}
                  className="w-4 h-4 text-[#082F1B] accent-[#20E34A] rounded cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E9E6]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : `Create ${type === 'task' ? 'Task' : 'Project'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
