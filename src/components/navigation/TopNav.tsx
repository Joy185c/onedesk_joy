'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Plus,
  Bell,
  Sparkles,
  Menu,
  ChevronRight,
  Command,
  LogOut,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TopNavProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  onOpenQuickCreate: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenMobileSidebar,
  onOpenCommandPalette,
  onOpenQuickCreate,
}) => {
  const pathname = usePathname();
  const { user, workspace, signOut, isOwner } = useWorkspace();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate breadcrumb items from current path
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs = [
      { label: workspace.name, href: `/w/${workspace.slug}` },
    ];

    if (parts.includes('projects') && parts.length >= 4) {
      crumbs.push({
        label: 'Project',
        href: `/w/${workspace.slug}/projects/${parts[3]}`,
      });
    } else if (parts.includes('inbox')) {
      crumbs.push({ label: 'Inbox', href: `/w/${workspace.slug}/inbox` });
    } else if (parts.includes('my-tasks')) {
      crumbs.push({ label: 'My Tasks', href: `/w/${workspace.slug}/my-tasks` });
    } else if (parts.includes('tasks')) {
      crumbs.push({ label: 'All Tasks', href: `/w/${workspace.slug}/tasks` });
    } else if (parts.includes('calendar')) {
      crumbs.push({ label: 'Calendar', href: `/w/${workspace.slug}/calendar` });
    } else if (parts.includes('chat')) {
      crumbs.push({ label: 'Chat Hub', href: `/w/${workspace.slug}/chat` });
    } else if (parts.includes('docs')) {
      crumbs.push({ label: 'Documents & Wiki', href: `/w/${workspace.slug}/docs` });
    } else if (parts.includes('goals')) {
      crumbs.push({ label: 'Goals & OKRs', href: `/w/${workspace.slug}/goals` });
    } else if (parts.includes('time')) {
      crumbs.push({ label: 'Time Tracking', href: `/w/${workspace.slug}/time` });
    } else if (parts.includes('automations')) {
      crumbs.push({ label: 'Automations', href: `/w/${workspace.slug}/automations` });
    } else if (parts.includes('ai')) {
      crumbs.push({ label: 'AI Assistant', href: `/w/${workspace.slug}/ai` });
    } else if (parts.includes('settings')) {
      crumbs.push({ label: 'Settings', href: `/w/${workspace.slug}/settings/members` });
    } else {
      crumbs.push({ label: 'Command Center', href: `/w/${workspace.slug}` });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-[#E5E9E6] px-4 md:px-8 flex items-center justify-between gap-4 transition-all duration-150">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-[#778079]">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#CBD3CE]" />}
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-[#18251D] truncate max-w-[200px]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-[#18251D] transition-colors truncate max-w-[150px]"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center: Global Search & Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#F0F1F3] border border-transparent hover:border-[#CBD3CE] text-xs text-[#778079] transition-all group shadow-sm hover:bg-white"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#778079] group-hover:text-[#18251D] transition-colors" />
            <span className="group-hover:text-[#18251D] transition-colors truncate">
              Search tasks, projects, docs...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white border border-[#CBD3CE] font-mono text-[10px] text-[#5E6962] shadow-2xs group-hover:bg-[#F0F1F3]">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Quick Create, AI Assistant, Notifications, Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={onOpenQuickCreate}
          variant="primary"
          size="sm"
          className="hidden sm:inline-flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create</span>
        </Button>

        {/* AI Quick Sparkle */}
        <Link
          href={`/w/${workspace.slug}/ai`}
          className="p-2 rounded-xl text-[#06351F] bg-[#E9FBEA] hover:bg-[#C6F5CB] border border-[#C6F5CB] transition-colors"
          title="AI Assistant"
        >
          <Sparkles className="w-4 h-4 text-[#064E24]" />
        </Link>

        {/* Notifications Inbox Bell */}
        <Link
          href={`/w/${workspace.slug}/inbox`}
          className="relative p-2 rounded-xl text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3] transition-colors"
          title="Unified Inbox"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#20E34A] ring-2 ring-white" />
        </Link>

        <div className="h-6 w-[1px] bg-[#E5E9E6] mx-1 hidden sm:block" />

        {/* User Profile Avatar with dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[#20E34A] transition-all cursor-pointer focus:outline-none"
            aria-label="User menu"
          >
            <Avatar user={user} size="sm" showStatus status="online" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-[#E5E9E6] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-[#E5E9E6]">
                <p className="text-xs font-bold text-[#18251D] truncate">{user.name}</p>
                <p className="text-[11px] text-[#778079] truncate">{user.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB]">
                  <Shield className="w-3 h-3 text-[#20E34A]" />
                  <span>{isOwner ? 'Workspace Owner' : user.role || 'Member'}</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href={`/w/${workspace.slug}/settings`}
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3] rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-[#778079]" />
                  <span>Profile & Avatar</span>
                </Link>

                <Link
                  href={`/w/${workspace.slug}/settings/members`}
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3] rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#778079]" />
                  <span>Workspace Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-[#E5E9E6]">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

