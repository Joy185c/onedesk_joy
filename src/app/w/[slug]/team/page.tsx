import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function TeamDirectoryPage() {
  return (
    <DevelopmentPlaceholder
      title="Team Directory & Member Roster"
      phase="2"
      description="Overview of all workspace members, project assignments, roles, and real-time availability."
      plannedFeatures={[
        'Member search by name, role, or project',
        'Project membership allocation matrix',
        'Direct 1-click messaging initiation',
        'Invite new teammates with role pre-selection',
      ]}
    />
  );
}

