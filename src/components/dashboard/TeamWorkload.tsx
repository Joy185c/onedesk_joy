import React from 'react';
import Link from 'next/link';
import { Users, AlertTriangle } from 'lucide-react';
import { TeamMemberWorkload } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TeamWorkloadProps {
  workload: TeamMemberWorkload[];
}

export const TeamWorkload: React.FC<TeamWorkloadProps> = ({ workload }) => {
  const { workspace } = useWorkspace();
  const slug = workspace.slug;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#20E34A]" />
            Team Workload & Capacity
          </CardTitle>
          <p className="text-xs text-[#778079] mt-0.5">
            Active task allocations and weekly hour commitments.
          </p>
        </div>
        <Link
          href={`/w/${slug}/team`}
          className="text-xs font-semibold text-[#06351F] hover:text-[#20E34A] transition-colors"
        >
          View team
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        {workload.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#F0F1F3] text-[#778079] flex items-center justify-center mx-auto border border-[#E5E9E6]">
              <Users className="w-5 h-5 text-[#778079]" />
            </div>
            <p className="text-xs font-bold text-[#18251D]">No workload assigned</p>
            <p className="text-[11px] text-[#778079]">
              Team member capacity and task hours will be tracked here.
            </p>
          </div>
        ) : (
          workload.map((item) => {
            const percent = Math.round((item.assignedHours / item.capacityHours) * 100);
            const isOverloaded = percent > 100;

            return (
              <div key={item.user.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar user={item.user} size="xs" showStatus status={item.user.status} />
                    <div className="truncate">
                      <span className="font-semibold text-[#18251D] truncate">
                        {item.user.name}
                      </span>
                      <span className="text-[10px] text-[#778079] ml-1.5 hidden sm:inline">
                        ({item.user.role})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOverloaded && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Overloaded
                      </span>
                    )}
                    <span className="font-bold text-[#18251D] text-xs">
                      {item.assignedHours}h <span className="text-[#8E9891] font-normal">/ {item.capacityHours}h</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <Progress
                  value={percent}
                  color={isOverloaded ? 'amber' : 'lime'}
                  size="sm"
                />

                <div className="flex items-center justify-between text-[10px] text-[#778079]">
                  <span>{item.assignedTasksCount} tasks assigned</span>
                  {item.overdueTasksCount > 0 ? (
                    <span className="text-rose-600 font-semibold">{item.overdueTasksCount} overdue</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">0 overdue</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

