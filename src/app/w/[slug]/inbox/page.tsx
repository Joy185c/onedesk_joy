'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ShieldCheck,
  MessageSquare,
  FileCheck2,
  UserCheck,
  Sparkles,
  ExternalLink,
  Clock,
  Filter,
  UserPlus,
  Check,
  Copy,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { AppNotification } from '@/lib/types';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  acceptInvitationByToken,
} from '@/lib/services/collaborationService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function InboxPage() {
  const router = useRouter();
  const { workspace, refreshWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'invitations' | 'review' | 'mention'>('all');
  const [loading, setLoading] = useState(true);
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [acceptedToken, setAcceptedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadNotifs = async () => {
    try {
      const data = await getNotifications(workspace.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, [workspace.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(workspace.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptInvite = async (token: string, notifId: string) => {
    setAcceptingToken(token);
    try {
      const res = await acceptInvitationByToken(token);
      setAcceptedToken(token);
      await handleMarkAsRead(notifId);
      if (refreshWorkspace) await refreshWorkspace();

      setTimeout(() => {
        const destSlug = res?.slug || workspace.slug;
        router.push(`/w/${destSlug}`);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to accept invitation. It may be expired or already accepted.');
    } finally {
      setAcceptingToken(null);
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const invitationCount = notifications.filter(
    (n) => n.type === 'invitation' || n.linkUrl?.includes('/invite/') || n.title?.includes('Invitation')
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    const isInv = n.type === 'invitation' || n.linkUrl?.includes('/invite/') || n.title?.includes('Invitation');
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'invitations') return isInv;
    if (filterType === 'review') return n.type === 'review_requested' || n.type === 'review_decided';
    if (filterType === 'mention') return n.type === 'mention' || n.type === 'comment';
    return true;
  });

  const getIcon = (type: string, isInvite: boolean) => {
    if (isInvite) return <UserPlus className="w-4 h-4 text-[#20E34A]" />;
    switch (type) {
      case 'review_requested':
      case 'review_decided':
        return <FileCheck2 className="w-4 h-4 text-purple-600" />;
      case 'mention':
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'assigned':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#064E24]" />;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              Notification Center
            </span>
            {unreadCount > 0 && (
              <span className="text-xs font-bold text-white bg-[#082F1B] px-2 py-0.2 rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            Unified Inbox
          </h1>
          <p className="text-xs text-[#778079] mt-0.5">
            Aggregated stream for team invitations, review decisions, task assignments, and mentions.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            variant="outline"
            size="sm"
            className="font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#064E24]" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'all'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'unread'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          Unread ({unreadCount})
        </button>
        {invitationCount > 0 && (
          <button
            onClick={() => setFilterType('invitations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'invitations'
                ? 'bg-[#082F1B] text-white shadow-xs'
                : 'bg-white border border-[#C6F5CB] text-[#064E24] hover:bg-[#E9FBEA]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#20E34A]" />
            <span>Invitations ({invitationCount})</span>
          </button>
        )}
        <button
          onClick={() => setFilterType('review')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'review'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          Reviews & Approvals
        </button>
        <button
          onClick={() => setFilterType('mention')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'mention'
              ? 'bg-[#082F1B] text-white shadow-xs'
              : 'bg-white border border-[#E5E9E6] text-[#5E6962] hover:bg-[#F7F8F8]'
          }`}
        >
          Comments & Mentions
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card divide-y divide-[#E5E9E6] overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E9FBEA] text-[#064E24] flex items-center justify-center mx-auto">
              <CheckCheck className="w-6 h-6 text-[#20E34A]" />
            </div>
            <h3 className="text-sm font-bold text-[#18251D]">You're completely caught up!</h3>
            <p className="text-xs text-[#778079]">
              No notifications matching your filter.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isInvite =
              notif.type === 'invitation' ||
              notif.linkUrl?.includes('/invite/') ||
              notif.title?.includes('Invitation');
            const token = isInvite && notif.linkUrl ? notif.linkUrl.split('/invite/')[1]?.split('?')[0] : null;

            return (
              <div
                key={notif.id}
                className={`p-4 transition-colors ${
                  isInvite
                    ? 'bg-[#F4FDF5] border-l-4 border-l-[#20E34A]'
                    : notif.isRead
                    ? 'hover:bg-[#F7F8F8]'
                    : 'bg-[#E9FBEA]/30 hover:bg-[#E9FBEA]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-xl border shrink-0 mt-0.5 shadow-2xs ${
                        isInvite
                          ? 'bg-[#082F1B] border-[#14482E] text-white'
                          : 'bg-white border-[#E5E9E6]'
                      }`}
                    >
                      {getIcon(notif.type, isInvite)}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isInvite && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#20E34A]" />
                            <span>Team Invitation</span>
                          </span>
                        )}
                        {notif.actor && (
                          <UserAvatar user={notif.actor} size="xs" />
                        )}
                        <span className="text-xs font-bold text-[#18251D]">
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#20E34A] ring-2 ring-white" />
                        )}
                      </div>

                      <p className="text-xs text-[#374151] leading-relaxed">
                        {notif.body}
                      </p>

                      {/* Interactive Team Invitation Action Box */}
                      {isInvite && token && (
                        <div className="pt-2 pb-1 flex flex-wrap items-center gap-2.5">
                          {acceptedToken === token ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9FBEA] border border-[#C6F5CB] text-xs font-bold text-[#064E24]">
                              <Check className="w-4 h-4 text-[#20E34A]" />
                              <span>Joined! Redirecting to workspace...</span>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={acceptingToken === token}
                              onClick={() => handleAcceptInvite(token, notif.id)}
                              className="h-8 font-bold px-4 gap-1.5 bg-[#20E34A] text-[#082F1B] hover:bg-[#1bc641] shadow-xs"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>{acceptingToken === token ? 'Joining Workspace...' : 'Accept & Join Team'}</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(token)}
                            className="h-8 text-xs font-semibold gap-1 bg-white"
                          >
                            {copiedToken === token ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#20E34A]" />
                                <span>Copied Link</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#778079]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </Button>

                          <Link
                            href={`/invite/${token}`}
                            className="text-xs font-semibold text-[#064E24] hover:underline flex items-center gap-1 px-1.5 py-1"
                          >
                            <span>Open Invite Page</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-[#778079] pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#CBD3CE]" />
                          <span>{notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                        </span>

                        {notif.linkUrl && !isInvite && (
                          <Link
                            href={notif.linkUrl}
                            className="text-[#064E24] font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <span>View item</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 rounded-lg text-[#778079] hover:text-[#064E24] hover:bg-white transition-colors shrink-0 text-xs font-semibold"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security note */}
      <div className="p-3.5 rounded-xl bg-white border border-[#E5E9E6] flex items-center gap-2.5 text-xs text-[#778079] shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-[#064E24] shrink-0" />
        <span>
          Private project activity and direct notifications are strictly scoped by PostgreSQL Row Level Security.
        </span>
      </div>
    </div>
  );
}
