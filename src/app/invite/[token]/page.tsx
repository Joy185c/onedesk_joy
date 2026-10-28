'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Mail, CheckCircle2, AlertCircle, Building2, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return path
        router.push(`/login?returnUrl=/invite/${token}`);
        return;
      }

      // Call atomic acceptance RPC
      const { data, error } = await supabase.rpc('accept_workspace_invitation', {
        invitation_token: token,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/w/${(data as any)?.slug || 'factor-labs'}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation. The invite may be expired or already used.');
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
          You&apos;ve been invited to join a workspace
        </h2>
        <p className="mt-1.5 text-xs text-[#778079]">
          Collaborate with your team on projects, tasks, and documentation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-[#E5E9E6] sm:px-10 text-center space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="p-4 rounded-xl bg-[#E9FBEA] border border-[#C6F5CB] text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#20E34A] mx-auto" />
              <div className="text-sm font-bold text-[#064E24]">
                Invitation Accepted!
              </div>
              <p className="text-xs text-[#064E24]">
                Redirecting you to the workspace dashboard...
              </p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#082F1B] text-[#20E34A] flex items-center justify-center mx-auto border border-[#14482E]">
                <Building2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-[#18251D]">
                  Accept Workspace Invitation
                </div>
                <p className="text-xs text-[#778079]">
                  Token: <code className="font-mono text-[11px] bg-[#F0F1F3] px-1.5 py-0.5 rounded">{token}</code>
                </p>
              </div>

              <Button
                onClick={handleAccept}
                variant="primary"
                className="w-full h-10 font-bold flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? 'Joining workspace...' : 'Accept & Join Workspace'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          <div className="pt-2 border-t border-[#E5E9E6] text-xs text-[#778079]">
            Signed in with the wrong account?{' '}
            <Link href="/login" className="text-[#064E24] font-bold hover:underline">
              Switch account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

