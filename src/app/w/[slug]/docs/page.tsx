'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  BookOpen,
  Edit3,
  Eye,
  Trash2,
  Save,
  Check,
  FolderKanban,
  Search,
  Clock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentItem, ProjectSummary } from '@/lib/types';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from '@/lib/services/productivityService';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function DocsPage() {
  const { workspace } = useWorkspace();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIcon, setEditIcon] = useState('📄');
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load documents & projects
  useEffect(() => {
    async function init() {
      if (!workspace.id) return;
      try {
        const [docsData, projsData] = await Promise.all([
          getDocuments(workspace.id),
          getWorkspaceProjects(workspace.id),
        ]);
        setDocs(docsData);
        setProjects(projsData);
        if (docsData.length > 0) {
          selectDoc(docsData[0]);
        }
      } catch (err) {
        console.error('Failed to load docs:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [workspace.id]);

  const selectDoc = (d: DocumentItem) => {
    setSelectedDoc(d);
    setEditTitle(d.title);
    setEditContent(d.content);
    setEditIcon(d.icon || '📄');
    setIsEditing(false);
  };

  const handleCreateNew = async () => {
    if (!workspace.id) return;
    try {
      const newDoc = await createDocument({
        workspaceId: workspace.id,
        title: 'New Knowledge Note',
        content: '# New Document\n\nWrite your specification, RFC, or guidelines here.',
        icon: '📝',
      });
      setDocs([newDoc, ...docs]);
      selectDoc(newDoc);
      setIsEditing(true);
    } catch (err: any) {
      alert(err.message || 'Failed to create document');
    }
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await updateDocument(selectedDoc.id, {
        title: editTitle.trim(),
        content: editContent,
        icon: editIcon,
      });

      const updatedDoc: DocumentItem = {
        ...selectedDoc,
        title: editTitle.trim(),
        content: editContent,
        icon: editIcon,
        updatedAt: new Date().toISOString(),
      };

      setSelectedDoc(updatedDoc);
      setDocs((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(docId);
      const remaining = docs.filter((d) => d.id !== docId);
      setDocs(remaining);
      if (remaining.length > 0) {
        selectDoc(remaining[0]);
      } else {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const filteredDocs = docs.filter((d) =>
    d.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#F0F1F3] overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Left Sidebar: Document Tree & Navigator */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full md:w-80 bg-white border-r border-[#E5E9E6] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#E5E9E6] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#082F1B] text-[#20E34A] flex items-center justify-center font-bold text-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-extrabold text-[#18251D]">Knowledge & Wiki</h2>
            </div>
            <Button
              onClick={handleCreateNew}
              variant="primary"
              size="sm"
              className="font-bold flex items-center gap-1 text-xs px-2.5 py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#778079]" />
            <input
              type="text"
              placeholder="Search wiki & docs..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F7F8F8] border border-[#CBD3CE] rounded-xl text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#20E34A]"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => selectDoc(doc)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                  isSelected
                    ? 'bg-[#082F1B] text-white shadow-2xs'
                    : 'text-[#5E6962] hover:bg-[#F7F8F8] hover:text-[#18251D]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{doc.icon || '📄'}</span>
                  <div className="min-w-0 truncate">
                    <div className="truncate font-bold">{doc.title}</div>
                    {doc.projectName && (
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-[#20E34A]' : 'text-[#778079]'
                        }`}
                      >
                        {doc.projectName}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Security badge */}
        <div className="p-3 border-t border-[#E5E9E6] bg-[#F7F8F8] flex items-center gap-2 text-[10px] text-[#778079]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#064E24] shrink-0" />
          <span>Tenant & project isolated documents.</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right / Center: Document Editor & Viewer */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedDoc ? (
          <>
            {/* Document Header Controls */}
            <div className="h-16 px-6 border-b border-[#E5E9E6] flex items-center justify-between shrink-0 bg-[#F7F8F8]/60">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{isEditing ? editIcon : selectedDoc.icon}</span>
                {isEditing ? (
                  <Input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="font-extrabold text-base text-[#18251D] max-w-md h-9"
                  />
                ) : (
                  <div>
                    <h1 className="text-base font-extrabold text-[#18251D] truncate">
                      {selectedDoc.title}
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] text-[#778079]">
                      <Clock className="w-3 h-3 text-[#CBD3CE]" />
                      <span>
                        Updated {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                      </span>
                      {selectedDoc.author && (
                        <span>· by {selectedDoc.author.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {savedSuccess && (
                  <span className="text-xs font-bold text-[#064E24] bg-[#E9FBEA] px-2.5 py-1 rounded-lg flex items-center gap-1 border border-[#C6F5CB]">
                    <Check className="w-3.5 h-3.5 text-[#20E34A]" />
                    <span>Saved</span>
                  </span>
                )}

                {isEditing ? (
                  <>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      variant="primary"
                      size="sm"
                      disabled={saving || !editTitle.trim()}
                      className="font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Document</span>
                    </Button>
                    <button
                      onClick={() => handleDelete(selectedDoc.id)}
                      className="p-2 rounded-xl text-[#778079] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#E5E9E6]">
                    <span className="text-xs font-semibold text-[#778079]">Icon emoji:</span>
                    <input
                      type="text"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value.slice(0, 2))}
                      className="w-10 text-center text-sm p-1 rounded-lg border border-[#CBD3CE]"
                    />
                  </div>
                  <textarea
                    rows={22}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Write markdown content..."
                    className="w-full font-mono text-xs text-[#18251D] p-4 rounded-2xl border border-[#CBD3CE] bg-[#F7F8F8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A] leading-relaxed resize-none"
                  />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-[#18251D] space-y-4">
                  {selectedDoc.content.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('# ')) {
                      return (
                        <h1
                          key={idx}
                          className="text-2xl font-black text-[#18251D] tracking-tight pb-2 border-b border-[#E5E9E6]"
                        >
                          {paragraph.replace('# ', '')}
                        </h1>
                      );
                    }
                    if (paragraph.startsWith('## ')) {
                      return (
                        <h2
                          key={idx}
                          className="text-lg font-extrabold text-[#18251D] pt-2"
                        >
                          {paragraph.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3 key={idx} className="text-sm font-bold text-[#18251D]">
                          {paragraph.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                      return (
                        <ul key={idx} className="list-disc pl-5 space-y-1 text-xs text-[#5E6962]">
                          {paragraph.split('\n').map((li, liIdx) => (
                            <li key={liIdx}>{li.replace(/^[-*]\s*/, '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={idx} className="text-xs text-[#5E6962] leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[#778079]">
            Select or create a document to view technical specifications and wiki notes.
          </div>
        )}
      </div>
    </div>
  );
}
