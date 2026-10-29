'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  User,
  Camera,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building,
  Users,
  Shield,
  KeyRound,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { uploadUserAvatar, removeUserAvatar, updateUserProfile } from '@/lib/services/profileService';

export default function SettingsPage() {
  const { workspace, user, role, isOwner, updateUserLocally, refreshWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'security'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user.name);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await uploadUserAvatar(file);
      if (res.success && res.avatarUrl) {
        updateUserLocally({ avatarUrl: res.avatarUrl });
        setStatusMessage({
          type: 'success',
          text: 'Profile photo updated successfully! Changes propagated across OneDesk.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to upload image.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred during upload.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await removeUserAvatar();
      if (res.success) {
        updateUserLocally({ avatarUrl: undefined });
        setStatusMessage({
          type: 'success',
          text: 'Profile photo removed. Your initials will now be displayed.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to remove photo.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error removing photo.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await updateUserProfile({ fullName: fullName.trim() });
      if (res.success) {
        updateUserLocally({ name: fullName.trim() });
        setStatusMessage({
          type: 'success',
          text: 'Profile details saved successfully.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to save profile.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error updating profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[#E5E9E6] pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-bold text-[#064E24] bg-[#20E34A]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Account Governance
          </span>
          <span className="text-xs text-[#778079]">· {workspace.name}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#18251D] tracking-tight">
          Settings & Profile
        </h1>
        <p className="text-sm text-[#5E6962] mt-1">
          Manage your universal profile picture, display identity, and workspace governance.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E9E6]">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile & Avatar</span>
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'workspace'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Workspace Info</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'security'
              ? 'text-[#064E24] border-b-2 border-[#064E24]'
              : 'text-[#778079] hover:text-[#18251D]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & RLS</span>
        </button>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB]'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#064E24] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tab 1: Profile & Universal Avatar */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="p-6 rounded-2xl bg-white border border-[#E5E9E6] shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#18251D]">Universal Profile Picture</h2>
              <p className="text-xs text-[#778079] mt-0.5">
                Your avatar appears across team directories, project assignments, chat hubs, task comments, and activity feeds.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Main Avatar Preview */}
              <div className="relative group shrink-0">
                <UserAvatar user={user} size="2xl" showStatus status="online" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Change photo"
                >
                  <Camera className="w-6 h-6" />
                </button>
              </div>

              {/* Upload Controls & Instructions */}
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-[#082F1B] text-white hover:bg-[#064E24] font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                  </Button>

                  {user.avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemovePhoto}
                      disabled={isUploading}
                      className="text-xs h-9 rounded-xl border-[#CBD3CE] text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>

                <div className="text-[11px] text-[#778079] space-y-1">
                  <p>• Supported formats: <strong>JPG, PNG, WebP</strong></p>
                  <p>• Maximum file size: <strong>5 MB</strong></p>
                  <p>• Stored securely with Row Level Security</p>
                </div>

                {/* Multi-Size Consistency Check Preview */}
                <div className="pt-2 border-t border-[#E5E9E6]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#778079] block mb-2">
                    Visual Scale Verification:
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar user={user} size="xs" />
                      <span className="text-[9px] text-[#778079]">24px</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar user={user} size="sm" showStatus status="online" />
                      <span className="text-[9px] text-[#778079]">28px</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar user={user} size="md" />
                      <span className="text-[9px] text-[#778079]">36px</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar user={user} size="lg" />
                      <span className="text-[9px] text-[#778079]">44px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Identity Form */}
          <div className="p-6 rounded-2xl bg-white border border-[#E5E9E6] shadow-xs space-y-6">
            <h2 className="text-base font-extrabold text-[#18251D]">Identity & Access Details</h2>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#18251D]">Full Name</label>
                <Input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#18251D]">Account Email</label>
                <Input
                  disabled
                  value={user.email}
                  className="text-xs bg-[#F7F8F8] text-[#778079]"
                />
                <span className="text-[10px] text-[#778079]">
                  Email is managed by Supabase Authentication.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#18251D]">Workspace Role</label>
                <div className="flex items-center gap-2">
                  <Badge variant="lime" className="text-xs">
                    {isOwner ? 'Workspace Owner' : user.role || 'Member'}
                  </Badge>
                  <span className="text-xs text-[#778079]">in {workspace.name}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#20E34A] text-[#082F1B] hover:bg-[#1bc740] font-bold text-xs h-9 px-5 rounded-xl shadow-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Workspace Governance */}
      {activeTab === 'workspace' && (
        <div className="p-6 rounded-2xl bg-white border border-[#E5E9E6] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E9E6] pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#18251D]">{workspace.name}</h2>
              <p className="text-xs text-[#778079] mt-0.5">
                Slug: <span className="font-mono text-[#064E24]">/w/{workspace.slug}</span>
              </p>
            </div>
            <Link
              href={`/w/${workspace.slug}/settings/members`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E24] hover:underline"
            >
              <span>Manage Members & Access</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6]">
              <span className="text-[10px] font-bold text-[#778079] uppercase">Workspace ID</span>
              <p className="text-xs font-mono font-bold text-[#18251D] truncate mt-1">
                {workspace.id || 'fabriq'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6]">
              <span className="text-[10px] font-bold text-[#778079] uppercase">Total Projects</span>
              <p className="text-lg font-extrabold text-[#18251D] mt-1">
                {workspace.projectsCount || 1}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8F8] border border-[#E5E9E6]">
              <span className="text-[10px] font-bold text-[#778079] uppercase">Governance Tier</span>
              <p className="text-xs font-bold text-[#064E24] mt-1">Obsidian Forest Enterprise</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & RLS */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-2xl bg-white border border-[#E5E9E6] shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-[#18251D]">Security & Isolation Invariants</h2>
          <p className="text-xs text-[#5E6962] leading-relaxed">
            OneDesk enforces PostgreSQL Row Level Security (RLS) across all 20+ tenant tables. Private project data, task comments, and documents are strictly isolated by workspace ID and verified membership.
          </p>

          <div className="p-4 rounded-xl bg-[#F7F8F8] border border-[#CBD3CE] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#064E24] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Row Level Security Enforced</span>
            </div>
            <div className="flex items-center gap-2 text-[#064E24] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Storage Bucket RLS Scoped to Auth UID</span>
            </div>
            <div className="flex items-center gap-2 text-[#064E24] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Automations Loop & Recursion Protection Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

