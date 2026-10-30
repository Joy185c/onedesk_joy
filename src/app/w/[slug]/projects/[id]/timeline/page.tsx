'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { TaskDetailDrawer } from '@/components/task/TaskDetailDrawer';
import { Task, ProjectSummary } from '@/lib/types';
import { getProjectById } from '@/lib/services/projectService';
import { getProjectTasks } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Calendar, Clock, Flag, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ProjectTimelinePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { workspace } = useWorkspace();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const rawProj = await getProjectById(projectId);
      if (!rawProj) {
        setProject(null);
        setLoading(false);
        return;
      }
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
          members: [],
          lead: {
            id: rawProj.lead?.id || rawProj.owner?.id || '',
            name: rawProj.lead?.full_name || rawProj.owner?.full_name || 'Lead',
            email: rawProj.lead?.email || '',
            initials: 'PL',
            role: 'Lead',
          },
        });
        setTasks(rawTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading || !project) {
    return <div className="p-8 text-center text-xs text-[#778079]">Loading timeline roadmap...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F1F3]">
      <ProjectHeader project={project} onOpenQuickCreate={() => setCreateTaskOpen(true)} />

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Milestone Banner */}
        <div className="bg-[#082F1B] rounded-2xl p-6 text-white shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-[#20E34A]" />
              <h2 className="text-base font-extrabold tracking-tight">
                {project.name} Sprint Roadmap
              </h2>
            </div>
            <p className="text-xs text-[#A3B899]">
              Sequential deliverable dependencies and target milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono">
              Target: {project.targetDate}
            </div>
          </div>
        </div>

        {/* Deliverable Timeline Rows */}
        <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card divide-y divide-[#E5E9E6] overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F8F8] flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#778079]">
            <span>Deliverables Schedule</span>
            <span>Due Date & Progress</span>
          </div>

          {tasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#778079]">
              No scheduled tasks yet in this project.
            </div>
          ) : (
            tasks.map((task, i) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-4 px-6 hover:bg-[#F7F8F8] transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#082F1B] text-[#20E34A]">
                    {task.projectKey}-{task.taskNumber}
                  </span>
                  <span className="text-xs font-semibold text-[#18251D] truncate">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <Badge
                    variant={
                      task.status === 'completed'
                        ? 'completed'
                        : task.status === 'ready_for_review'
                        ? 'ready_for_review'
                        : 'in_progress'
                    }
                  >
                    {task.status.replace(/_/g, ' ')}
                  </Badge>

                  <span className="font-mono text-[#778079] text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#CBD3CE]" />
                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Ongoing'}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateTaskModal
        isOpen={createTaskOpen}
        projectId={project.id}
        projectKey={project.key}
        projectName={project.name}
        onClose={() => setCreateTaskOpen(false)}
        onTaskCreated={loadData}
      />

      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={loadData}
      />
    </div>
  );
}
