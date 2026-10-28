import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function CalendarPage() {
  return (
    <DevelopmentPlaceholder
      title="Workspace Calendar & Timeline Schedule"
      phase="4"
      description="Interactive multi-project calendar view mapping milestones, task deadlines, and team deliverables."
      plannedFeatures={[
        'Month, week, and day scheduling grids',
        'Direct drag-and-drop due date re-scheduling',
        'Milestone flags and release targets',
        'External iCal synchronization',
      ]}
    />
  );
}

