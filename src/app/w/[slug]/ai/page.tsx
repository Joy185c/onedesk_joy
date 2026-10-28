import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function AIAssistantPage() {
  return (
    <DevelopmentPlaceholder
      title="OneDesk AI Assistant"
      phase="7"
      description="Permission-aware natural language assistant for task generation, sprint breakdown, and delivery risk analysis."
      plannedFeatures={[
        'Natural language project and task breakdown generation',
        'Schema-validated action proposals with explicit user confirmation/diff',
        'Permission-aware context retrieval (never accesses unauthorized projects)',
        'Deadline risk detection and workload balancing recommendations',
      ]}
    />
  );
}

