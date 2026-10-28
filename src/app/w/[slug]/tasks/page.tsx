import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function AllTasksPage() {
  return (
    <DevelopmentPlaceholder
      title="All Tasks — Cross-Project Task Engine"
      phase="4"
      description="Consolidated task table across all authorized projects with multi-property filters, grouping, and batch operations."
      plannedFeatures={[
        'Cross-project grouping by Status, Project, Priority, or Assignee',
        'Saved view presets (My Tasks, Blocked, Overdue)',
        'Bulk status updates and reviewer assignment',
        'Export to CSV and JSON',
      ]}
    />
  );
}

