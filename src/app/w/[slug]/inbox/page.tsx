import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function InboxPage() {
  return (
    <DevelopmentPlaceholder
      title="Unified Inbox & Notification Center"
      phase="5"
      description="Aggregated notification hub for task assignments, review decisions, mentions, and project updates."
      plannedFeatures={[
        'Unread count badges per user',
        'Direct deep-linking to tasks and approval requests',
        'Filter by Mentions, Assignments, and System Alerts',
        'Mark all as read and custom retention preferences',
      ]}
    />
  );
}

