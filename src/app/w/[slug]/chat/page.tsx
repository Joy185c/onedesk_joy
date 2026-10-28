import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function ChatPage() {
  return (
    <DevelopmentPlaceholder
      title="Team Chat Hub & Real-time Messaging"
      phase="5"
      description="Real-time threaded collaboration with project-specific channels, direct messages, and task integrations."
      plannedFeatures={[
        'Project channels (#general, #design, #dev) isolated by project membership',
        'Direct 1-on-1 and group messaging with online presence indicators',
        'Threaded replies, reactions, task previews, and attachments',
        'Immediate revocation: removed members lose channel access instantly',
      ]}
    />
  );
}

