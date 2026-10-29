'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { ProjectSummary, TeamMemberWorkload } from '@/lib/types';
import { sampleProjects, teamWorkloadData } from '@/lib/mockData';
import { getProjectById } from '@/lib/services/projectService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Users, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { UserAvatar } from '@/components/ui/avatar';

export default function ProjectWorkloadPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { workspace, isDemoMode } = useWorkspace();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [workloads, setWorkloads] = useState<TeamMemberWorkload[]>(teamWorkloadData);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (isDemoMode || projectId.startsWith('prj-') || projectId.startsWith('proj-')) {
          const p = sampleProjects.find((sp) => sp.id === projectId) || sampleProjects[0];
          setProject(p);
        } else {
          const rawProj = await getProjectById(projectId);
          setProject({
            id: rawProj.id,
            key: rawProj.key,
            name: rawProj.name,
            spaceId: rawProj.space_id || 'sp-general',
            health: rawProj.health || 'on_track',
            progressPercent: 50,
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            pendingReviews: 0,
            targetDate: rawProj.target_date || 'Ongoing',
            members: [],
            lead: {
              id: rawProj.lead?.id || rawProj.owner?.id || '',
              name: rawProj.lead?.full_name || rawProj.owner?.full_name || 'Lead',
              email: rawProj.lead?.email || '',
              initials: 'PL',
              role: 'Lead',
            },
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, isDemoMode]);

  if (loading || !project) {
    return <div className="p-8 text-center text-xs text-[#778079]">Loading team capacity...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F1F3]">
      <ProjectHeader project={project} onOpenQuickCreate={() => setCreateTaskOpen(true)} />

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#18251D]">Project Team Workload & Capacity</h2>
          <p className="text-xs text-[#778079] mt-0.5">
            Monitor sprint commitments against individual contributor capacity for {project.name}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workloads.map((item) => {
            const utilization = Math.round((item.assignedHours / (item.capacityHours || 1)) * 100);
            const isOverloaded = utilization > 100;

            return (
              <div
                key={item.user.id}
                className="bg-white rounded-2xl border border-[#E5E9E6] p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={item.user} size="lg" />
                    <div>
                      <h4 className="text-sm font-bold text-[#18251D]">{item.user.name}</h4>
                      <p className="text-[11px] text-[#778079]">{item.user.role}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isOverloaded
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB]'
                    }`}
                  >
                    {utilization}% Capacity
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#5E6962]">
                    <span>Assigned Sprint Hours</span>
                    <span>
                      {item.assignedHours} / {item.capacityHours} hrs
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, utilization)}
                    color={isOverloaded ? 'amber' : 'lime'}
                    size="sm"
                  />
                </div>

                <div className="pt-2 border-t border-[#F0F1F3] flex items-center justify-between text-[11px] text-[#778079]">
                  <span>{item.assignedTasksCount} deliverables assigned</span>
                  {item.overdueTasksCount > 0 && (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {item.overdueTasksCount} overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateTaskModal
        isOpen={createTaskOpen}
        projectId={project.id}
        projectKey={project.key}
        projectName={project.name}
        onClose={() => setCreateTaskOpen(false)}
      />
    </div>
  );
}

