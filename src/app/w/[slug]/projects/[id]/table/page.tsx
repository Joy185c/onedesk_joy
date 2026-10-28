'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { TaskTableView } from '@/components/project/TaskTableView';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { TaskDetailDrawer } from '@/components/task/TaskDetailDrawer';
import { sampleProjects, sampleTasks } from '@/lib/mockData';
import { ProjectSummary, Task } from '@/lib/types';
import { getProjectById } from '@/lib/services/projectService';
import { getProjectTasks } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function ProjectTablePage() {
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
        const rawTasks = await getProjectTasks(projectId);

        setProject({
          id: rawProj.id,
          key: rawProj.key,
          name: rawProj.name,
          spaceId: rawProj.space_id || 'sp-general',
          health: rawProj.health || 'on_track',
          progressPercent: 50,
          totalTasks: rawTasks.length,
          completedTasks: rawTasks.filter((t) => t.status === 'completed').length,
          overdueTasks: 0,
          pendingReviews: 0,
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
            id: rawProj.lead?.id || rawProj.owner?.id || rawProj.lead_id || '',
            name: rawProj.lead?.full_name || rawProj.owner?.full_name || 'Lead',
            email: rawProj.lead?.email || '',
            initials: (rawProj.lead?.full_name || rawProj.owner?.full_name || 'PL')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            role: 'Lead',
          },
        });
        setTasks(rawTasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, isDemoMode]);

  if (!project) return null;

  return (
    <div className="flex flex-col min-h-full">
      <ProjectHeader
        project={project}
        onOpenQuickCreate={() => setCreateTaskOpen(true)}
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
        <TaskTableView
          tasks={tasks}
          onTaskClick={(t) => setSelectedTask(t)}
          onAddTask={() => setCreateTaskOpen(true)}
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

