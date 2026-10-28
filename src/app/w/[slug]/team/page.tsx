'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Shield,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/lib/types';
import { getWorkspaceMembers } from '@/lib/services/taskService';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function TeamDirectoryPage() {
  const { workspace, user } = useWorkspace();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspace.id) {
      getWorkspaceMembers(workspace.id).then((m) => {
        setMembers(m);
        setLoading(false);
      });
    }
  }, [workspace.id]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E24] bg-[#E9FBEA] px-2.5 py-0.5 rounded-full border border-[#C6F5CB]">
              Workspace Directory
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
            Team Members & Roles
          </h1>
          <p className="text-xs text-[#778079] mt-0.5">
            Directory of active team members, job titles, and permissions in {workspace.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#778079]" />
            <input
              type="text"
              placeholder="Filter members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-[#CBD3CE] rounded-xl text-xs text-[#18251D] focus:outline-none focus:ring-1 focus:ring-[#20E34A] w-52 shadow-2xs"
            />
          </div>

          <Link href={`/w/${workspace.slug}/settings/members`}>
            <Button variant="primary" size="sm" className="font-bold flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-2xl border border-[#E5E9E6] p-5 shadow-card hover:border-[#CBD3CE] transition-all space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#082F1B] text-[#20E34A] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {member.initials}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-extrabold text-[#18251D] truncate">{member.name}</h4>
                <p className="text-xs text-[#778079] truncate">{member.role}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F0F1F3] space-y-1.5 text-xs text-[#5E6962]">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-[#8E9891] shrink-0" />
                <span className="truncate">{member.email || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[#8E9891] shrink-0" />
                <span className="font-semibold text-[#064E24]">
                  {member.role === 'owner' || member.role === 'Workspace Owner'
                    ? 'Owner Access'
                    : 'Authorized Member'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security notice */}
      <div className="p-3.5 rounded-xl bg-white border border-[#E5E9E6] flex items-center gap-2.5 text-xs text-[#778079] shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-[#064E24] shrink-0" />
        <span>
          Member directory is partitioned by multi-tenant Row Level Security. Cross-workspace members are strictly isolated.
        </span>
      </div>
    </div>
  );
}
