'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  CheckSquare,
  Briefcase,
  FileText,
  User,
  ArrowRight,
  X,
  Plus,
} from 'lucide-react';
import { sampleProjects, sampleTasks, sampleUsers } from '@/lib/mockData';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickCreate: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenQuickCreate,
}) => {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { workspace } = useWorkspace();

  // Keyboard shortcut listener for Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProjects = sampleProjects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.key.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTasks = sampleTasks.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    `${t.projectKey}-${t.taskNumber}`.toLowerCase().includes(query.toLowerCase())
  );

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-modal border border-[#E5E9E6] overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-[#E5E9E6]">
          <Search className="w-5 h-5 text-[#778079] shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, search projects, or jump to task..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-14 bg-transparent text-sm text-[#18251D] placeholder:text-[#8E9891] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#778079] hover:text-[#18251D]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
              Quick Actions
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenQuickCreate();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18251D] hover:bg-[#F0F1F3] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#E9FBEA] text-[#064E24] flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Create New Task</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8E9891] group-hover:text-[#18251D]" />
            </button>
          </div>

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
                Projects
              </div>
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigateTo(`/w/${workspace.slug}/projects/${p.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18251D] hover:bg-[#F0F1F3] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-6 h-6 rounded-lg bg-[#06351F] text-[#20E34A] flex items-center justify-center font-bold text-[10px]">
                      {p.key}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-[#778079]">{p.completedTasks}/{p.totalTasks} done</span>
                </button>
              ))}
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
                Tasks
              </div>
              {filteredTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigateTo(`/w/${workspace.slug}/projects/${t.projectId}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18251D] hover:bg-[#F0F1F3] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CheckSquare className="w-4 h-4 text-[#778079] shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-[#5E6962] shrink-0">
                      {t.projectKey}-{t.taskNumber}
                    </span>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded-full bg-[#E5E9E6] text-[#5E6962] shrink-0">
                    {t.status.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && filteredTasks.length === 0 && (
            <div className="p-8 text-center text-xs text-[#778079]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#F7F8F8] border-t border-[#E5E9E6] text-[11px] text-[#778079]">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">↓</kbd>
            <span>Select:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">↵</kbd>
          </div>
          <div>
            <span>Close:</span> <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

