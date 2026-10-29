'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Lock,
  Plus,
  Send,
  Smile,
  Paperclip,
  Search,
  Users,
  ShieldCheck,
  Pin,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Channel, ChatMessage, ProjectSummary, UserProfile } from '@/lib/types';
import {
  getWorkspaceChannels,
  getChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
  getChannelMembers,
  removeChannelMember,
  blockChannelMember,
  unblockChannelMember,
  ChannelMemberInfo,
} from '@/lib/services/collaborationService';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { getWorkspaceMembers } from '@/lib/services/taskService';
import { CreateChannelModal } from '@/components/chat/CreateChannelModal';
import { RichMessageRenderer } from '@/components/chat/RichMessageRenderer';
import { MentionSuggestions } from '@/components/chat/MentionSuggestions';
import { ChannelMembersDrawer } from '@/components/chat/ChannelMembersDrawer';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { createClient } from '@/lib/supabase/client';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '🎉'];

export default function ChatHubPage() {
  const { workspace, user } = useWorkspace();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, UserProfile>>({});
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberInfo[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number | null>(null);
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadActiveChannelMembers = async (chanId: string) => {
    if (!workspace.id || !chanId) return;
    try {
      const members = await getChannelMembers(chanId, workspace.id);
      setChannelMembers(members);
    } catch (err) {
      console.warn('Failed to load channel members:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeChannel || !workspace.id) return;
    await removeChannelMember(activeChannel.id, userId, workspace.id);
    await loadActiveChannelMembers(activeChannel.id);
  };

  const handleBlockMember = async (userId: string, reason?: string) => {
    if (!activeChannel || !workspace.id) return;
    await blockChannelMember(activeChannel.id, userId, reason, workspace.id);
    await loadActiveChannelMembers(activeChannel.id);
  };

  const handleUnblockMember = async (userId: string) => {
    if (!activeChannel || !workspace.id) return;
    await unblockChannelMember(activeChannel.id, userId, workspace.id);
    await loadActiveChannelMembers(activeChannel.id);
  };

  const currentUserChannelRole = (
    workspace.ownerId === user.id
      ? 'admin'
      : channelMembers.find((m) => m.user.id === user.id)?.channelRole || 'member'
  ) as 'admin' | 'moderator' | 'member';

  const eligibleMentionMembers = channelMembers
    .filter((m) => !m.isBlocked && !m.isRemoved)
    .map((m) => m.user);

  const filteredMentionSuggestions = eligibleMentionMembers.filter((u) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // 1. Load Channels, Projects & Workspace Members
  useEffect(() => {
    async function init() {
      if (!workspace.id) return;
      try {
        const [chans, projs, members] = await Promise.all([
          getWorkspaceChannels(workspace.id),
          getWorkspaceProjects(workspace.id),
          getWorkspaceMembers(workspace.id),
        ]);
        setChannels(chans);
        setProjects(projs);

        const map: Record<string, UserProfile> = {};
        members.forEach((m) => {
          if (m.id) map[m.id] = m;
          if (m.email) map[m.email.toLowerCase()] = m;
          if (m.name) map[m.name.toLowerCase()] = m;
        });
        setMemberMap(map);

        if (chans.length > 0 && !activeChannel) {
          setActiveChannel(chans[0]);
        }
      } catch (err) {
        console.error('Failed to init chat:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [workspace.id]);

  // 2. Load Messages when activeChannel changes
  useEffect(() => {
    if (!activeChannel) return;

    let isMounted = true;
    loadActiveChannelMembers(activeChannel.id);
    async function loadMsgs() {
      const msgs = await getChannelMessages(activeChannel!.id);
      if (isMounted) {
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
      }
    }
    loadMsgs();

    // 3. Setup Supabase Realtime Subscription
    const supabase = createClient();
    const subChannel = supabase
      .channel(`realtime:messages:${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        async () => {
          // Re-fetch to get author profile join
          const updated = await getChannelMessages(activeChannel!.id);
          if (isMounted) {
            setMessages(updated);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subChannel);
    };
  }, [activeChannel?.id]);

  const handleComposerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setInputText(val);

    const textBeforeCursor = val.slice(0, pos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(pos - match[1].length - 1);
      setMentionHighlightIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (targetUser: UserProfile) => {
    if (mentionIndex === null) return;
    const before = inputText.slice(0, mentionIndex);
    const after = inputText.slice(mentionIndex + (mentionQuery?.length || 0) + 1);
    const mentionToken = `@[${targetUser.name}](${targetUser.id}) `;
    setInputText(`${before}${mentionToken}${after}`);
    setMentionQuery(null);
    setTimeout(() => {
      if (composerRef.current) {
        composerRef.current.focus();
        const newPos = before.length + mentionToken.length;
        composerRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlightIndex((prev) => (prev + 1) % filteredMentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlightIndex(
          (prev) => (prev - 1 + filteredMentionSuggestions.length) % filteredMentionSuggestions.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentionSuggestions[mentionHighlightIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannel) return;

    const body = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMsg = await sendChatMessage({
        channelId: activeChannel.id,
        body,
      });

      // Optimistic append
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(messageId, emoji);
      // Reload messages for updated reaction tallies
      if (activeChannel) {
        const updated = await getChannelMessages(activeChannel.id);
        setMessages(updated);
      }
    } catch (err: any) {
      console.warn('Failed to toggle reaction:', err.message);
    }
  };

  // Group channels: Workspace channels vs Project channels
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (c.projectName && c.projectName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const workspaceChannels = filteredChannels.filter((c) => !c.projectId);
  const projectChannels = filteredChannels.filter((c) => c.projectId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#F0F1F3] overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Left Sidebar: Channel Navigator */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full md:w-72 bg-white border-r border-[#E5E9E6] flex flex-col shrink-0">
        {/* Header & Search */}
        <div className="p-4 border-b border-[#E5E9E6] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#082F1B] text-[#20E34A] flex items-center justify-center font-bold text-xs">
                #
              </div>
              <h2 className="text-sm font-extrabold text-[#18251D]">Chat Hub</h2>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="p-1.5 rounded-lg text-[#064E24] hover:bg-[#E9FBEA] transition-colors"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#778079]" />
            <input
              type="text"
              placeholder="Filter channels..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F7F8F8] border border-[#CBD3CE] rounded-xl text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#20E34A]"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Workspace Channels */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#778079] flex items-center justify-between">
              <span>Workspace Channels</span>
              <span className="text-[9px] bg-[#F0F1F3] px-1.5 py-0.2 rounded font-mono">
                {workspaceChannels.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {workspaceChannels.map((c) => {
                const isActive = activeChannel?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannel(c)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#082F1B] text-[#20E34A] shadow-2xs'
                        : 'text-[#5E6962] hover:bg-[#F7F8F8] hover:text-[#18251D]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {c.type === 'private' ? (
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Channels */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#778079] flex items-center justify-between">
              <span>Project Channels</span>
              <span className="text-[9px] bg-[#F0F1F3] px-1.5 py-0.2 rounded font-mono">
                {projectChannels.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {projectChannels.map((c) => {
                const isActive = activeChannel?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannel(c)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#082F1B] text-[#20E34A] shadow-2xs'
                        : 'text-[#5E6962] hover:bg-[#F7F8F8] hover:text-[#18251D]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[10px] font-bold bg-[#E9FBEA] text-[#064E24] px-1 rounded">
                        {c.projectKey}
                      </span>
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: Multi-Tenant RBAC note */}
        <div className="p-3 border-t border-[#E5E9E6] bg-[#F7F8F8] flex items-center gap-2 text-[10px] text-[#778079]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#064E24] shrink-0" />
          <span className="truncate">Scoped to authorized memberships only.</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Center: Message Stream & Composer */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col bg-[#F7F8F8] overflow-hidden">
        {activeChannel ? (
          <>
            {/* Top Channel Header */}
            <div className="h-14 px-6 border-b border-[#E5E9E6] bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-[#18251D] flex items-center gap-1">
                    <span className="text-[#064E24]">#</span>
                    {activeChannel.name}
                  </span>
                  {activeChannel.projectKey && (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[#082F1B] text-[#20E34A]">
                      {activeChannel.projectKey}
                    </span>
                  )}
                </div>
                {activeChannel.topic && (
                  <span className="hidden sm:inline-block text-xs text-[#778079] border-l border-[#CBD3CE] pl-3">
                    {activeChannel.topic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMembersDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD3CE] bg-[#F7F8F8] hover:bg-[#E9FBEA] hover:border-[#20E34A] text-xs font-semibold text-[#18251D] transition-colors"
                  title="Channel Members"
                >
                  <Users className="w-3.5 h-3.5 text-[#064E24]" />
                  <span>Members</span>
                  <span className="bg-white border border-[#CBD3CE] text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                    {channelMembers.filter((m) => !m.isRemoved && !m.isBlocked).length}
                  </span>
                </button>
                <button
                  onClick={() => setShowChannelInfo(!showChannelInfo)}
                  className={`p-2 rounded-xl transition-colors ${
                    showChannelInfo
                      ? 'bg-[#E9FBEA] text-[#064E24]'
                      : 'text-[#778079] hover:bg-[#F0F1F3]'
                  }`}
                  title="Channel Information"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Channel Welcome Banner */}
              <div className="p-4 rounded-2xl bg-white border border-[#CBD3CE] shadow-2xs space-y-1 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#18251D]">
                  <Hash className="w-4 h-4 text-[#20E34A]" />
                  <span>Welcome to #{activeChannel.name}!</span>
                </div>
                <p className="text-xs text-[#778079]">
                  {activeChannel.description || 'This is the start of the channel discussion.'}
                </p>
              </div>

              {messages.map((msg) => {
                const isAuthor =
                  (Boolean(msg.author?.id) && Boolean(user?.id) && msg.author.id === user.id) ||
                  (Boolean(msg.author?.email) && Boolean(user?.email) && msg.author.email.toLowerCase() === user.email.toLowerCase()) ||
                  (Boolean(msg.author?.name) && Boolean(user?.name) && msg.author.name.trim().toLowerCase() === user.name.trim().toLowerCase());

                const authorId = msg.author?.id?.trim();
                const authorEmail = msg.author?.email?.trim().toLowerCase();
                const authorName = msg.author?.name?.trim().toLowerCase();

                const matchedMember: UserProfile | undefined =
                  (authorId ? memberMap[authorId] : undefined) ||
                  (authorEmail ? memberMap[authorEmail] : undefined) ||
                  (authorName ? memberMap[authorName] : undefined);

                const resolvedAvatarUrl = isAuthor
                  ? (user.avatarUrl || msg.author?.avatarUrl || matchedMember?.avatarUrl)
                  : (msg.author?.avatarUrl || matchedMember?.avatarUrl);

                const authorWithAvatar: UserProfile = {
                  ...msg.author,
                  name: msg.author?.name || matchedMember?.name || (isAuthor ? user.name : 'Team Member'),
                  avatarUrl: resolvedAvatarUrl,
                };

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex items-end gap-2.5 my-3 ${
                      isAuthor ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Author Avatar with image support & error fallback */}
                    <div className="shrink-0 mb-1">
                      <UserAvatar
                        user={authorWithAvatar}
                        size="sm"
                        showStatus={false}
                        className="shadow-2xs ring-2 ring-white"
                      />
                    </div>

                    {/* Message Bubble Column */}
                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
                        isAuthor ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Author Name for incoming messages */}
                      {!isAuthor && (
                        <span className="text-[11px] font-bold text-[#064E24] mb-0.5 ml-1">
                          {authorWithAvatar.name}
                        </span>
                      )}

                      {/* Bubble */}
                      <div
                        className={`relative p-3 rounded-2xl shadow-2xs leading-relaxed text-xs md:text-sm ${
                          isAuthor
                            ? 'bg-[#E9FBEA] text-[#18251D] border border-[#BCEEBF] rounded-br-xs'
                            : 'bg-white text-[#18251D] border border-[#CBD3CE] rounded-bl-xs'
                        }`}
                      >
                        <RichMessageRenderer content={msg.body} isCurrentUser={isAuthor} />

                        <div
                          className={`flex items-center gap-1.5 mt-1 text-[10px] font-mono ${
                            isAuthor ? 'justify-end text-[#5E6962]' : 'justify-start text-[#778079]'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isAuthor && (
                            <CheckCheck className="w-3.5 h-3.5 text-[#064E24] inline ml-0.5" />
                          )}
                          {msg.isPinned && (
                            <span className="flex items-center gap-0.5 text-amber-700 font-bold bg-amber-50 px-1 rounded">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reactions Row */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div
                          className={`flex flex-wrap gap-1 mt-1 ${
                            isAuthor ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.reactions.map((r) => {
                            const hasReacted = r.userIds.includes(user.id);
                            return (
                              <button
                                key={r.emoji}
                                onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                                  hasReacted
                                    ? 'bg-[#E9FBEA] border-[#20E34A] text-[#064E24]'
                                    : 'bg-white border-[#E5E9E6] text-[#5E6962] hover:border-[#CBD3CE]'
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span>{r.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hover Reaction Action Toolbar */}
                    <div
                      className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-[#CBD3CE] rounded-xl shadow-xs px-1.5 py-1 flex items-center gap-1 z-10 ${
                        isAuthor ? 'right-[calc(100%+0.5rem)]' : 'left-[calc(100%+0.5rem)]'
                      }`}
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="hover:scale-125 transition-transform p-0.5 text-xs"
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Bar */}
            <div className="p-4 bg-white border-t border-[#E5E9E6] shrink-0">
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="relative">
                  {mentionQuery !== null && (
                    <MentionSuggestions
                      members={channelMembers.filter((m) => !m.isBlocked && !m.isRemoved).map((m) => m.user)}
                      query={mentionQuery}
                      selectedIndex={mentionHighlightIndex}
                      onSelect={insertMention}
                      onClose={() => setMentionQuery(null)}
                    />
                  )}
                  <textarea
                    ref={composerRef}
                    rows={2}
                    value={inputText}
                    onChange={handleComposerChange}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={`Message #${activeChannel.name}... (Press @ to mention teammates, Enter to send)`}
                    className="w-full px-4 py-3 rounded-2xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A] placeholder:text-[#778079] resize-none"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!inputText.trim() || sending}
                      className="font-bold flex items-center gap-1 px-3 py-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[#778079]">
            Select a channel from the sidebar to start collaborating.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right Drawer: Channel Details (Collapsible) */}
      {/* ------------------------------------------------------------------ */}
      {showChannelInfo && activeChannel && (
        <div className="w-72 bg-white border-l border-[#E5E9E6] p-4 flex flex-col shrink-0 animate-in slide-in-from-right duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E6]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18251D]">
              Channel Details
            </h3>
            <button
              onClick={() => setShowChannelInfo(false)}
              className="text-[#778079] hover:text-[#18251D]"
            >
              ×
            </button>
          </div>

          <div className="py-4 space-y-4 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase text-[#778079] mb-1">
                Name & Topic
              </span>
              <div className="font-bold text-[#18251D]">#{activeChannel.name}</div>
              <div className="text-[#5E6962] text-[11px] mt-0.5">
                {activeChannel.topic || 'No topic set'}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase text-[#778079] mb-1">
                Description
              </span>
              <div className="text-[#5E6962] text-[11px] leading-relaxed">
                {activeChannel.description || 'No description provided.'}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase text-[#778079] mb-1">
                Security & Scope
              </span>
              <div className="p-2.5 rounded-xl bg-[#E9FBEA] border border-[#C6F5CB] text-[11px] text-[#064E24] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#20E34A]" />
                  <span>RLS Isolation Enforced</span>
                </div>
                <div>
                  Only authenticated workspace members with project clearance can inspect or post messages.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel Members & Moderation Drawer */}
      <ChannelMembersDrawer
        isOpen={showMembersDrawer}
        onClose={() => setShowMembersDrawer(false)}
        channelName={activeChannel?.name || ''}
        members={channelMembers}
        currentUser={user}
        isWorkspaceOwner={workspace.ownerId === user.id}
        isChannelAdmin={currentUserChannelRole === 'admin'}
        onRemoveMember={handleRemoveMember}
        onBlockMember={handleBlockMember}
        onUnblockMember={handleUnblockMember}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={createModalOpen}
        projects={projects}
        onClose={() => setCreateModalOpen(false)}
        onChannelCreated={(newChan) => {
          setChannels((prev) => [...prev, newChan]);
          setActiveChannel(newChan);
        }}
      />
    </div>
  );
}
