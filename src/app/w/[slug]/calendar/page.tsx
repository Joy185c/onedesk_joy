'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Flag,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent, ProjectSummary } from '@/lib/types';
import { getCalendarEvents } from '@/lib/services/productivityService';
import { getWorkspaceProjects } from '@/lib/services/projectService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPage() {
  const { workspace } = useWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function load() {
      if (!workspace.id) return;
      try {
        const [evs, projs] = await Promise.all([
          getCalendarEvents(workspace.id),
          getWorkspaceProjects(workspace.id),
        ]);
        setEvents(evs);
        setProjects(projs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspace.id]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateStr: prevMonthDate.toISOString().split('T')[0],
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month, d);
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      dateStr: curDate.toISOString().split('T')[0],
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month + 1, d);
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateStr: nextDate.toISOString().split('T')[0],
    });
  }

  const filteredEvents = selectedProjectFilter
    ? events.filter((e) => e.projectId === selectedProjectFilter)
    : events;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              Unified Schedule
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            Delivery Calendar
          </h1>
          <p className="text-xs text-[#778079] mt-0.5">
            Aggregated deliverables, milestone deadlines, and sprint targets across {workspace.name}.
          </p>
        </div>

        {/* Calendar Nav Controls */}
        <div className="flex items-center gap-2">
          <select
            className="h-9 px-3 rounded-xl border border-[#CBD3CE] bg-white text-xs font-semibold text-[#18251D] focus:ring-1 focus:ring-[#20E34A]"
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          <Button
            onClick={handleToday}
            variant="outline"
            size="sm"
            className="text-xs font-bold"
          >
            Today
          </Button>

          <div className="flex items-center rounded-xl border border-[#CBD3CE] bg-white overflow-hidden shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-[#F7F8F8] transition-colors text-[#5E6962]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-extrabold text-[#18251D] min-w-[130px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-[#F7F8F8] transition-colors text-[#5E6962]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] shadow-card overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-[#E5E9E6] bg-[#F7F8F8] text-center text-[11px] font-bold uppercase tracking-wider text-[#778079] py-2.5">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E9E6]">
          {calendarDays.map((cell, idx) => {
            const dayEvents = filteredEvents.filter((e) => e.date === cell.dateStr);
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                  cell.isCurrentMonth ? 'bg-white' : 'bg-[#FAFAFA] opacity-60'
                } hover:bg-[#F7F8F8]/80`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      isToday
                        ? 'bg-[#082F1B] text-[#20E34A] shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-[#18251D]'
                        : 'text-[#8E9891]'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-[#778079]">
                      {dayEvents.length} items
                    </span>
                  )}
                </div>

                {/* Day Events Stack */}
                <div className="flex-1 space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const isMilestone = event.type === 'milestone';
                    const isGoal = event.type === 'goal';
                    return (
                      <div
                        key={event.id}
                        className={`px-1.5 py-1 rounded-md text-[10px] font-semibold truncate flex items-center gap-1 border shadow-2xs ${
                          isMilestone
                            ? 'bg-[#E9FBEA] text-[#064E24] border-[#C6F5CB]'
                            : isGoal
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : event.priority === 'urgent'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : event.priority === 'high'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-[#F0F1F3] text-[#18251D] border-[#E5E9E6]'
                        }`}
                        title={event.title}
                      >
                        {isMilestone ? (
                          <Flag className="w-2.5 h-2.5 shrink-0 text-[#20E34A]" />
                        ) : isGoal ? (
                          <Target className="w-2.5 h-2.5 shrink-0 text-purple-600" />
                        ) : null}
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] font-bold text-[#778079] pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Tenant Security Footer */}
      <div className="p-4 rounded-2xl bg-white border border-[#E5E9E6] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5E6962]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-[#18251D]">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Urgent Tasks</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>High Priority</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#20E34A]" />
            <span>Milestones</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Strategic Goals</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#778079]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#064E24]" />
          <span>Tenant: {workspace.slug}</span>
        </div>
      </div>
    </div>
  );
}
