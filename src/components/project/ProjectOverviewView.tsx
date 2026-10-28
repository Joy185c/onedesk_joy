import React from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Clock,
  FileCheck,
  AlertCircle,
  Calendar,
  Users,
  Target,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ProjectSummary, Task } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { currentWorkspace } from '@/lib/mockData';

interface ProjectOverviewViewProps {
  project: ProjectSummary;
  projectTasks: Task[];
  onOpenQuickCreate: () => void;
}

export const ProjectOverviewView: React.FC<ProjectOverviewViewProps> = ({
  project,
  projectTasks,
  onOpenQuickCreate,
}) => {
  const slug = currentWorkspace.slug;

  const statusCounts = {
    todo: projectTasks.filter((t) => t.status === 'todo').length,
    in_progress: projectTasks.filter((t) => t.status === 'in_progress').length,
    ready_for_review: projectTasks.filter((t) => t.status === 'ready_for_review').length,
    completed: projectTasks.filter((t) => t.status === 'completed').length,
    blocked: projectTasks.filter((t) => t.status === 'blocked').length,
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Grid: Progress & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Progress Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#18251D]">
              Execution Progress
            </CardTitle>
            <p className="text-xs text-[#778079]">
              Overall completion based on verified leaf task transitions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-[#18251D]">
                  {project.progressPercent}%
                </span>
                <span className="text-xs text-[#778079] ml-2">
                  ({project.completedTasks} of {project.totalTasks} tasks closed)
                </span>
              </div>
              <Badge variant={project.health === 'on_track' ? 'on_track' : 'at_risk'} dot>
                {project.health === 'on_track' ? 'On Schedule' : 'Needs Intervention'}
              </Badge>
            </div>

            <Progress value={project.progressPercent} size="lg" color="lime" />

            {/* Status Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              <div className="p-2.5 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6]">
                <div className="text-[10px] uppercase font-bold text-[#778079]">To Do</div>
                <div className="text-lg font-bold text-[#18251D] mt-0.5">{statusCounts.todo}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200">
                <div className="text-[10px] uppercase font-bold text-blue-700">In Progress</div>
                <div className="text-lg font-bold text-blue-900 mt-0.5">{statusCounts.in_progress}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200">
                <div className="text-[10px] uppercase font-bold text-purple-700">In Review</div>
                <div className="text-lg font-bold text-purple-900 mt-0.5">{statusCounts.ready_for_review}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-[10px] uppercase font-bold text-[#064E24]">Completed</div>
                <div className="text-lg font-bold text-[#064E24] mt-0.5">{statusCounts.completed}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200">
                <div className="text-[10px] uppercase font-bold text-rose-700">Blocked</div>
                <div className="text-lg font-bold text-rose-900 mt-0.5">{statusCounts.blocked}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestone & Target Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#20E34A]" />
              Target Milestone
            </CardTitle>
            <p className="text-xs text-[#778079]">
              Sprint release milestone commitment.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#082F1B] text-white">
              <div className="flex items-center justify-between text-xs text-[#20E34A] font-semibold mb-1">
                <span>Phase 2 Release</span>
                <span>Nov 15, 2026</span>
              </div>
              <p className="text-xs text-[#D2DFD7] leading-relaxed">
                Core interactive flows, security approval gates, and client QA demo.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#5E6962]">
                <span>Project Lead:</span>
                <span className="font-semibold text-[#18251D]">{project.lead.name}</span>
              </div>
              <div className="flex items-center justify-between text-[#5E6962]">
                <span>Pending Approvals:</span>
                <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  {project.pendingReviews} in queue
                </span>
              </div>
              <div className="flex items-center justify-between text-[#5E6962]">
                <span>Overdue Tasks:</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full ${project.overdueTasks > 0 ? 'text-rose-700 bg-rose-50' : 'text-[#064E24] bg-[#E9FBEA]'}`}>
                  {project.overdueTasks}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Tasks & Team Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Tasks Table Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#20E34A]" />
                Project Tasks
              </CardTitle>
              <p className="text-xs text-[#778079] mt-0.5">
                Active deliverables assigned to project team members.
              </p>
            </div>
            <Link
              href={`/w/${slug}/projects/${project.id}/list`}
              className="text-xs font-semibold text-[#06351F] hover:text-[#20E34A] flex items-center gap-1"
            >
              <span>View full list</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-[#E5E9E6]">
              {projectTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#F7F8F8] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#5E6962] bg-[#F0F1F3] px-1.5 py-0.5 rounded">
                      {task.projectKey}-{task.taskNumber}
                    </span>
                    <span className="text-xs font-semibold text-[#18251D] truncate">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={task.status as any} className="capitalize text-[10px]">
                      {task.status.replace('_', ' ')}
                    </Badge>
                    <AvatarGroup users={task.assignees} max={2} size="xs" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E9E6] flex justify-end">
              <Button
                onClick={onOpenQuickCreate}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                + Add Task to {project.key}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dedicated Project Team Roster (Role vs Job Title Separation) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#20E34A]" />
              Project Team & Roles
            </CardTitle>
            <p className="text-xs text-[#778079]">
              Governed by project-level RBAC and isolated permissions.
            </p>
          </CardHeader>

          <CardContent className="space-y-3.5">
            {project.members.map((member, i) => {
              // Distinguish project_role and job_title strictly as required by Blueprint Section 04
              const isLead = member.id === project.lead.id;
              const projectRole = isLead ? 'Project Manager' : 'Contributor';

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F7F8F8] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar user={member} size="sm" showStatus status={member.status} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#18251D] truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-[#778079] truncate">
                        {member.role} {/* Job Title */}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isLead
                          ? 'bg-[#082F1B] text-[#20E34A]'
                          : 'bg-[#F0F1F3] text-[#5E6962]'
                      }`}
                    >
                      {projectRole}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 text-[11px] text-[#778079] flex items-center gap-1.5 bg-[#E9FBEA] p-2.5 rounded-xl border border-[#C6F5CB]">
              <ShieldCheck className="w-4 h-4 text-[#064E24] shrink-0" />
              <span className="text-[#064E24] font-medium leading-tight">
                Project isolation active: members can only inspect authorized data.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
