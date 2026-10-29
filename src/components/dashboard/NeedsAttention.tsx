import React from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, FileCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { Task, ReviewRequest } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface NeedsAttentionProps {
  blockedTasks: Task[];
  reviewRequests: ReviewRequest[];
  overdueTasks: Task[];
}

export const NeedsAttention: React.FC<NeedsAttentionProps> = ({
  blockedTasks,
  reviewRequests,
  overdueTasks,
}) => {
  const { workspace } = useWorkspace();
  const slug = workspace.slug;

  const totalUrgent = blockedTasks.length + reviewRequests.length + overdueTasks.length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Needs Attention
          </CardTitle>
          <p className="text-xs text-[#778079] mt-0.5">
            Blockers, pending approvals, and overdue deliverables.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          {totalUrgent} items
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        {totalUrgent === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#E9FBEA] text-[#064E24] flex items-center justify-center mx-auto border border-[#C6F5CB]">
              <FileCheck className="w-5 h-5 text-[#20E34A]" />
            </div>
            <p className="text-xs font-bold text-[#18251D]">All deliverables on schedule</p>
            <p className="text-[11px] text-[#778079]">
              No blockers, pending review approvals, or overdue tasks in {workspace.name}.
            </p>
          </div>
        ) : (
          <>
            {/* Blocked Tasks */}
            {blockedTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 truncate">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="font-mono text-[11px] bg-white px-1.5 py-0.2 rounded border border-rose-200">
                      {task.projectKey}-{task.taskNumber}
                    </span>
                    <span className="truncate">{task.title}</span>
                  </div>
                  <Badge variant="blocked" className="shrink-0 text-[10px]">
                    Blocked
                  </Badge>
                </div>
                {task.blockReason && (
                  <p className="text-xs text-rose-700 mt-1 pl-5 italic font-serif">
                    &ldquo;{task.blockReason}&rdquo;
                  </p>
                )}
                <div className="mt-2 pl-5 flex items-center justify-between text-[11px] text-[#5E6962]">
                  <span>Project: {task.projectName}</span>
                  <Link
                    href={`/w/${slug}/projects/${task.projectId}`}
                    className="text-xs font-semibold text-rose-800 hover:underline flex items-center gap-0.5"
                  >
                    Inspect blocker <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}

            {/* Pending Reviews */}
            {reviewRequests.map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950 truncate">
                    <FileCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="font-mono text-[11px] bg-white px-1.5 py-0.2 rounded border border-purple-200">
                      {rev.projectKey}
                    </span>
                    <span className="truncate">{rev.taskTitle}</span>
                  </div>
                  <Badge variant="ready_for_review" className="shrink-0 text-[10px]">
                    Review Pending
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#5E6962]">
                  <div className="flex items-center gap-1.5">
                    <Avatar user={rev.submitter} size="xs" />
                    <span>Submitted by {rev.submitter.name}</span>
                  </div>
                  <Link
                    href={`/w/${slug}/inbox`}
                    className="text-xs font-semibold text-purple-800 hover:underline flex items-center gap-0.5"
                  >
                    Review & Sign off <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}

            {/* Overdue Task */}
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 truncate">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-mono text-[11px] bg-white px-1.5 py-0.2 rounded border border-amber-200">
                      {task.projectKey}-{task.taskNumber}
                    </span>
                    <span className="truncate">{task.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Past Due
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#5E6962]">
                  <span>Due: {formatDate(task.dueDate!)}</span>
                  <Link
                    href={`/w/${slug}/projects/${task.projectId}`}
                    className="text-xs font-semibold text-amber-900 hover:underline flex items-center gap-0.5"
                  >
                    Reassign / Extend <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};

