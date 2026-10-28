import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function GoalsPage() {
  return (
    <DevelopmentPlaceholder
      title="Goals & OKRs Management"
      phase="6"
      description="Strategic alignment linking high-level workspace objectives to measurable key results and project delivery milestones."
      plannedFeatures={[
        'Objective definition with target dates and owner assignments',
        'Automatic progress rollup from completed project tasks',
        'Key results tracking with numeric, percentage, and boolean metrics',
        'Quarterly OKR review cycles and status badges',
      ]}
    />
  );
}

