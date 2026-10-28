import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function MyTasksPage() {
  return (
    <DevelopmentPlaceholder
      title="My Tasks Work Center"
      phase="3"
      description="Personalized contributor workspace grouping assigned deliverables by Today, Upcoming, and In Review."
      plannedFeatures={[
        'Group by Today, Upcoming, Overdue, and Completed',
        'Direct "Submit for Review" workflow button',
        'Time logging integration with live timer',
        'Subtask and checklist management',
      ]}
    />
  );
}

