import React from 'react';
import Link from 'next/link';
import { Activity, CheckCircle, MessageSquare, Plus, FileCheck } from 'lucide-react';
import { ActivityItem } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { currentWorkspace } from '@/lib/mockData';

interface RecentActivityProps {
  activities: ActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const slug = currentWorkspace.slug;

  const actionIcons = {
    created_task: { icon: Plus, color: 'text-blue-600 bg-blue-50' },
    updated_status: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
    submitted_review: { icon: FileCheck, color: 'text-purple-600 bg-purple-50' },
    approved_review: { icon: CheckCircle, color: 'text-[#064E24] bg-[#E9FBEA]' },
    commented: { icon: MessageSquare, color: 'text-amber-600 bg-amber-50' },
    created_project: { icon: Plus, color: 'text-[#082F1B] bg-[#F0F1F3]' },
  };

  const actionVerbs = {
    created_task: 'created task',
    updated_status: 'updated task progress',
    submitted_review: 'submitted for review',
    approved_review: 'approved review for',
    commented: 'commented on',
    created_project: 'launched project',
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#20E34A]" />
            Unified Activity Feed
          </CardTitle>
          <p className="text-xs text-[#778079] mt-0.5">
            Audit trail across all authorized projects.
          </p>
        </div>
        <Link
          href={`/w/${slug}/inbox`}
          className="text-xs font-semibold text-[#06351F] hover:text-[#20E34A] transition-colors"
        >
          View all
        </Link>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {activities.map((act) => {
          const config = actionIcons[act.action] || actionIcons.created_task;
          const verb = actionVerbs[act.action] || 'updated';

          return (
            <div key={act.id} className="flex items-start gap-3 group">
              <Avatar user={act.actor} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#18251D] leading-tight">
                  <span className="font-bold">{act.actor.name}</span>{' '}
                  <span className="text-[#5E6962]">{verb}</span>{' '}
                  <Link
                    href={act.targetUrl}
                    className="font-semibold text-[#082F1B] hover:underline"
                  >
                    {act.targetTitle}
                  </Link>
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8E9891]">
                  <span className="font-medium text-[#5E6962]">{act.projectName}</span>
                  <span>•</span>
                  <span>{act.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

