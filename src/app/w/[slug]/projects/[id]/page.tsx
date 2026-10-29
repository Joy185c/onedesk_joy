'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectOverviewView } from '@/components/project/ProjectOverviewView';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { TaskDetailDrawer } from '@/components/task/TaskDetailDrawer';
import { sampleProjects, sampleTasks } from '@/lib/mockData';
import { ProjectSummary, Task, ProjectHealth } from '@/lib/types';
import { getProjectById } from '@/lib/services/projectService';
import { getProjectTasks } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { workspace, isDemoMode } = useWorkspace();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadData = async () => {
    try {
      if (isDemoMode || projectId.startsWith('prj-')) {
        const p = sampleProjects.find((sp) => sp.id === projectId) || sampleProjects[0];
        setProject(p);
        setTasks(sampleTasks.filter((st) => st.projectId === p.id));
      } else {
        const rawProj = await getProjectById(projectId);
        if (!rawProj) {
          setProject(null);
          setLoading(false);
          return;
        }
        const rawTasks = await getProjectTasks(projectId);

        const summary: ProjectSummary = {
          id: rawProj.id,
          key: rawProj.key,
          name: rawProj.name,
          spaceId: rawProj.space_id || 'sp-general',
          health: (rawProj.health as ProjectHealth) || 'on_track',
          progressPercent:
            rawTasks.length > 0
              ? Math.round(
                  (rawTasks.filter((t) => t.status === 'completed').length / rawTasks.length) * 100
                )
              : 0,
          totalTasks: rawTasks.length,
          completedTasks: rawTasks.filter((t) => t.status === 'completed').length,
          overdueTasks: rawTasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
          ).length,
          pendingReviews: rawTasks.filter((t) => t.status === 'ready_for_review').length,
          targetDate: rawProj.target_date || 'Ongoing',
          members:
            rawProj.project_members && rawProj.project_members.length > 0
              ? rawProj.project_members.map((pm: any) => {
                  const u = pm.user || {};
                  const name = u.full_name || rawProj.owner?.full_name || 'Member';
                  return {
                    id: u.id || pm.id,
                    name,
                    email: u.email || '',
                    initials:
                      name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'TM',
                    role: pm.job_title || (pm.role === 'owner' ? 'Project Lead' : pm.role),
                    avatarUrl: u.avatar_url || undefined,
                  };
                })
              : [
                  {
                    id: rawProj.owner?.id || '',
                    name: rawProj.owner?.full_name || 'Owner',
                    email: rawProj.owner?.email || '',
                    initials: (rawProj.owner?.full_name || 'OW')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase(),
                    role: 'Project Lead',
                  },
                ],
          lead: {
            id: rawProj.lead?.id || rawProj.owner?.id || '',
            name: rawProj.lead?.full_name || rawProj.owner?.full_name || 'Lead',
            email: rawProj.lead?.email || '',
            initials: (rawProj.lead?.full_name || 'PL')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            role: 'Lead',
          },
        };

        setProject(summary);
        setTasks(rawTasks);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, isDemoMode]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#778079]">
        Loading project details...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-lg font-bold text-[#18251D]">Project Not Found</h2>
        <p className="text-xs text-[#778079] mt-1">This project does not exist or you do not have permission.</p>
        <Link href={`/w/${workspace.slug}`} className="mt-4 inline-block">
          <Button variant="default" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <ProjectHeader
        project={project}
        onOpenQuickCreate={() => setCreateTaskOpen(true)}
      />

      <div className="flex-1">
        <ProjectOverviewView
          project={project}
          projectTasks={tasks}
          onOpenQuickCreate={() => setCreateTaskOpen(true)}
        />
      </div>

      <CreateTaskModal
        isOpen={createTaskOpen}
        projectId={project.id}
        projectKey={project.key}
        projectName={project.name}
        onClose={() => setCreateTaskOpen(false)}
        onTaskCreated={() => loadData()}
      />

      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={() => loadData()}
      />
    </div>
  );
}
