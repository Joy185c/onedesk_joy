import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function TimeTrackingPage() {
  return (
    <DevelopmentPlaceholder
      title="Time Tracking & Timesheets"
      phase="6"
      description="Workload accounting, live task timers, manual timesheet entries, and member capacity analytics."
      plannedFeatures={[
        'Live task timer with pause/resume and desktop notification',
        'Weekly timesheet grid with submission and manager approval',
        'Time estimates vs actuals variance reporting',
        'Exportable timesheet audit summaries (zero billing/invoicing logic)',
      ]}
    />
  );
}

