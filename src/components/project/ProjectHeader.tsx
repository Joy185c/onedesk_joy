'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Columns3,
  Table as TableIcon,
  Calendar,
  MessageSquare,
  FileText,
  Users,
  Plus,
  Settings,
} from 'lucide-react';
import { ProjectSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarGroup } from '@/components/ui/avatar';
import { currentWorkspace } from '@/lib/mockData';

interface ProjectHeaderProps {
  project: ProjectSummary;
  onOpenQuickCreate: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onOpenQuickCreate,
}) => {
  const pathname = usePathname();
  const slug = currentWorkspace.slug;
  const baseUrl = `/w/${slug}/projects/${project.id}`;

  const tabs = [
    { label: 'Overview', href: `${baseUrl}`, icon: LayoutDashboard },
    { label: 'Tasks List', href: `${baseUrl}/list`, icon: CheckSquare, count: project.totalTasks },
    { label: 'Board', href: `${baseUrl}/board`, icon: Columns3 },
    { label: 'Table', href: `${baseUrl}/table`, icon: TableIcon },
    { label: 'Timeline', href: `${baseUrl}/timeline`, icon: Calendar },
    { label: 'Chat', href: `${baseUrl}/chat`, icon: MessageSquare, count: 2 },
    { label: 'Docs', href: `${baseUrl}/docs`, icon: FileText },
    { label: 'Workload', href: `${baseUrl}/workload`, icon: Users },
  ];

  return (
    <div className="bg-white border-b border-[#E5E9E6] px-4 md:px-8 pt-6 pb-0">
      {/* Top Details Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#082F1B] text-[#20E34A] font-mono font-bold text-xs">
              {project.key}
            </span>
            <Badge
              variant={project.health === 'on_track' ? 'on_track' : 'at_risk'}
              dot
            >
              {project.health === 'on_track' ? 'On Track' : 'At Risk'}
            </Badge>
            <span className="text-xs text-[#778079]">
              Due {new Date(project.targetDate).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            {project.name}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-[#778079]">Team:</span>
            <AvatarGroup users={project.members} max={4} size="sm" />
          </div>

          <Button
            onClick={onOpenQuickCreate}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>

          <Button variant="outline" size="icon" title="Project Settings">
            <Settings className="w-4 h-4 text-[#5E6962]" />
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-[#F0F1F3] -mx-4 md:-mx-8 px-4 md:px-8">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#20E34A] text-[#18251D] font-bold'
                  : 'border-transparent text-[#778079] hover:text-[#18251D] hover:border-[#CBD3CE]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#082F1B]' : 'text-[#8E9891]'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-[#E9FBEA] text-[#064E24] font-bold'
                      : 'bg-[#F0F1F3] text-[#778079]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

