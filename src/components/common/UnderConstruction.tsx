import Link from "next/link";
import { ChevronLeft, Construction } from "lucide-react";

export default function UnderConstruction() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest mb-12 group"
      >
        <ChevronLeft
          size={14}
          className="group-hover:-translate-x-1 transition-transform"
        />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <Construction
          className="w-24 h-24 text-[var(--accent)]"
          strokeWidth={1}
        />
      </div>

      <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
        Coming Soon
      </h2>
      <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-10">
        This feature is still in development. Check back soon.
      </p>

      <div className="flex gap-4">
        <div
          className="h-1 w-12 rounded-full"
          style={{ background: "var(--accent-subtle)" }}
        />
        <div
          className="h-1 w-12 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="h-1 w-12 rounded-full"
          style={{ background: "var(--accent-subtle)" }}
        />
      </div>
    </div>
  );
}
