'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Shield,
  Trash2,
  Search,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getWorkspaceEligibleMembers,
} from '@/lib/services/projectService';
import { ProjectMemberDetail, ProjectRole, UserProfile } from '@/lib/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onMembersUpdated?: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  onMembersUpdated,
}) => {
  const { workspace, user: currentUser } = useWorkspace();

  const [members, setMembers] = useState<ProjectMemberDetail[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('contributor');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [currMembers, eligible] = await Promise.all([
        getProjectMembers(projectId),
        getWorkspaceEligibleMembers(workspace.id, projectId),
      ]);
      setMembers(currMembers);
      setEligibleUsers(eligible);
      if (eligible.length > 0) {
        setSelectedUserId(eligible[0].id);
      } else {
        setSelectedUserId('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, projectId, workspace.id]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await addProjectMember(projectId, selectedUserId, selectedRole);
      setSuccessMsg('Member successfully added to project.');
      await loadData();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add member to project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await updateProjectMemberRole(projectId, userId, newRole);
      await loadData();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update member role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      await removeProjectMember(projectId, userId);
      setSuccessMsg(`${memberName} removed from project.`);
      await loadData();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.user.name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeClass = (role: ProjectRole) => {
    switch (role) {
      case 'owner':
        return 'bg-[#E9FBEA] text-[#064E24] border-[#C6F5CB]';
      case 'manager':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'contributor':
        return 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
      case 'viewer':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      default:
        return 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E6] bg-[#F7F8F8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E9FBEA] text-[#064E24]">
              <Users className="w-5 h-5 text-[#20E34A]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#18251D]">Project Team & Roles</h2>
              <p className="text-xs text-[#778079]">
                Project: <span className="font-semibold text-[#064E24]">{projectName}</span> · {members.length} members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#778079] hover:text-[#18251D] hover:bg-[#E5E9E6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#E9FBEA] border border-[#C6F5CB] text-xs text-[#064E24] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-[#20E34A]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add New Member Section */}
          <div className="bg-[#F7F8F8] border border-[#E5E9E6] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#18251D] flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#064E24]" />
                <span>Add Workspace Teammate to Project</span>
              </h3>
              <Link
                href={`/w/${workspace.slug}/settings/members`}
                className="text-[11px] text-[#064E24] hover:underline flex items-center gap-1"
                onClick={onClose}
              >
                <span>Invite new to workspace</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {eligibleUsers.length > 0 ? (
              <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 bg-white border border-[#E5E9E6] rounded-xl px-3 py-2 text-xs text-[#18251D] focus:outline-hidden focus:border-[#20E34A]"
                >
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email || u.role})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  className="bg-white border border-[#E5E9E6] rounded-xl px-3 py-2 text-xs text-[#18251D] focus:outline-hidden focus:border-[#20E34A]"
                >
                  <option value="contributor">Contributor</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                  <option value="owner">Project Lead</option>
                </select>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={actionLoading || !selectedUserId}
                  className="font-bold flex items-center gap-1 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </Button>
              </form>
            ) : (
              <p className="text-xs text-[#778079]">
                All active workspace members are already assigned to this project.
              </p>
            )}
          </div>

          {/* Current Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#18251D]">
                Current Project Members ({members.length})
              </h3>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#778079]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter team..."
                  className="h-8 pl-8 text-xs bg-white border-[#E5E9E6]"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#778079] space-y-2">
                <div className="w-6 h-6 border-2 border-[#20E34A] border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading project members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#778079]">
                No members found matching your filter.
              </div>
            ) : (
              <div className="divide-y divide-[#E5E9E6] border border-[#E5E9E6] rounded-xl overflow-hidden bg-white">
                {filteredMembers.map((m) => {
                  const isCurrent = m.userId === currentUser.id;
                  const isLead = m.role === 'owner';

                  return (
                    <div
                      key={m.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-[#F9FAF9] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          user={m.user}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#18251D] truncate">
                              {m.user.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-[#E9FBEA] text-[#064E24] px-1.5 py-0.2 rounded-md font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#778079] truncate">
                            {m.user.email || m.jobTitle || 'Team Member'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Role selector */}
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as ProjectRole)}
                          disabled={actionLoading}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold focus:outline-hidden ${getRoleBadgeClass(
                            m.role
                          )}`}
                        >
                          <option value="owner">Project Lead</option>
                          <option value="manager">Manager</option>
                          <option value="contributor">Contributor</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveMember(m.userId, m.user.name)}
                          disabled={actionLoading || (isLead && members.filter((x) => x.role === 'owner').length <= 1)}
                          title={
                            isLead && members.filter((x) => x.role === 'owner').length <= 1
                              ? 'Cannot remove sole Project Lead'
                              : 'Remove from project'
                          }
                          className="p-1.5 rounded-lg text-[#778079] hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5E9E6] bg-[#F7F8F8] flex items-center justify-end">
          <Button onClick={onClose} variant="outline" size="sm" className="font-semibold">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
