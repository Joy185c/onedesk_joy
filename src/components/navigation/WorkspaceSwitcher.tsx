'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Check, Building2, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ collapsed = false }) => {
  const router = useRouter();
  const { workspace, userWorkspaces, isDemoMode } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = workspace.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'WS';

  if (collapsed) {
    return (
      <div className="flex justify-center py-2 px-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-xl bg-[#06351F] border border-[#14482E] text-white flex items-center justify-center font-bold text-sm hover:bg-[#12452C] transition-colors"
          title={workspace.name}
        >
          {initials}
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-3 py-2" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-[#06351F] border border-[#14482E] hover:bg-[#12452C] transition-all duration-150 text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#12452C] border border-[#20E34A]/30 flex items-center justify-center font-bold text-white text-xs shrink-0 group-hover:border-[#20E34A] transition-colors">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
              <span>{workspace.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#20E34A]" />
            </div>
            <div className="text-[11px] text-[#849E8E] truncate">
              {workspace.projectsCount} {workspace.projectsCount === 1 ? 'project' : 'projects'} · Active workspace
            </div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-[#849E8E] group-hover:text-white transition-colors shrink-0 ml-1" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-xl bg-[#06351F] border border-[#14482E] shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-semibold tracking-wider text-[#849E8E] px-2 py-1 uppercase">
            Your Workspaces
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {userWorkspaces.length > 0 ? (
              userWorkspaces.map((ws) => {
                const isSelected = ws.slug === workspace.slug;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/w/${ws.slug}`);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#175235] text-white font-semibold'
                        : 'text-[#D2DFD7] hover:bg-[#12452C] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[#20E34A]" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#20E34A] shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-[11px] text-[#849E8E]">
                {workspace.name} (Current)
              </div>
            )}
          </div>

          <div className="h-[1px] bg-[#14482E] my-1.5" />

          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/onboarding');
            }}
            className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-[#20E34A] hover:bg-[#12452C] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Workspace</span>
          </button>
        </div>
      )}
    </div>
  );
};
