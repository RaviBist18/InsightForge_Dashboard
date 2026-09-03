import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="max-w-6xl mx-auto px-6 pt-10 pb-14 flex flex-col md:flex-row items-center justify-between gap-4 text-xs border-t w-full"
      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
    >
      <p>&copy; 2026 InsightForge. All rights reserved.</p>
      <div
        className="flex gap-6 text-[12px]"
        style={{ color: "var(--text-muted)" }}
      >
        <Link
          href="/privacy"
          className="transition-colors hover:text-[color:var(--accent)]"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="transition-colors hover:text-[color:var(--accent)]"
        >
          Terms
        </Link>
        <Link
          href="/status"
          className="transition-colors hover:text-[color:var(--accent)]"
        >
          Status
        </Link>
      </div>
    </footer>
  );
}
