'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      // Sign up user with full name in user metadata
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

      // If active session exists (auto-confirmed) -> redirect directly to onboarding
      if (authData.session) {
        router.push('/onboarding');
      } else {
        setSuccessMsg(
          'Account created successfully! A confirmation link has been sent to your email. Please verify your address, then sign in to complete your workspace onboarding.'
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
          Create your OneDesk account
        </h2>
        <p className="mt-1.5 text-xs text-[#778079]">
          Join your team or start a brand new workspace in seconds.
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
                placeholder="e.g. Shuvo Ahmed"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Email Address *
              </label>
              <Input
                type="email"
                required
                icon={<Mail className="w-4 h-4" />}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
                <span>Creating account...</span>
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
