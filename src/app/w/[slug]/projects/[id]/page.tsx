'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectOverviewView } from '@/components/project/ProjectOverviewView';
import { QuickCreateModal } from '@/components/navigation/QuickCreateModal';
import { sampleProjects, sampleTasks } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const project = sampleProjects.find((p) => p.id === projectId) || sampleProjects[0];
  const projectTasks = sampleTasks.filter((t) => t.projectId === project.id);

  if (!project) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-lg font-bold text-[#18251D]">Project Not Found</h2>
        <p className="text-xs text-[#778079] mt-1">This project does not exist or you do not have permission.</p>
        <Link href="/w/factor-labs" className="mt-4 inline-block">
          <Button variant="default" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <ProjectHeader
        project={project}
        onOpenQuickCreate={() => setQuickCreateOpen(true)}
      />

      <div className="flex-1">
        <ProjectOverviewView
          project={project}
          projectTasks={projectTasks}
          onOpenQuickCreate={() => setQuickCreateOpen(true)}
        />
      </div>

      <QuickCreateModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
      />
    </div>
  );
}

