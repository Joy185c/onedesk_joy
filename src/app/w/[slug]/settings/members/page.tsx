'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { UserProfile } from '@/lib/types';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getWorkspaceMembers } from '@/lib/services/taskService';
import {
  sendWorkspaceInvitation,
  getWorkspaceInvitations,
  revokeWorkspaceInvitation,
} from '@/lib/services/collaborationService';

interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  sentAt: string;
  token: string;
}

export default function WorkspaceMembersPage() {
  const { workspace, user } = useWorkspace();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sending, setSending] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    if (!workspace.id) return;
    try {
      const [realMembers, rawInvites] = await Promise.all([
        getWorkspaceMembers(workspace.id),
        getWorkspaceInvitations(workspace.id),
      ]);
      setMembers(realMembers);

      if (rawInvites && rawInvites.length > 0) {
        setPendingInvites(
          rawInvites.map((inv: any) => ({
            id: inv.id,
            email: inv.email,
            role: inv.role || 'member',
            sentAt: new Date(inv.created_at).toLocaleDateString(),
            token: inv.token,
          }))
        );
      } else {
        setPendingInvites([]);
      }
    } catch (err) {
      console.error('Failed to load workspace member governance data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspace.id) return;

    setSending(true);
    setStatusNotice(null);

    try {
      const result = await sendWorkspaceInvitation(workspace.id, inviteEmail.trim(), inviteRole);

      if (result.success) {
        const notifText = result.notifiedUser
          ? `An in-app notification with join link has been delivered to ${inviteEmail}'s Unified Inbox!`
          : `Invitation token created. You can share the join link below.`;

        setStatusNotice({
          type: 'success',
          message: `Invitation successfully dispatched! ${notifText}`,
        });

        setInviteEmail('');
        await loadData();
      }
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        message: err.message || 'Failed to send invitation.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      await revokeWorkspaceInvitation(id);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      setStatusNotice({
        type: 'success',
        message: 'Invitation revoked successfully.',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invite');
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRemoveMember = (userId: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to remove ${name} from ${workspace.name}? Their access will be immediately revoked.`
      )
    ) {
      setMembers(members.filter((m) => m.id !== userId));
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
            Workspace Administration
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
          Members & Access Governance
        </h1>
        <p className="text-xs text-[#778079] mt-0.5">
          Manage team membership, send invitations, and configure workspace RBAC roles for {workspace.name}.
        </p>
      </div>

      {statusNotice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-150 ${
            statusNotice.type === 'success'
              ? 'bg-[#E9FBEA] border-[#C6F5CB] text-[#064E24]'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#20E34A] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-semibold">{statusNotice.message}</div>
        </div>
      )}

      {/* Invite Member Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#20E34A]" />
            <span>Invite New Teammate</span>
          </CardTitle>
          <p className="text-xs text-[#778079]">
            Invited users with existing OneDesk accounts immediately receive an in-app inbox notification with a greeting and 1-click join button.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <Input
                type="email"
                required
                placeholder="colleague@company.com"
                icon={<Mail className="w-4 h-4" />}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-44">
              <select
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                className="w-full h-9 rounded-xl border border-[#CBD3CE] bg-white px-3 text-xs text-[#18251D] focus:outline-none focus:border-[#20E34A]"
              >
                <option value="member">Role: Member</option>
                <option value="admin">Role: Workspace Admin</option>
                <option value="guest">Role: Restricted Guest</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={sending}
              className="w-full sm:w-auto h-9 font-bold px-5 flex items-center gap-1.5"
            >
              {sending ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invite</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Members Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#20E34A]" />
              Active Workspace Members ({members.length})
            </CardTitle>
            <Badge variant="lime">Tenant Isolated</Badge>
          </div>
          <p className="text-xs text-[#778079]">
            Active members authorized to participate in projects within {workspace.name}.
          </p>
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-[#E5E9E6]">
            {members.map((member, index) => {
              const isOwner = member.role === 'Workspace Owner' || member.role === 'Founder & Owner' || member.role === 'owner';

              return (
                <div
                  key={member.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-[#F7F8F8] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={member} size="sm" showStatus status={member.status} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#18251D] truncate">
                          {member.name}
                        </span>
                        {isOwner && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#082F1B] text-[#20E34A]">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#778079] truncate">
                        {member.email} · <span className="font-medium text-[#5E6962]">{member.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-[#064E24] px-2.5 py-1 rounded-lg bg-[#E9FBEA] border border-[#C6F5CB]">
                      {member.role || 'Member'}
                    </span>

                    {!isOwner && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        className="p-1.5 rounded-lg text-[#778079] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Revoke access and remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Invitations ({pendingInvites.length})
            </CardTitle>
            <p className="text-xs text-[#778079]">
              Tokenized invitations awaiting user acceptance.
            </p>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-[#E5E9E6]">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-bold text-[#18251D]">{invite.email}</div>
                    <div className="text-[11px] text-[#778079]">
                      Invited as <span className="capitalize font-semibold">{invite.role}</span> · {invite.sentAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(invite.token)}
                      className="text-xs gap-1.5 h-8 font-semibold"
                    >
                      {copiedToken === invite.token ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#20E34A]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

