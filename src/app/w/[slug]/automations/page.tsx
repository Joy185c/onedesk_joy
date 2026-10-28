import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function AutomationsPage() {
  return (
    <DevelopmentPlaceholder
      title="Automations Studio"
      phase="7"
      description="Event-driven rule builder automating task assignments, status transitions, review routing, and notifications."
      plannedFeatures={[
        'Visual trigger-condition-action workflow builder',
        'Loop prevention and recursion limits',
        'Pre-built recipe templates (e.g. "When task is submitted for review, notify project manager")',
        'Durable execution queue with retry logs and audit trail',
      ]}
    />
  );
}

