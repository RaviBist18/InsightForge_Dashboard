"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error boundary:", error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
        Something Went Wrong
      </h2>
      <p className="text-[var(--text-secondary)] mb-8">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
