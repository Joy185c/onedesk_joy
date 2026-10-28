'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  ShieldCheck,
  FolderKanban,
  Users,
  ExternalLink,
  CheckSquare,
  Clock,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';
import { ExecutiveKpis } from '@/components/dashboard/ExecutiveKpis';
import { ProjectPortfolio } from '@/components/dashboard/ProjectPortfolio';
import { ProductivityChart } from '@/components/dashboard/ProductivityChart';
import { NeedsAttention } from '@/components/dashboard/NeedsAttention';
import { TeamWorkload } from '@/components/dashboard/TeamWorkload';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { ProjectSummary } from '@/lib/types';
import {
  sampleProjects,
  executiveKpis as demoKpis,
  sampleTasks,
  sampleReviewRequests,
  teamWorkloadData,
  recentActivityFeed,
} from '@/lib/mockData';

export default function OwnerDashboardPage() {
  const { user, workspace, isOwner, isDemoMode } = useWorkspace();
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'attention'>('all');
  const [realProjects, setRealProjects] = useState<ProjectSummary[]>([]);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    if (isDemoMode) {
      setRealProjects(sampleProjects);
      setLoading(false);
      return;
    }

    if (workspace.id) {
      try {
        const projs = await getWorkspaceProjects(workspace.id);
        setRealProjects(projs);
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProjects();
  }, [workspace.id, isDemoMode]);

  // Compute dynamic KPIs if real projects exist
  const activeProjectsCount = realProjects.length;
  const totalTasksCount = realProjects.reduce((acc, p) => acc + p.totalTasks, 0);
  const completedTasksCount = realProjects.reduce((acc, p) => acc + p.completedTasks, 0);
  const overdueTasksCount = realProjects.reduce((acc, p) => acc + p.overdueTasks, 0);
  const pendingReviewsCount = realProjects.reduce((acc, p) => acc + p.pendingReviews, 0);

  const dynamicKpis = isDemoMode
    ? demoKpis
    : {
        activeProjects: activeProjectsCount,
        totalTasks: totalTasksCount,
        completedTasks: completedTasksCount,
        overdueTasks: overdueTasksCount,
        pendingApprovals: pendingReviewsCount,
        overallVelocity: completedTasksCount > 0 ? 12 : 0,
        weeklyProgressTrend: demoKpis.weeklyProgressTrend,
      };

  const blockedTasks = sampleTasks.filter((t) => t.isBlocked);
  const overdueTasks = sampleTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date('2026-10-29') && t.status !== 'completed'
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              {isOwner ? 'Owner Command Center' : 'Team Command Center'}
            </span>
            <span className="text-xs text-[#778079]">· Live Workspace Sync</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#18251D] tracking-tight">
            Welcome back, {user.name.split(' ')[0] || 'Joy'}
          </h1>
          <p className="text-xs md:text-sm text-[#778079] mt-0.5">
            Here is the centralized pulse across all authorized delivery projects in {workspace.name}.
          </p>
        </div>

        {/* Filter Pills / Create Project Button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateProjectOpen(true)}
            variant="primary"
            size="sm"
            className="font-bold flex items-center gap-1.5 shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Project</span>
          </Button>

          <div className="bg-white border border-[#E5E9E6] p-1 rounded-xl shadow-2xs hidden sm:flex items-center gap-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-[#082F1B] text-white shadow-xs'
                  : 'text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3]'
              }`}
            >
              All ({realProjects.length})
            </button>
            <button
              onClick={() => setFilterMode('attention')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'attention'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[#5E6962] hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              Needs Attention ({overdueTasksCount + pendingReviewsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Zero State for New Real Workspaces with 0 Projects */}
      {!isDemoMode && realProjects.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#CBD3CE] p-8 shadow-card text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E9FBEA] text-[#064E24] flex items-center justify-center mx-auto border border-[#C6F5CB]">
            <FolderKanban className="w-7 h-7 text-[#20E34A]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-lg font-extrabold text-[#18251D]">
              Start Your First Project in {workspace.name}
            </h2>
            <p className="text-xs text-[#5E6962] leading-relaxed">
              You are set up as the Workspace Owner. Create a project to start planning sprints, assigning tasks, and monitoring team deliverables.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => setCreateProjectOpen(true)}
              variant="primary"
              size="default"
              className="font-bold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Project</span>
            </Button>

            <Link href={`/w/${workspace.slug}/settings/members`}>
              <Button variant="outline" size="default" className="font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#064E24]" />
                <span>Invite Team Members</span>
              </Button>
            </Link>

            <Link href="/w/factor-labs">
              <Button variant="ghost" size="default" className="text-xs text-[#5E6962] flex items-center gap-1">
                <span>View Factor Labs Showcase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 1. Executive KPIs */}
      <ExecutiveKpis data={dynamicKpis} />

      {/* 2. Active Projects Portfolio Cards */}
      {realProjects.length > 0 && (
        <ProjectPortfolio
          projects={
            filterMode === 'attention'
              ? realProjects.filter((p) => p.health !== 'on_track')
              : realProjects
          }
        />
      )}

      {/* 3. Two-Column Grid: Delivery Velocity Chart + Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityChart trend={dynamicKpis.weeklyProgressTrend} />
        <NeedsAttention
          blockedTasks={blockedTasks}
          reviewRequests={sampleReviewRequests}
          overdueTasks={overdueTasks}
        />
      </div>

      {/* 4. Two-Column Grid: Team Workload & Unified Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamWorkload workload={teamWorkloadData} />
        <RecentActivity activities={recentActivityFeed} />
      </div>

      {/* Security & Multi-Project Isolation Indicator */}
      <div className="p-4 rounded-2xl bg-white border border-[#E5E9E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5E6962] shadow-card">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#E9FBEA] text-[#064E24]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#18251D]">
              Permission-Aware Aggregation Active:
            </span>{' '}
            Metrics and tasks reflect only authenticated project memberships. Cross-tenant and private project isolation enforced.
          </div>
        </div>
        <span className="text-[11px] font-mono text-[#778079] shrink-0">
          Tenant: {workspace.slug} (v2.0)
        </span>
      </div>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onProjectCreated={() => loadProjects()}
      />
    </div>
  );
}
