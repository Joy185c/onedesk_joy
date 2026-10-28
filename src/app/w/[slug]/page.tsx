'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ExecutiveKpis } from '@/components/dashboard/ExecutiveKpis';
import { ProjectPortfolio } from '@/components/dashboard/ProjectPortfolio';
import { ProductivityChart } from '@/components/dashboard/ProductivityChart';
import { NeedsAttention } from '@/components/dashboard/NeedsAttention';
import { TeamWorkload } from '@/components/dashboard/TeamWorkload';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import {
  currentUser,
  currentWorkspace,
  sampleProjects,
  executiveKpis,
  sampleTasks,
  sampleReviewRequests,
  teamWorkloadData,
  recentActivityFeed,
} from '@/lib/mockData';

export default function OwnerDashboardPage() {
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'attention'>('all');

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
              Owner Command Center
            </span>
            <span className="text-xs text-[#778079]">· Live Workspace Sync</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#18251D] tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-xs md:text-sm text-[#778079] mt-0.5">
            Here is the centralized pulse across all authorized delivery projects in {currentWorkspace.name}.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="bg-white border border-[#E5E9E6] p-1 rounded-xl shadow-2xs flex items-center gap-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-[#082F1B] text-white shadow-xs'
                  : 'text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3]'
              }`}
            >
              All Projects (4)
            </button>
            <button
              onClick={() => setFilterMode('my')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'my'
                  ? 'bg-[#082F1B] text-white shadow-xs'
                  : 'text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3]'
              }`}
            >
              My Projects (2)
            </button>
            <button
              onClick={() => setFilterMode('attention')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'attention'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[#5E6962] hover:text-rose-700 hover:bg-rose-50'
              }`}
            >
              Needs Attention (3)
            </button>
          </div>
        </div>
      </div>

      {/* 1. Executive KPIs */}
      <ExecutiveKpis data={executiveKpis} />

      {/* 2. Active Projects Portfolio Cards */}
      <ProjectPortfolio
        projects={
          filterMode === 'my'
            ? sampleProjects.slice(0, 2)
            : filterMode === 'attention'
            ? sampleProjects.filter((p) => p.health !== 'on_track')
            : sampleProjects
        }
      />

      {/* 3. Two-Column Grid: Delivery Velocity Chart + Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityChart trend={executiveKpis.weeklyProgressTrend} />
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
          Tenant: {currentWorkspace.slug} (v2.0)
        </span>
      </div>
    </div>
  );
}

