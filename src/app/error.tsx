'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-bold text-white mb-4">Intelligence Failure</h2>
      <p className="text-slate-400 mb-8 tracking-tight">
        An unexpected error occurred while processing the telemetry data.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 glass bg-sky-500/10 border-sky-500/50 text-sky-400 font-bold uppercase tracking-widest text-xs hover:bg-sky-500/20 transition-all"
      >
        Reboot Module
      </button>
    </div>
  );
}
