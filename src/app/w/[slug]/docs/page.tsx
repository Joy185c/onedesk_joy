import { DevelopmentPlaceholder } from '@/components/ui/DevelopmentPlaceholder';

export default function DocsPage() {
  return (
    <DevelopmentPlaceholder
      title="Documents & Knowledge Base Wiki"
      phase="5"
      description="Collaborative rich-text documentation, engineering specifications, and nested project wikis."
      plannedFeatures={[
        'Tiptap collaborative editor with Markdown support',
        'Nested page hierarchy and document tree',
        'Task mentions, status tags, and code blocks',
        'Version history snapshot and restore points',
      ]}
    />
  );
}

