'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [jobTitle, setJobTitle] = useState('Founder & Lead');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        '';
      setUserName(name);
    }
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      let baseSlug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `ws-${Date.now().toString().slice(-4)}`;

      // 1. Insert Workspace with slug fallback
      let wsData = null;
      let insertError = null;

      const { data: firstTry, error: err1 } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug: baseSlug,
          owner_id: user.id,
        })
        .select()
        .single();

      if (err1) {
        // Retry with unique suffix if collision
        const uniqueSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: secondTry, error: err2 } = await supabase
          .from('workspaces')
          .insert({
            name: workspaceName,
            slug: uniqueSlug,
            owner_id: user.id,
          })
          .select()
          .single();

        if (err2) throw err2;
        wsData = secondTry;
      } else {
        wsData = firstTry;
      }

      // 2. Add owner membership
      const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: wsData.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        job_title: jobTitle || 'Workspace Owner',
      });

      if (memberError) {
        console.error('Member error:', memberError);
      }

      router.push(`/w/${wsData.slug}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F1F3] flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex justify-center mb-6">
          <Logo variant="light" size="lg" />
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9FBEA] text-[#064E24] border border-[#C6F5CB] text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#20E34A]" />
          <span>Step 2 of 2 · Workspace Setup</span>
        </div>
        <h2 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
          {userName ? `Welcome, ${userName}` : 'Welcome to OneDesk'}
        </h2>
        <p className="mt-1.5 text-xs text-[#778079]">
          Name your organization or agency to launch your Owner Command Center.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-[#E5E9E6] sm:px-10">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Workspace / Organization Name *
              </label>
              <Input
                type="text"
                required
                icon={<Building2 className="w-4 h-4" />}
                placeholder="e.g. Apex Digital"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Your Job Title / Responsibility
              </label>
              <Input
                type="text"
                placeholder="e.g. Founder & Lead, Product Architect"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-10 mt-2 font-bold flex items-center justify-center gap-2"
              disabled={loading || !workspaceName.trim()}
            >
              {loading ? 'Launching workspace...' : 'Launch Workspace'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
