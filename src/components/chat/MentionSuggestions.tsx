'use client';

import React, { useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/ui/avatar';
import { UserProfile } from '@/lib/types';

export interface MentionSuggestionsProps {
  members: UserProfile[];
  query: string;
  onSelect: (user: UserProfile) => void;
  onClose: () => void;
  selectedIndex: number;
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  members,
  query,
  onSelect,
  onClose,
  selectedIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredMembers = members.filter((m) => {
    const q = query.toLowerCase();
    const nameMatch = m.name.toLowerCase().includes(q);
    const emailMatch = m.email.toLowerCase().includes(q);
    const roleMatch = m.role?.toLowerCase().includes(q);
    return nameMatch || emailMatch || roleMatch;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (filteredMembers.length === 0) {
    return (
      <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-[#CBD3CE] rounded-2xl shadow-lg p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
        <p className="text-xs text-[#778079] text-center">No matching teammates found</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-2 left-0 w-72 max-h-56 overflow-y-auto bg-white border border-[#CBD3CE] rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-0.5"
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#778079] border-b border-[#E5E9E6] mb-1">
        Mention Teammate
      </div>

      {filteredMembers.map((member, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            onMouseDown={(e) => e.preventDefault()} // Prevent blur
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
              isSelected ? 'bg-[#E9FBEA] text-[#064E24]' : 'hover:bg-[#F0F1F3] text-[#18251D]'
            }`}
          >
            <UserAvatar user={member} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate flex items-center gap-1">
                <span>{member.name}</span>
                {member.role && (
                  <span className="text-[10px] font-normal text-[#778079] truncate">
                    · {member.role}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#778079] font-mono truncate">
                {member.email}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
