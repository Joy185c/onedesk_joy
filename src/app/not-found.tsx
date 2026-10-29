'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F9F6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-[#CBD3CE] rounded-3xl p-8 shadow-xs space-y-6">
        {/* Brand / Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#E9FBEA] text-[#064E24] border border-[#BCEEBF] flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-8 h-8 text-[#064E24]" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#082F1B] text-[#20E34A] text-xs font-mono font-bold">
            ERROR 404
          </div>
          <h1 className="text-2xl font-extrabold text-[#111C18] tracking-tight">
            Resource Not Found
          </h1>
          <p className="text-xs text-[#778079] leading-relaxed">
            The workspace, project, or deliverable you are trying to access does not exist or has been moved under tenant RBAC policies.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            asChild
            variant="default"
            className="w-full sm:w-auto bg-[#064E24] hover:bg-[#082F1B] text-white text-xs font-bold rounded-xl"
          >
            <Link href="/w/fabriq">
              <Home className="w-4 h-4 mr-2" />
              Return to Workspace
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto border-[#CBD3CE] text-[#18251D] hover:bg-[#F0F1F3] text-xs font-bold rounded-xl"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Keyboard hint */}
        <div className="pt-4 border-t border-[#E5E9E6] flex items-center justify-center gap-2 text-[11px] text-[#778079]">
          <Search className="w-3.5 h-3.5" />
          <span>Press <kbd className="font-mono bg-[#F0F1F3] px-1.5 py-0.5 rounded border border-[#CBD3CE] text-[10px] font-bold">Ctrl + K</kbd> to search everything</span>
        </div>
      </div>
    </div>
  );
}
