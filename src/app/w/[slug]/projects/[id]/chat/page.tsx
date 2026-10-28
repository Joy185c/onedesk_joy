'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { Hash, Send, Pin, ShieldCheck, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Channel, ChatMessage, ProjectSummary } from '@/lib/types';
import { sampleProjects } from '@/lib/mockData';
import { getProjectById } from '@/lib/services/projectService';
import {
  getProjectChannel,
  getChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
} from '@/lib/services/collaborationService';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { createClient } from '@/lib/supabase/client';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '👀', '🎉'];

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { workspace, user, isDemoMode } = useWorkspace();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    async function load() {
      try {
        if (isDemoMode || projectId.startsWith('prj-') || projectId.startsWith('proj-')) {
          const p = sampleProjects.find((sp) => sp.id === projectId) || sampleProjects[0];
          setProject(p);
        } else {
          const rawProj = await getProjectById(projectId);
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

        // Fetch project channel
        const projChan = await getProjectChannel(projectId);
        setChannel(projChan);

        if (projChan) {
          const msgs = await getChannelMessages(projChan.id);
          setMessages(msgs);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.error('Failed to load project chat:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, isDemoMode]);

  // Realtime subscription
  useEffect(() => {
    if (!channel) return;

    const supabase = createClient();
    const subChannel = supabase
      .channel(`realtime:project_messages:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async () => {
          const updated = await getChannelMessages(channel.id);
          setMessages(updated);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
    };
  }, [channel?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !channel) return;

    const body = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMsg = await sendChatMessage({
        channelId: channel.id,
        body,
      });
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(messageId, emoji);
      if (channel) {
        const updated = await getChannelMessages(channel.id);
        setMessages(updated);
      }
    } catch (err: any) {
      console.warn(err.message);
    }
  };

  if (loading || !project) {
    return (
      <div className="p-8 text-center text-xs text-[#778079]">
        Loading project collaboration hub...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F0F1F3]">
      <ProjectHeader
        project={project}
        onOpenQuickCreate={() => setCreateTaskOpen(true)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E9E6] shadow-card flex flex-col overflow-hidden">
          {/* Channel Bar */}
          <div className="px-6 py-3 border-b border-[#E5E9E6] bg-[#F7F8F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-[#082F1B] text-[#20E34A] px-2 py-0.5 rounded-md">
                {project.key}
              </span>
              <span className="text-sm font-bold text-[#18251D] flex items-center gap-1">
                <Hash className="w-4 h-4 text-[#064E24]" />
                {channel?.name || 'general'}
              </span>
              <span className="text-xs text-[#778079] hidden sm:inline">
                · Dedicated project collaboration channel
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#064E24] bg-[#E9FBEA] px-2.5 py-1 rounded-full border border-[#C6F5CB]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#20E34A]" />
              <span>Project Isolation Active</span>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#E9FBEA] text-[#064E24] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6 text-[#20E34A]" />
                </div>
                <h3 className="text-sm font-bold text-[#18251D]">
                  No messages yet in #{channel?.name || 'general'}
                </h3>
                <p className="text-xs text-[#778079] max-w-sm mx-auto">
                  Start the discussion with the project team. All messages are securely scoped to this deliverable.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="group relative flex items-start gap-3 p-2 rounded-xl hover:bg-[#F7F8F8] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#082F1B] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {msg.author.initials}
                  </div>

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
                                  : 'bg-white border-[#E5E9E6] text-[#5E6962]'
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

                  <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-[#CBD3CE] rounded-xl shadow-xs px-1.5 py-1 flex items-center gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform p-0.5 text-xs"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="p-4 bg-white border-t border-[#E5E9E6]">
            <form onSubmit={handleSendMessage} className="relative">
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
                placeholder={`Message #${channel?.name || 'general'}...`}
                className="w-full px-4 py-3 rounded-2xl border border-[#CBD3CE] bg-[#F7F8F8] text-xs text-[#18251D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#20E34A] resize-none"
              />
              <div className="absolute right-3 bottom-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!inputText.trim() || sending}
                  className="font-bold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </Button>
              </div>
            </form>
          </div>
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

