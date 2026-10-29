'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Plus,
  CheckSquare,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AIProposalPlan, TaskPriority } from '@/lib/types';
import {
  getAIWorkspaceContext,
  generateAIProposal,
  applyAIProposal,
} from '@/lib/services/aiService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  proposal?: AIProposalPlan;
  timestamp: string;
}

export default function AIAssistantPage() {
  const { workspace } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);
  const [selectedTasksMap, setSelectedTasksMap] = useState<Record<string, number[]>>({});
  const [expandedTasksMap, setExpandedTasksMap] = useState<Record<string, boolean>>({});
  const [contextStats, setContextStats] = useState<{
    workspaceName: string;
    projectCount: number;
    taskCount: number;
    overdueCount: number;
    projects: { id: string; name: string; key: string }[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workspace.id) {
      getAIWorkspaceContext(workspace.id).then((ctx) => {
        setContextStats(ctx);
        // Welcome message
        setMessages([
          {
            id: 'welcome',
            sender: 'assistant',
            content: `Hello! I am your OneDesk AI Delivery Assistant for **${workspace.name}**. I analyze project workload, generate structured sprint deliverables, and detect delivery risks. Every action requires your explicit confirmation before anything is written to the database.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      });
    }
  }, [workspace.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSendPrompt = async (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || !workspace.id || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsGenerating(true);

    try {
      // 1. Generate schema-validated proposal with NO write before confirmation (Blueprint T14)
      const proposal = await generateAIProposal(
        workspace.id,
        textToSend,
        contextStats?.projects[0]?.id
      );

      // Default select all proposed tasks
      setSelectedTasksMap((prev) => ({
        ...prev,
        [proposal.id]: proposal.tasks.map((_, i) => i),
      }));

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        content: proposal.summary,
        proposal,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content: `I encountered an error generating the proposal: ${err.message || 'Please try again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTaskSelection = (proposalId: string, taskIndex: number) => {
    setSelectedTasksMap((prev) => {
      const current = prev[proposalId] || [];
      const updated = current.includes(taskIndex)
        ? current.filter((i) => i !== taskIndex)
        : [...current, taskIndex];
      return { ...prev, [proposalId]: updated };
    });
  };

  const handleApplyProposal = async (proposal: AIProposalPlan) => {
    const selected = selectedTasksMap[proposal.id] || [];
    if (selected.length === 0) {
      alert('Please select at least one deliverable to commit.');
      return;
    }

    try {
      const res = await applyAIProposal(workspace.id, proposal, selected);
      setAppliedProposalIds((prev) => [...prev, proposal.id]);

      // Add confirmation message in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `conf-${Date.now()}`,
          sender: 'assistant',
          content: `Successfully committed **${res.createdTaskCount} deliverable(s)** to project **${proposal.projectName}** with full audit logging! You can now track and assign them in your task boards.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to apply AI proposal.');
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="urgent">Urgent</Badge>;
      case 'high':
        return <Badge variant="high">High</Badge>;
      case 'medium':
        return <Badge variant="medium">Medium</Badge>;
      case 'low':
        return <Badge variant="low">Low</Badge>;
      default:
        return null;
    }
  };

  const QUICK_PROMPTS = [
    'Breakdown Sprint Deliverables for Project',
    'Analyze Deadline Risks & Bottlenecks',
    'Generate QA Acceptance Checklist',
    'Daily Standup & Workload Summary',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header & Permission Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E5E9E6] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#082F1B] text-[#20E34A] flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-[#18251D]">OneDesk AI Assistant</h1>
              <Badge variant="default" className="text-[10px] bg-[#F7F8F8] border-[#CBD3CE] text-[#064E24] font-bold">
                Permission-Aware
              </Badge>
            </div>
            <p className="text-xs text-[#778079]">
              Strictly scoped to <strong>{workspace.name}</strong> • Schema-validated preview before commit
            </p>
          </div>
        </div>

        {/* Live Workspace Context Stats */}
        {contextStats && (
          <div className="flex items-center gap-2 text-xs bg-[#F7F8F8] px-3 py-1.5 rounded-xl border border-[#E5E9E6]">
            <span className="font-semibold text-[#18251D]">{contextStats.projectCount} Projects</span>
            <span className="text-[#CBD3CE]">·</span>
            <span className="font-semibold text-[#18251D]">{contextStats.taskCount} Deliverables</span>
            {contextStats.overdueCount > 0 && (
              <>
                <span className="text-[#CBD3CE]">·</span>
                <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md text-[10px]">
                  {contextStats.overdueCount} Overdue
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-[#778079] uppercase tracking-wider shrink-0 mr-1">
          Suggested:
        </span>
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendPrompt(prompt)}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#CBD3CE] hover:border-[#20E34A] hover:bg-[#F7F8F8] text-[#18251D] font-semibold transition-colors shrink-0 shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[#082F1B] text-[#20E34A] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-3xl space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Text Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#082F1B] text-white font-medium rounded-tr-none shadow-xs'
                      : 'bg-white text-[#18251D] border border-[#E5E9E6] rounded-tl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-[10px] mt-2 font-mono ${
                      isUser ? 'text-[#8E9891]' : 'text-[#778079]'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Proposal Card (Blueprint T14: Interactive Diff & Review Gate) */}
                {msg.proposal && (
                  <div className="bg-white border-2 border-[#CBD3CE] rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-[#E5E9E6] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[#064E24] bg-[#20E34A]/20 px-2 py-0.5 rounded-full uppercase">
                            AI Proposal Review
                          </span>
                          <span className="text-xs font-bold text-[#778079]">
                            Target: {msg.proposal.projectName}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-[#18251D] mt-1">
                          {msg.proposal.title}
                        </h3>
                      </div>

                      {appliedProposalIds.includes(msg.proposal.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E24] bg-[#20E34A]/20 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-4 h-4 text-[#064E24]" />
                          Committed to DB
                        </span>
                      ) : (
                        <Badge variant="default" className="text-xs bg-[#F7F8F8]">
                          Pending Confirmation
                        </Badge>
                      )}
                    </div>

                    {/* Delivery Risks / Recommendations */}
                    {msg.proposal.risks && msg.proposal.risks.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Identified Risk:</strong>
                          <span>{msg.proposal.risks[0]}</span>
                        </div>
                      </div>
                    )}

                    {/* Proposed Deliverables Diff Checklist */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#5E6962]">
                        <span>Proposed Deliverables ({msg.proposal.tasks.length})</span>
                        <span className="text-[11px] text-[#778079]">
                          {selectedTasksMap[msg.proposal.id]?.length || 0} selected
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {msg.proposal.tasks.map((task, idx) => {
                          const isSelected = (selectedTasksMap[msg.proposal!.id] || []).includes(
                            idx
                          );
                          const isExpanded = expandedTasksMap[`${msg.proposal!.id}-${idx}`];
                          const isCommitted = appliedProposalIds.includes(msg.proposal!.id);

                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-[#F7F8F8] border-[#CBD3CE]'
                                  : 'bg-white border-[#E5E9E6] opacity-60'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  disabled={isCommitted}
                                  checked={isSelected}
                                  onChange={() => handleToggleTaskSelection(msg.proposal!.id, idx)}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#064E24] focus:ring-[#20E34A] cursor-pointer"
                                />

                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-xs text-[#18251D]">
                                      {task.title}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {getPriorityBadge(task.priority)}
                                      {task.storyPoints && (
                                        <span className="text-[10px] font-mono font-semibold bg-white border border-[#CBD3CE] px-1.5 py-0.5 rounded">
                                          {task.storyPoints} pts
                                        </span>
                                      )}
                                      {task.estimatedHours && (
                                        <span className="text-[10px] font-mono text-[#778079]">
                                          ~{task.estimatedHours}h
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-[#5E6962] leading-relaxed">
                                    {task.description}
                                  </p>

                                  {/* Subtasks dropdown */}
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <div className="pt-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedTasksMap((prev) => ({
                                            ...prev,
                                            [`${msg.proposal!.id}-${idx}`]: !isExpanded,
                                          }))
                                        }
                                        className="text-[10px] font-bold text-[#064E24] hover:underline flex items-center gap-1"
                                      >
                                        <span>
                                          {task.subtasks.length} Subtasks included
                                        </span>
                                        {isExpanded ? (
                                          <ChevronUp className="w-3 h-3" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3" />
                                        )}
                                      </button>

                                      {isExpanded && (
                                        <ul className="mt-1.5 space-y-1 pl-4 list-disc text-[11px] text-[#5E6962]">
                                          {task.subtasks.map((st, sIdx) => (
                                            <li key={sIdx}>{st}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explicit Confirmation Actions */}
                    {!appliedProposalIds.includes(msg.proposal.id) ? (
                      <div className="pt-3 border-t border-[#E5E9E6] flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] text-[#778079] flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#064E24]" />
                          Database write occurs only after confirmation.
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleApplyProposal(msg.proposal!)}
                            className="bg-[#20E34A] text-[#082F1B] hover:bg-[#1bc740] font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                          >
                            <CheckSquare className="w-4 h-4 mr-1.5" />
                            <span>
                              Apply & Commit ({selectedTasksMap[msg.proposal.id]?.length || 0})
                            </span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-[#E5E9E6] flex items-center justify-between">
                        <span className="text-xs text-[#064E24] font-semibold">
                          Tasks are now live in the project backlog.
                        </span>
                        <Link
                          href={`/w/${workspace.slug}/tasks`}
                          className="text-xs font-bold text-[#082F1B] hover:text-[#064E24] flex items-center gap-1"
                        >
                          <span>View in All Deliverables</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-[#E5E9E6] text-[#18251D] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex gap-3 items-center text-xs text-[#778079] animate-pulse pl-1">
            <div className="w-7 h-7 rounded-full bg-[#082F1B] text-[#20E34A] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>Analyzing workspace context and structuring action proposal...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#CBD3CE] shadow-md focus-within:ring-2 focus-within:ring-[#20E34A]/50 focus-within:border-[#20E34A]"
        >
          <Input
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. Breakdown MVP roadmap into sprints, analyze overdue risks, or create QA checklist..."
            className="border-0 shadow-none focus-visible:ring-0 text-xs md:text-sm px-3"
          />

          <Button
            type="submit"
            disabled={!inputPrompt.trim() || isGenerating}
            className="bg-[#082F1B] text-[#20E34A] hover:bg-[#064E24] font-bold h-10 w-10 p-0 rounded-xl shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
