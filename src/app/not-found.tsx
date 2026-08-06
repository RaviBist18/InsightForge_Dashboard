import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
        404 - Page Not Found
      </h2>
      <p className="text-[var(--text-secondary)] mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] transition-all"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
