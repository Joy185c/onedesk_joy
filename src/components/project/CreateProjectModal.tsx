'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, FolderPlus, Calendar, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createProject } from '@/lib/services/projectService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (newProject: any) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const router = useRouter();
  const { workspace } = useWorkspace();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [visibility, setVisibility] = useState<'public_in_workspace' | 'private'>('public_in_workspace');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!key || key.length <= 4) {
      const generated = val
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4);
      setKey(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const cleanKey = (key.trim() || name.substring(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '');

      const project = await createProject({
        workspaceId: workspace.id,
        name: name.trim(),
        key: cleanKey,
        description,
        targetDate: targetDate || undefined,
        visibility,
      });

      if (onProjectCreated) {
        onProjectCreated(project);
      }

      onClose();
      router.push(`/w/${workspace.slug}/projects/${project.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create project.');
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
              <FolderPlus className="w-5 h-5 text-[#20E34A]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#18251D]">Create New Project</h2>
              <p className="text-xs text-[#778079]">
                Workspace: <span className="font-semibold text-[#064E24]">{workspace.name}</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Project Name *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Mobile App Redesign"
                value={name}
                onChange={handleNameChange}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Key (Prefix) *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. MOB"
                maxLength={6}
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Description / Delivery Scope
            </label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A] focus:border-transparent transition-all placeholder:text-[#778079]"
              placeholder="Outline project objectives, key milestones, and team deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Target Delivery Date
              </label>
              <Input
                type="date"
                icon={<Calendar className="w-4 h-4" />}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Project Visibility
              </label>
              <select
                className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
                value={visibility}
                onChange={(e: any) => setVisibility(e.target.value)}
              >
                <option value="public_in_workspace">Public to Workspace Members</option>
                <option value="private">Private (Assigned Members Only)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E9E6] flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !name.trim()}
              className="font-bold flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

