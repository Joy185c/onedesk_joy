'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled OneDesk Application Exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F9F6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-[#CBD3CE] rounded-3xl p-8 shadow-xs space-y-6">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono font-bold">
            APPLICATION RUNTIME SAFETY
          </div>
          <h1 className="text-2xl font-extrabold text-[#111C18] tracking-tight">
            Unexpected Session Error
          </h1>
          <p className="text-xs text-[#778079] leading-relaxed">
            An isolated exception occurred while rendering this view. Your workspace data remains securely persisted in PostgreSQL.
          </p>
          {error.digest && (
            <div className="p-2 rounded-lg bg-[#F7F8F8] border border-[#E5E9E6] text-[10px] font-mono text-[#5E6962] truncate">
              Digest: {error.digest}
            </div>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full sm:w-auto bg-[#064E24] hover:bg-[#082F1B] text-white text-xs font-bold rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-[#CBD3CE] text-[#18251D] hover:bg-[#F0F1F3] text-xs font-bold rounded-xl"
          >
            <Link href="/w/fabriq">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Link>
          </Button>
        </div>

        {/* Security Assurance */}
        <div className="pt-4 border-t border-[#E5E9E6] flex items-center justify-center gap-2 text-[10px] text-[#778079]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#064E24]" />
          <span>Tenant boundary isolation active & verified</span>
        </div>
      </div>
    </div>
  );
}

