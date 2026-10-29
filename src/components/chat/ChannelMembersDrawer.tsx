'use client';

import React, { useState } from 'react';
import {
  X,
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserX,
  UserCheck,
  MoreVertical,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChannelMemberInfo } from '@/lib/services/collaborationService';
import { UserProfile } from '@/lib/types';

export interface ChannelMembersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  members: ChannelMemberInfo[];
  currentUser: UserProfile;
  isWorkspaceOwner: boolean;
  isChannelAdmin: boolean;
  onRemoveMember: (userId: string) => Promise<void>;
  onBlockMember: (userId: string, reason?: string) => Promise<void>;
  onUnblockMember: (userId: string) => Promise<void>;
}

export const ChannelMembersDrawer: React.FC<ChannelMembersDrawerProps> = ({
  isOpen,
  onClose,
  channelName,
  members,
  currentUser,
  isWorkspaceOwner,
  isChannelAdmin,
  onRemoveMember,
  onBlockMember,
  onUnblockMember,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'blocked'>('active');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'block';
    target: ChannelMemberInfo;
  } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const canModerate = isWorkspaceOwner || isChannelAdmin;

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.user.name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      m.user.role?.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (activeTab === 'blocked') return m.isBlocked;
    return !m.isBlocked && !m.isRemoved;
  });

  const blockedCount = members.filter((m) => m.isBlocked).length;
  const activeCount = members.filter((m) => !m.isBlocked && !m.isRemoved).length;

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      if (confirmAction.type === 'remove') {
        await onRemoveMember(confirmAction.target.user.id);
      } else if (confirmAction.type === 'block') {
        await onBlockMember(confirmAction.target.user.id, blockReason);
      }
      setConfirmAction(null);
      setBlockReason('');
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-[#CBD3CE]">
        {/* Drawer Header */}
        <div className="p-4 px-6 border-b border-[#E5E9E6] flex items-center justify-between bg-[#F7F8F8]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#064E24]" />
            <h2 className="text-base font-extrabold text-[#18251D]">
              Channel Members · #{channelName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#E5E9E6] text-[#778079] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Search Filter */}
        <div className="p-4 space-y-3 border-b border-[#E5E9E6]">
          <div className="flex items-center gap-1 bg-[#F0F1F3] p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-[#064E24] shadow-xs'
                  : 'text-[#778079] hover:text-[#18251D]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'blocked'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[#778079] hover:text-rose-700'
              }`}
            >
              Blocked ({blockedCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#778079]" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F7F8F8] border border-[#CBD3CE] rounded-xl text-xs text-[#18251D] focus:outline-none focus:ring-1 focus:ring-[#20E34A]"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-8 h-8 text-[#CBD3CE] mx-auto" />
              <p className="text-xs font-semibold text-[#778079]">
                {activeTab === 'blocked'
                  ? 'No members are currently blocked in this channel.'
                  : 'No matching members found.'}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelf = member.user.id === currentUser.id;
              const isOwner = member.channelRole === 'admin' && isWorkspaceOwner;

              return (
                <div
                  key={member.user.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-[#E5E9E6] hover:bg-[#F7F8F8] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={member.user} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#18251D] truncate">
                          {member.user.name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-mono text-[#778079] bg-[#E5E9E6] px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#778079] truncate">
                        {member.user.role || member.user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role Pill */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        member.isBlocked
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : member.channelRole === 'admin'
                          ? 'bg-[#E9FBEA] text-[#064E24] border-[#C6F5CB]'
                          : 'bg-[#F0F1F3] text-[#5E6962] border-[#E5E9E6]'
                      }`}
                    >
                      {member.isBlocked ? 'Blocked' : member.channelRole}
                    </span>

                    {/* Moderation Controls */}
                    {canModerate && !isSelf && (
                      <div className="flex items-center gap-1">
                        {member.isBlocked ? (
                          <Button
                            size="iconSm"
                            variant="outline"
                            onClick={() => onUnblockMember(member.user.id)}
                            className="text-xs text-emerald-700 hover:bg-emerald-50"
                            title="Unblock member"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="iconSm"
                              variant="ghost"
                              onClick={() => setConfirmAction({ type: 'remove', target: member })}
                              className="text-[#778079] hover:text-amber-700 hover:bg-amber-50"
                              title="Remove from channel"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="iconSm"
                              variant="ghost"
                              onClick={() => setConfirmAction({ type: 'block', target: member })}
                              className="text-[#778079] hover:text-rose-700 hover:bg-rose-50"
                              title="Block member from channel"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="p-4 border-t border-[#E5E9E6] bg-white space-y-3 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-start gap-2.5 text-xs text-rose-900 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {confirmAction.type === 'remove'
                    ? `Remove ${confirmAction.target.user.name} from #${channelName}?`
                    : `Block ${confirmAction.target.user.name} from #${channelName}?`}
                </span>
                <p className="text-[11px] text-[#778079] mt-0.5">
                  {confirmAction.type === 'remove'
                    ? 'The user will no longer see this channel. They retain workspace membership.'
                    : 'The user will be blocked from viewing, posting, or subscribing to this channel.'}
                </p>
              </div>
            </div>

            {confirmAction.type === 'block' && (
              <input
                type="text"
                placeholder="Reason for blocking (optional)..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F7F8F8] border border-[#CBD3CE] rounded-xl text-xs"
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction(null)}
                disabled={processing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExecuteAction}
                disabled={processing}
                className="text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                {processing ? 'Processing...' : confirmAction.type === 'remove' ? 'Confirm Remove' : 'Confirm Block'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
