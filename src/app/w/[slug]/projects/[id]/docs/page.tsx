'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { DocumentItem, ProjectSummary } from '@/lib/types';
import { getProjectById } from '@/lib/services/projectService';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/lib/services/productivityService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  BookOpen,
  Plus,
  Edit3,
  Save,
  Check,
  Trash2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProjectDocsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { workspace, user } = useWorkspace();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const rawProj = await getProjectById(projectId);
        if (rawProj) {
          setProject({
            id: rawProj.id,
            key: rawProj.key,
            name: rawProj.name,
            spaceId: rawProj.space_id || 'sp-general',
            health: rawProj.health || 'on_track',
            progressPercent: 50,
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            pendingReviews: 0,
            targetDate: rawProj.target_date || 'Ongoing',
            members: [],
            lead: {
              id: rawProj.lead?.id || rawProj.owner?.id || '',
              name: rawProj.lead?.full_name || rawProj.owner?.full_name || 'Lead',
              email: rawProj.lead?.email || '',
              initials: 'PL',
              role: 'Lead',
            },
          });
        }

        const projectDocs = await getDocuments(workspace.id, projectId);
        setDocs(projectDocs);
        if (projectDocs.length > 0) {
          setSelectedDoc(projectDocs[0]);
          setEditTitle(projectDocs[0].title);
          setEditContent(projectDocs[0].content);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, workspace.id]);

  const selectDoc = (d: DocumentItem) => {
    setSelectedDoc(d);
    setEditTitle(d.title);
    setEditContent(d.content);
    setIsEditing(false);
  };

  const handleCreate = async () => {
    if (!workspace.id || !project) return;
    try {
      const newDoc = await createDocument({
        workspaceId: workspace.id,
        projectId: project.id,
        title: `${project.name} Architecture Spec`,
        content: `# ${project.name} Technical Specification\n\nOutline technical architecture, endpoints, and deliverables for this project.`,
        icon: '📘',
      });
      setDocs([newDoc, ...docs]);
      selectDoc(newDoc);
      setIsEditing(true);
    } catch (err: any) {
      alert(err.message || 'Failed to create doc');
    }
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await updateDocument(selectedDoc.id, {
        title: editTitle.trim(),
        content: editContent,
      });
      const updated: DocumentItem = {
        ...selectedDoc,
        title: editTitle.trim(),
        content: editContent,
        updatedAt: new Date().toISOString(),
      };
      setSelectedDoc(updated);
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !project) {
    return <div className="p-8 text-center text-xs text-[#778079]">Loading documentation...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F0F1F3]">
      <ProjectHeader project={project} onOpenQuickCreate={() => setCreateTaskOpen(true)} />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left Doc Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-2xl border border-[#E5E9E6] p-4 shadow-card flex flex-col shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E6]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18251D] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#064E24]" />
              <span>Project Docs</span>
            </h3>
            <button
              onClick={handleCreate}
              className="p-1 rounded-lg text-[#064E24] hover:bg-[#E9FBEA]"
              title="Add Document"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pt-3">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => selectDoc(d)}
                className={`w-full text-left p-2 rounded-xl text-xs font-semibold truncate transition-colors ${
                  selectedDoc?.id === d.id
                    ? 'bg-[#082F1B] text-[#20E34A]'
                    : 'text-[#5E6962] hover:bg-[#F7F8F8]'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>
        </div>

        {/* Right Editor / Viewer */}
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E9E6] shadow-card flex flex-col overflow-hidden">
          {selectedDoc ? (
            <>
              <div className="px-6 py-4 border-b border-[#E5E9E6] flex items-center justify-between bg-[#F7F8F8]">
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="font-bold text-sm max-w-sm"
                  />
                ) : (
                  <div>
                    <h2 className="text-sm font-extrabold text-[#18251D]">{selectedDoc.title}</h2>
                    <span className="text-[10px] text-[#778079]">
                      Updated {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                      <Button onClick={handleSave} variant="primary" size="sm" disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isEditing ? (
                  <textarea
                    rows={20}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full font-mono text-xs p-4 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] resize-none focus:outline-none focus:ring-1 focus:ring-[#20E34A]"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-xs text-[#5E6962] leading-relaxed whitespace-pre-wrap">
                    {selectedDoc.content}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#778079]">
              No documents created yet for this project.
            </div>
          )}
        </div>
      </div>

      <CreateTaskModal
        isOpen={createTaskOpen}
        projectId={project.id}
        projectKey={project.key}
        projectName={project.name}
        onClose={() => setCreateTaskOpen(false)}
      />
    </div>
  );
}

