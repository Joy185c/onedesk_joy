'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  CheckSquare,
  Briefcase,
  FileText,
  Loader2,
  ArrowRight,
  X,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickCreate: () => void;
}

interface SearchProject {
  id: string;
  key: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
}

interface SearchTask {
  id: string;
  taskNumber: number;
  title: string;
  status: string;
  projectId: string;
  projectKey: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenQuickCreate,
}) => {
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<SearchProject[]>([]);
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { workspace, isDemoMode } = useWorkspace();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setProjects([]);
      setTasks([]);
    }
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search using real Supabase data
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !workspace.id) {
        setProjects([]);
        setTasks([]);
        return;
      }

      setIsSearching(true);

      try {
        const supabase = createClient();
        const q = `%${searchQuery}%`;

        // Run project and task searches in parallel
        const [projectsResult, tasksResult] = await Promise.all([
          supabase
            .from('projects')
            .select('id, key, name, tasks:tasks(id, status)')
            .eq('workspace_id', workspace.id)
            .or(`name.ilike.${q},key.ilike.${q}`)
            .limit(5),
          supabase
            .from('tasks')
            .select('id, task_number, title, status, project_id, project:projects(key)')
            .eq('workspace_id', workspace.id)
            .ilike('title', q)
            .limit(8),
        ]);

        setProjects(
          (projectsResult.data || []).map((p: any) => {
            const allTasks = p.tasks || [];
            return {
              id: p.id,
              key: p.key,
              name: p.name,
              completedTasks: allTasks.filter((t: any) => t.status === 'completed').length,
              totalTasks: allTasks.length,
            };
          })
        );

        setTasks(
          (tasksResult.data || []).map((t: any) => ({
            id: t.id,
            taskNumber: t.task_number,
            title: t.title,
            status: t.status,
            projectId: t.project_id,
            projectKey: t.project?.key || 'PRJ',
          }))
        );
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [workspace.id]
  );

  // Debounce input changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setProjects([]);
      setTasks([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  if (!isOpen) return null;

  const hasResults = projects.length > 0 || tasks.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E9E6] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-[#E5E9E6]">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-[#20E34A] shrink-0 mr-3 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-[#778079] shrink-0 mr-3" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, or type a command..."
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
          {/* Quick Actions — always shown */}
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
          {projects.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
                Projects
              </div>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigateTo(`/w/${workspace.slug}/projects/${p.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#18251D] hover:bg-[#F0F1F3] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-6 h-6 rounded-lg bg-[#06351F] text-[#20E34A] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {p.key}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="text-[10px] text-[#778079] shrink-0 ml-2">
                    {p.completedTasks}/{p.totalTasks} done
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
                Tasks
              </div>
              {tasks.map((t) => (
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
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query.trim() && !isSearching && !hasResults && (
            <div className="p-8 text-center text-xs text-[#778079]">
              <Briefcase className="w-8 h-8 text-[#CBD3CE] mx-auto mb-2" />
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Empty state (no query typed yet) */}
          {!query && (
            <div className="px-3 py-4 text-center text-xs text-[#8E9891]">
              Start typing to search across your workspace...
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#F7F8F8] border-t border-[#E5E9E6] text-[11px] text-[#778079]">
          <div className="flex items-center gap-2">
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">↓</kbd>
            <span>Open:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">↵</kbd>
          </div>
          <div>
            <span>Close:</span>{' '}
            <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD3CE] rounded text-[10px]">ESC</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
