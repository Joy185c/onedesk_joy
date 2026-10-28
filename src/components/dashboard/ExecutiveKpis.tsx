import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { ExecutiveKpiData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

interface ExecutiveKpisProps {
  data: ExecutiveKpiData;
}

export const ExecutiveKpis: React.FC<ExecutiveKpisProps> = ({ data }) => {
  const completionRate = data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0;

  const kpis = [
    {
      label: 'Active Projects',
      value: data.activeProjects,
      subtext: data.activeProjects > 0 ? `${data.activeProjects} on schedule` : 'No active projects',
      icon: Briefcase,
      color: 'text-[#082F1B]',
      bgColor: 'bg-[#F0F1F3]',
      indicator: data.activeProjects > 0 ? 'Stable' : 'Setup',
      indicatorColor: 'text-[#064E24] bg-[#E9FBEA]',
    },
    {
      label: 'Total Tasks',
      value: data.totalTasks,
      subtext: `${data.completedTasks} completed`,
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      indicator: `${completionRate}% done`,
      indicatorColor: 'text-[#064E24] bg-[#E9FBEA]',
    },
    {
      label: 'Overdue Tasks',
      value: data.overdueTasks,
      subtext: data.overdueTasks > 0 ? `${data.overdueTasks} across projects` : 'None overdue',
      icon: Clock,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      indicator: data.overdueTasks > 0 ? 'Requires action' : 'Clear',
      indicatorColor: data.overdueTasks > 0 ? 'text-rose-700 bg-rose-50' : 'text-[#064E24] bg-[#E9FBEA]',
    },
    {
      label: 'Pending Reviews',
      value: data.pendingApprovals,
      subtext: data.pendingApprovals > 0 ? 'Awaiting signoff' : 'Queue clear',
      icon: FileCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      indicator: data.pendingApprovals > 0 ? 'In queue' : 'Up to date',
      indicatorColor: data.pendingApprovals > 0 ? 'text-amber-700 bg-amber-50' : 'text-[#064E24] bg-[#E9FBEA]',
    },
    {
      label: 'Weekly Velocity',
      value: `${data.overallVelocity}`,
      subtext: 'Tasks closed / 7 days',
      icon: TrendingUp,
      color: 'text-[#064E24]',
      bgColor: 'bg-[#E9FBEA]',
      indicator: '+14% vs last week',
      indicatorColor: 'text-[#064E24] bg-[#E9FBEA]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={idx}
            className="hover:border-[#CBD3CE] hover:shadow-card transition-all"
          >
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#5E6962]">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl md:text-3xl font-extrabold text-[#18251D] tracking-tight">
                  {kpi.value}
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span className="text-[#778079] truncate">{kpi.subtext}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] shrink-0 ${kpi.indicatorColor}`}
                >
                  {kpi.indicator}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

