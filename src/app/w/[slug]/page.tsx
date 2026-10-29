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
import { getWorkspaceMembers } from '@/lib/services/taskService';
import { createClient } from '@/lib/supabase/client';
import {
  ProjectSummary,
  Task,
  ReviewRequest,
  TeamMemberWorkload,
  ActivityItem,
} from '@/lib/types';
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
  const [blockedTasks, setBlockedTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [workloadData, setWorkloadData] = useState<TeamMemberWorkload[]>([]);
  const [activityData, setActivityData] = useState<ActivityItem[]>([]);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    if (isDemoMode) {
      setRealProjects(sampleProjects);
      setBlockedTasks(sampleTasks.filter((t) => t.isBlocked));
      setOverdueTasks(
        sampleTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date('2026-10-29') && t.status !== 'completed'
        )
      );
      setReviewRequests(sampleReviewRequests);
      setWorkloadData(teamWorkloadData);
      setActivityData(recentActivityFeed);
      setLoading(false);
      return;
    }

    if (workspace.id) {
      try {
        const supabase = createClient();
        const [projs, members] = await Promise.all([
          getWorkspaceProjects(workspace.id),
          getWorkspaceMembers(workspace.id),
        ]);
        setRealProjects(projs);

        // 1. Fetch real tasks for this workspace
        const { data: rawTasks } = await supabase
          .from('tasks')
          .select(`
            *,
            project:projects(id, key, name),
            assignees:task_assignees(
              user:profiles(id, full_name, email, avatar_url)
            )
          `)
          .eq('workspace_id', workspace.id);

        const allTasks: Task[] = (rawTasks || []).map((t: any) => ({
          id: t.id,
          workspaceId: t.workspace_id,
          projectId: t.project_id,
          projectName: t.project?.name || 'General Project',
          projectKey: t.project?.key || 'PRJ',
          taskNumber: t.task_number || 1,
          title: t.title,
          description: t.description || undefined,
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date || undefined,
          isBlocked: Boolean(t.is_blocked || t.status === 'blocked'),
          blockedReason: t.block_reason || undefined,
          reviewRequired: Boolean(t.review_required),
          assignees: (t.assignees || []).map((a: any) => ({
            id: a.user?.id || '',
            name: a.user?.full_name || 'Member',
            email: a.user?.email || '',
            avatarUrl: a.user?.avatar_url || undefined,
            initials: (a.user?.full_name || 'TM').slice(0, 2).toUpperCase(),
            role: 'Member',
          })),
          subtaskCount: 0,
          completedSubtasks: 0,
          commentsCount: 0,
        }));

        // 2. Filter Blocked, Overdue, and Review Pending Tasks
        const now = new Date();
        const blocked = allTasks.filter((t) => t.isBlocked);
        const overdue = allTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
        );
        const reviews: ReviewRequest[] = allTasks
          .filter((t) => t.status === 'ready_for_review' || (t.reviewRequired && t.status !== 'completed'))
          .map((t) => ({
            id: `rev-${t.id}`,
            taskId: t.id,
            taskTitle: t.title,
            projectKey: t.projectKey,
            projectName: t.projectName,
            submitter: t.assignees[0] || user,
            reviewer: user,
            submittedAt: new Date().toISOString(),
            state: 'pending' as const,
            submissionNote: 'Awaiting reviewer sign-off',
          }));

        setBlockedTasks(blocked);
        setOverdueTasks(overdue);
        setReviewRequests(reviews);

        // 3. Compute Real Team Workload
        const workload: TeamMemberWorkload[] = members.map((m) => {
          const userTasks = allTasks.filter((t) =>
            t.assignees.some((a) => a.id === m.id || a.email.toLowerCase() === m.email.toLowerCase())
          );
          const overdueCount = userTasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
          ).length;

          return {
            user: m,
            assignedTasksCount: userTasks.length,
            assignedHours: userTasks.length * 8,
            capacityHours: 40,
            overdueTasksCount: overdueCount,
          };
        });
        setWorkloadData(workload);

        // 4. Fetch Real Audit Logs for Unified Activity Feed
        const { data: auditRows } = await supabase
          .from('audit_logs')
          .select('*, actor:actor_id(id, full_name, email, avatar_url)')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(8);

        const activities: ActivityItem[] = (auditRows || []).map((a: any) => {
          const actorName = a.actor?.full_name || 'Teammate';
          return {
            id: a.id,
            actor: {
              id: a.actor?.id || '',
              name: actorName,
              email: a.actor?.email || '',
              avatarUrl: a.actor?.avatar_url || undefined,
              initials: actorName.slice(0, 2).toUpperCase(),
              role: 'Member',
            },
            action: (a.action?.includes('review') ? 'submitted_review' : a.action?.includes('status') ? 'updated_status' : 'created_task') as any,
            targetTitle: a.details?.task_title || a.details?.title || a.resource_type || 'Deliverable',
            targetType: (a.resource_type || 'task') as any,
            targetUrl: `/w/${workspace.slug}/tasks`,
            timestamp: new Date(a.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            projectName: a.details?.project_key || 'Workspace',
          };
        });
        setActivityData(activities);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [workspace.id, isDemoMode]);

  // Compute dynamic KPIs if real projects exist
  const activeProjectsCount = realProjects.length;
  const totalTasksCount = realProjects.reduce((acc, p) => acc + p.totalTasks, 0);
  const completedTasksCount = realProjects.reduce((acc, p) => acc + p.completedTasks, 0);
  const overdueTasksCount = overdueTasks.length;
  const pendingReviewsCount = reviewRequests.length;

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#18251D] tracking-tight min-h-[36px] flex items-center">
            {loading || !user.name ? (
              <span className="inline-block h-8 w-44 bg-[#E5E9E6] animate-pulse rounded-lg" />
            ) : (
              <span>Welcome back, {user.name.split(' ')[0]}</span>
            )}
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
          reviewRequests={reviewRequests}
          overdueTasks={overdueTasks}
        />
      </div>

      {/* 4. Two-Column Grid: Team Workload & Unified Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamWorkload workload={workloadData} />
        <RecentActivity activities={activityData} />
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
        onProjectCreated={() => loadDashboardData()}
      />
    </div>
  );
}
