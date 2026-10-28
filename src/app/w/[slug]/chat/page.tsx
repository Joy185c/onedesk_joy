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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Channel, ChatMessage, ProjectSummary } from '@/lib/types';
import {
  getWorkspaceChannels,
  getChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
} from '@/lib/services/collaborationService';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { CreateChannelModal } from '@/components/chat/CreateChannelModal';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { createClient } from '@/lib/supabase/client';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '🎉'];

export default function ChatHubPage() {
  const { workspace, user } = useWorkspace();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Load Channels & Projects
  useEffect(() => {
    async function init() {
      if (!workspace.id) return;
      try {
        const [chans, projs] = await Promise.all([
          getWorkspaceChannels(workspace.id),
          getWorkspaceProjects(workspace.id),
        ]);
        setChannels(chans);
        setProjects(projs);
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

  // Send message
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
                const isAuthor = msg.author.id === user.id;

                return (
                  <div
                    key={msg.id}
                    className="group relative flex items-start gap-3 p-2 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {/* Author Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[#082F1B] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {msg.author.initials}
                    </div>

                    {/* Message Body & Metadata */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#18251D]">
                          {msg.author.name}
                        </span>
                        <span className="text-[10px] text-[#778079]">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.isPinned && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#18251D] leading-relaxed whitespace-pre-wrap">
                        {msg.body}
                      </div>

                      {/* Reactions Row */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {msg.reactions.map((r) => {
                            const hasReacted = r.userIds.includes(user.id);
                            return (
                              <button
                                key={r.emoji}
                                onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
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
                    <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-[#CBD3CE] rounded-xl shadow-xs px-1.5 py-1 flex items-center gap-1">
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
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Message #${activeChannel.name}... (Press Enter to send)`}
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
