'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Building2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // 1. Sign up user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Registration failed. Please try again.');
      }

      // If user session is active (or email auto-confirmed)
      if (authData.session) {
        // Create initial workspace
        const slug = workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || `ws-${Date.now().toString().slice(-4)}`;

        const { data: wsData, error: wsError } = await supabase
          .from('workspaces')
          .insert({
            name: workspaceName,
            slug,
            owner_id: authData.user.id,
          })
          .select()
          .single();

        if (wsError) {
          console.warn('Workspace creation notice:', wsError.message);
          router.push('/onboarding');
          return;
        }

        // Add creator as workspace owner
        await supabase.from('workspace_members').insert({
          workspace_id: wsData.id,
          user_id: authData.user.id,
          role: 'owner',
          status: 'active',
          job_title: 'Workspace Owner',
        });

        router.push(`/w/${wsData.slug}`);
      } else {
        setSuccessMsg(
          'Account created! Please check your email to confirm your account, or sign in if confirmation is disabled.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed. Please try again.');
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
        <h2 className="text-2xl font-extrabold text-[#18251D] tracking-tight">
          Create your OneDesk workspace
        </h2>
        <p className="mt-1.5 text-xs text-[#778079]">
          Get your agency or engineering team set up in 60 seconds.
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

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#E9FBEA] border border-[#C6F5CB] text-xs text-[#064E24] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#20E34A] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Full Name *
              </label>
              <Input
                type="text"
                required
                icon={<User className="w-4 h-4" />}
                placeholder="Alex Sterling"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Work Email *
              </label>
              <Input
                type="email"
                required
                icon={<Mail className="w-4 h-4" />}
                placeholder="alex@factorlabs.agency"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Workspace / Agency Name *
              </label>
              <Input
                type="text"
                required
                icon={<Building2 className="w-4 h-4" />}
                placeholder="Factor Labs"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Password (min 8 chars) *
              </label>
              <Input
                type="password"
                required
                icon={<Lock className="w-4 h-4" />}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-10 mt-2 font-bold flex items-center justify-center gap-2 shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <span>Creating workspace...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E9E6] text-center">
            <p className="text-xs text-[#778079]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-[#064E24] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

