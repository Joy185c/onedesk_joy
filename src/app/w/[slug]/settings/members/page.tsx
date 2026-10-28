'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { sampleUsers, currentWorkspace } from '@/lib/mockData';

interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  sentAt: string;
  token: string;
}

export default function WorkspaceMembersPage() {
  const [members, setMembers] = useState(sampleUsers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'guest'>('member');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([
    {
      id: 'inv-1',
      email: 'jordan@designco.com',
      role: 'member',
      sentAt: '2 days ago',
      token: 'tok_89a7f34c11b2',
    },
    {
      id: 'inv-2',
      email: 'liam@contractor.dev',
      role: 'guest',
      sentAt: 'Yesterday',
      token: 'tok_55e2b901fc4d',
    },
  ]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newInvite: PendingInvite = {
      id: `inv-${Date.now()}`,
      email: inviteEmail,
      role: inviteRole,
      sentAt: 'Just now',
      token: `tok_${Math.random().toString(16).substring(2, 10)}`,
    };

    setPendingInvites([newInvite, ...pendingInvites]);
    setInviteEmail('');
    alert(`Invitation sent to ${inviteEmail} with role: ${inviteRole}`);
  };

  const handleRevokeInvite = (id: string) => {
    setPendingInvites(pendingInvites.filter((inv) => inv.id !== id));
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRemoveMember = (userId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from ${currentWorkspace.name}? Their access will be immediately revoked.`)) {
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
          Manage team membership, send invitations, and configure workspace RBAC roles.
        </p>
      </div>

      {/* Invite Member Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#18251D] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#20E34A]" />
            Invite New Teammate
          </CardTitle>
          <p className="text-xs text-[#778079]">
            Invited users receive an email invitation token linked strictly to {currentWorkspace.name}.
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
                className="w-full h-9 rounded-xl border border-[#E5E9E6] bg-white px-3 text-xs text-[#18251D] focus:outline-none focus:border-[#20E34A]"
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
              className="w-full sm:w-auto h-9 font-bold px-5"
            >
              Send Invite
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
            Active members authorized to participate in projects within {currentWorkspace.name}.
          </p>
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-[#E5E9E6]">
            {members.map((member, index) => {
              const isOwner = index === 0; // Alex Sterling is owner

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
                    <select
                      disabled={isOwner}
                      defaultValue={isOwner ? 'owner' : index === 1 ? 'admin' : 'member'}
                      className="h-8 rounded-lg border border-[#E5E9E6] bg-white px-2 text-xs text-[#18251D] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                    </select>

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
                      className="text-xs gap-1.5 h-8"
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

