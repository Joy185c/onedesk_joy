import React from 'react';
import Link from 'next/link';
import { ChevronRight, Calendar, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { ProjectSummary } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AvatarGroup } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { currentWorkspace } from '@/lib/mockData';

interface ProjectPortfolioProps {
  projects: ProjectSummary[];
}

export const ProjectPortfolio: React.FC<ProjectPortfolioProps> = ({ projects }) => {
  const slug = currentWorkspace.slug;

  const healthLabels: Record<string, { label: string; variant: 'on_track' | 'at_risk' | 'off_track' }> = {
    on_track: { label: 'On Track', variant: 'on_track' },
    at_risk: { label: 'At Risk', variant: 'at_risk' },
    off_track: { label: 'Off Track', variant: 'off_track' },
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold text-[#18251D]">
            Active Projects Portfolio
          </CardTitle>
          <p className="text-xs text-[#778079] mt-0.5">
            Cross-project progress, health metrics, and delivery targets.
          </p>
        </div>
        <Link
          href={`/w/${slug}/spaces`}
          className="text-xs font-semibold text-[#06351F] hover:text-[#20E34A] flex items-center gap-1 transition-colors"
        >
          <span>View all spaces</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map((proj) => {
            const healthConfig = healthLabels[proj.health] || {
              label: 'On Track',
              variant: 'on_track',
            };

            return (
              <Link
                key={proj.id}
                href={`/w/${slug}/projects/${proj.id}`}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-[#E5E9E6] hover:border-[#CBD3CE] bg-[#F7F8F8] hover:bg-white transition-all duration-200 shadow-2xs hover:shadow-card"
              >
                <div>
                  {/* Top Bar: Key + Health Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#082F1B] text-[#20E34A] font-mono font-bold text-[11px]">
                      {proj.key}
                    </span>
                    <Badge variant={healthConfig.variant} dot>
                      {healthConfig.label}
                    </Badge>
                  </div>

                  {/* Project Title */}
                  <h4 className="text-sm font-bold text-[#18251D] group-hover:text-[#082F1B] transition-colors line-clamp-1 mb-1">
                    {proj.name}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#778079] mb-4">
                    <Calendar className="w-3 h-3 text-[#8E9891]" />
                    <span>Target: {formatDate(proj.targetDate)}</span>
                  </div>

                  {/* Progress Metric */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#5E6962] font-medium text-[11px]">Completion</span>
                      <span className="text-[#18251D]">{proj.progressPercent}%</span>
                    </div>
                    <Progress
                      value={proj.progressPercent}
                      color={proj.health === 'at_risk' ? 'amber' : 'lime'}
                      size="sm"
                    />
                    <div className="flex items-center justify-between text-[10px] text-[#778079] pt-0.5">
                      <span>{proj.completedTasks} of {proj.totalTasks} tasks done</span>
                      {proj.overdueTasks > 0 && (
                        <span className="text-rose-600 font-semibold">{proj.overdueTasks} overdue</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: Member Avatars & Lead */}
                <div className="pt-3 border-t border-[#E5E9E6]/70 flex items-center justify-between">
                  <AvatarGroup users={proj.members} max={3} size="xs" />
                  <span className="text-[10px] text-[#778079] group-hover:text-[#18251D] flex items-center gap-0.5 transition-colors font-medium">
                    Open <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

