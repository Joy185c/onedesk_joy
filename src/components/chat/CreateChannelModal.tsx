'use client';

import React, { useState } from 'react';
import { X, Hash, Lock, FolderKanban, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChannelType, ProjectSummary } from '@/lib/types';
import { createChannel } from '@/lib/services/collaborationService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CreateChannelModalProps {
  isOpen: boolean;
  projects: ProjectSummary[];
  onClose: () => void;
  onChannelCreated?: (newChannel: any) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  projects,
  onClose,
  onChannelCreated,
}) => {
  const { workspace } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChannelType>('public');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const channel = await createChannel({
        workspaceId: workspace.id,
        projectId: selectedProjectId || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        type,
      });

      if (onChannelCreated) {
        onChannelCreated(channel);
      }
      onClose();
      setName('');
      setDescription('');
      setSelectedProjectId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create channel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E6] bg-[#F7F8F8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E9FBEA] text-[#064E24]">
              <Hash className="w-5 h-5 text-[#20E34A]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#18251D]">Create New Channel</h2>
              <p className="text-xs text-[#778079]">Workspace: {workspace.name}</p>
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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Channel Name *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#778079]">#</span>
              <Input
                type="text"
                required
                placeholder="e.g. frontend-sync"
                className="pl-7"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9_-]/g, '')
                  )
                }
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Description / Topic
            </label>
            <textarea
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A] placeholder:text-[#778079]"
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Attach to Project (Optional)
            </label>
            <select
              className="w-full h-10 px-3 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs font-medium text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A]"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">None (Workspace-wide channel)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[#778079] block mt-1">
              Project channels are automatically isolated to permitted project members.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('public')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  type === 'public'
                    ? 'border-[#20E34A] bg-[#E9FBEA]/60 shadow-2xs'
                    : 'border-[#CBD3CE] bg-[#F7F8F8] hover:bg-white'
                }`}
              >
                <Hash className="w-4 h-4 text-[#064E24] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#18251D]">Public</div>
                  <div className="text-[10px] text-[#778079]">
                    Anyone in workspace / project can join
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('private')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  type === 'private'
                    ? 'border-[#20E34A] bg-[#E9FBEA]/60 shadow-2xs'
                    : 'border-[#CBD3CE] bg-[#F7F8F8] hover:bg-white'
                }`}
              >
                <Lock className="w-4 h-4 text-[#064E24] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#18251D]">Private</div>
                  <div className="text-[10px] text-[#778079]">
                    By invitation or membership only
                  </div>
                </div>
              </button>
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
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

