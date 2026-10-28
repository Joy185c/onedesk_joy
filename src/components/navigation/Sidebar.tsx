'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Layers,
  Calendar,
  MessageSquare,
  FileText,
  Target,
  Clock,
  Sparkles,
  Bot,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  FolderOpen,
} from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { Avatar } from '@/components/ui/avatar';
import { sampleSpaces, currentUser, currentWorkspace } from '@/lib/mockData';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  className = '',
}) => {
  const pathname = usePathname();
  const slug = currentWorkspace.slug;

  // Space expansion state
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({
    'sp-client-delivery': true,
    'sp-design-labs': true,
    'sp-core-engineering': false,
  });

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) => ({
      ...prev,
      [spaceId]: !prev[spaceId],
    }));
  };

  const navItems = [
    {
      label: 'Home Dashboard',
      href: `/w/${slug}`,
      icon: LayoutDashboard,
      badge: null,
      exact: true,
    },
    {
      label: 'Inbox',
      href: `/w/${slug}/inbox`,
      icon: Inbox,
      badge: '3',
      badgeColor: 'bg-[#20E34A] text-[#06351F]',
    },
    {
      label: 'My Tasks',
      href: `/w/${slug}/my-tasks`,
      icon: CheckSquare,
      badge: '5',
      badgeColor: 'bg-[#175235] text-[#D2DFD7]',
    },
    {
      label: 'All Tasks',
      href: `/w/${slug}/tasks`,
      icon: Layers,
      badge: null,
    },
    {
      label: 'Calendar',
      href: `/w/${slug}/calendar`,
      icon: Calendar,
      badge: null,
    },
  ];

  const toolsItems = [
    {
      label: 'Chat Hub',
      href: `/w/${slug}/chat`,
      icon: MessageSquare,
      badge: '2',
      badgeColor: 'bg-[#20E34A] text-[#06351F]',
    },
    {
      label: 'Documents',
      href: `/w/${slug}/docs`,
      icon: FileText,
      badge: null,
    },
    {
      label: 'Goals & OKRs',
      href: `/w/${slug}/goals`,
      icon: Target,
      badge: null,
    },
    {
      label: 'Time Tracking',
      href: `/w/${slug}/time`,
      icon: Clock,
      badge: null,
    },
    {
      label: 'Automations',
      href: `/w/${slug}/automations`,
      icon: Sparkles,
      badge: null,
    },
    {
      label: 'AI Assistant',
      href: `/w/${slug}/ai`,
      icon: Bot,
      badge: 'AI',
      badgeColor: 'bg-[#20E34A]/20 text-[#20E34A] border border-[#20E34A]/40',
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#082F1B] border-r border-[#14482E] transition-all duration-300 ease-in-out select-none ${
        collapsed ? 'w-16' : 'w-64'
      } ${className}`}
    >
      {/* Top Header: Brand & Collapse Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#14482E] shrink-0">
        <Link href={`/w/${slug}`} className="flex items-center overflow-hidden">
          <Logo variant="dark" showText={!collapsed} size="sm" />
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#849E8E] hover:text-white hover:bg-[#12452C] transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Workspace Switcher */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-[#12452C] text-white shadow-sm'
                    : 'text-[#D2DFD7] hover:bg-[#06351F] hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#20E34A]" />
                )}
                <item.icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#20E34A]' : 'text-[#849E8E] group-hover:text-white'
                  }`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Spaces & Projects Tree */}
        {!collapsed && (
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
                Spaces & Projects
              </span>
              <button
                className="p-1 rounded text-[#849E8E] hover:text-white hover:bg-[#12452C] transition-colors"
                title="Create Project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {sampleSpaces.map((space) => {
                const isExpanded = expandedSpaces[space.id];
                return (
                  <div key={space.id} className="space-y-0.5">
                    {/* Space Row */}
                    <button
                      onClick={() => toggleSpace(space.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#849E8E] hover:text-white hover:bg-[#06351F] transition-colors group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-[#849E8E] shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-[#849E8E] shrink-0" />
                        )}
                        <Briefcase className="w-3.5 h-3.5 text-[#849E8E] group-hover:text-white" />
                        <span className="truncate">{space.name}</span>
                      </div>
                      <span className="text-[10px] bg-[#12452C] text-[#849E8E] px-1.5 py-0.2 rounded-full">
                        {space.projects?.length || 0}
                      </span>
                    </button>

                    {/* Sub-projects list */}
                    {isExpanded && space.projects && (
                      <div className="pl-6 space-y-0.5">
                        {space.projects.map((proj) => {
                          const projHref = `/w/${slug}/projects/${proj.id}`;
                          const isProjActive = pathname.startsWith(projHref);

                          return (
                            <Link
                              key={proj.id}
                              href={projHref}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group relative ${
                                isProjActive
                                  ? 'bg-[#175235] text-white font-semibold'
                                  : 'text-[#D2DFD7] hover:bg-[#06351F] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#20E34A] shrink-0" />
                                <span className="truncate">{proj.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#849E8E] px-1 py-0.2 rounded bg-[#06351F] shrink-0">
                                {proj.key}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collaboration & Productivity Tools */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#849E8E]">
              Collaboration & Tools
            </div>
          )}
          <div className="space-y-1">
            {toolsItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-[#12452C] text-white'
                      : 'text-[#D2DFD7] hover:bg-[#06351F] hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#20E34A]' : 'text-[#849E8E] group-hover:text-white'
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Profile & Settings Bar */}
      <div className="p-3 border-t border-[#14482E] shrink-0 bg-[#06351F]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar user={currentUser} size="sm" showStatus status="online" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-[#849E8E] truncate">
                  {currentUser.role}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <Link
              href={`/w/${slug}/settings/general`}
              className="p-1.5 rounded-lg text-[#849E8E] hover:text-white hover:bg-[#12452C] transition-colors"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
};

