'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, seamlessly redirect
  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: memberships } = await supabase
            .from('workspace_members')
            .select('workspaces(slug)')
            .eq('user_id', user.id)
            .limit(1);

          if (memberships && memberships.length > 0 && (memberships[0] as any).workspaces?.slug) {
            router.push(`/w/${(memberships[0] as any).workspaces.slug}`);
          } else {
            router.push('/onboarding');
          }
        }
      } catch {
        // Continue with normal login view
      }
    }
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg('Signed in successfully. Redirecting to workspace...');

      // Find user's active workspaces
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(slug)')
        .eq('user_id', data.user.id)
        .limit(1);

      if (memberships && memberships.length > 0 && (memberships[0] as any).workspaces?.slug) {
        const slug = (memberships[0] as any).workspaces.slug;
        router.push(`/w/${slug}`);
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
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
          Sign in to your workspace
        </h2>
        <p className="mt-1.5 text-xs text-[#778079]">
          One workspace. Every project. One clear view.
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

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Work Email Address
              </label>
              <Input
                type="email"
                required
                icon={<Mail className="w-4 h-4" />}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#18251D]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#064E24] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                icon={<Lock className="w-4 h-4" />}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full h-10 mt-2 bg-[#082F1B] hover:bg-[#12452C] text-white font-semibold flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#20E34A]" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E9E6] text-center">
            <p className="text-xs text-[#778079]">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-bold text-[#064E24] hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
