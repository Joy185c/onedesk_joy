'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F7F9F6] text-[#111C18] min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-[#CBD3CE] rounded-3xl p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold">System Level Exception</h2>
          <p className="text-xs text-[#778079]">
            A critical error interrupted the root shell. Please reload to restore state.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#064E24] text-white text-xs font-bold rounded-xl hover:bg-[#082F1B] transition-colors"
          >
            Reload Shell
          </button>
        </div>
      </body>
    </html>
  );
}

