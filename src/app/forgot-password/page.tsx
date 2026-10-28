'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccessMsg('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset link.');
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
          Reset your password
        </h2>
        <p className="mt-1.5 text-xs text-[#778079]">
          Enter your email to receive recovery instructions.
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

          <form className="space-y-4" onSubmit={handleReset}>
            <div>
              <label className="block text-xs font-semibold text-[#18251D] mb-1.5">
                Work Email Address
              </label>
              <Input
                type="email"
                required
                icon={<Mail className="w-4 h-4" />}
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full h-10 mt-2 bg-[#082F1B] hover:bg-[#12452C] text-white font-semibold"
              disabled={loading}
            >
              {loading ? 'Sending link...' : 'Send Recovery Link'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E9E6] text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E24] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

