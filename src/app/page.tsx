"use client";

import Link from "next/link";
import { useEffect } from "react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingPage() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      id="top"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      className="min-h-screen"
    >
      {/* NAV */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 cursor-pointer">
            <div
              className="w-8 h-8 rounded-[var(--radius)] flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--accent)" }}
            >
              IF
            </div>
            <span className="font-semibold text-[15px] tracking-tight">
              InsightForge
            </span>
          </a>
          <div className="flex items-center gap-8">
            <nav
              className="hidden md:flex items-center gap-8 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <button
                onClick={() => scrollToId("how")}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                How it works
              </button>
              <button
                onClick={() => scrollToId("capabilities")}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                Capabilities
              </button>
              <button
                onClick={() => scrollToId("faq")}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                FAQ
              </button>
            </nav>
            <Link
              href="/auth"
              className="text-sm font-semibold text-white px-4 py-2 rounded-[var(--radius)] transition-colors"
              style={{ background: "var(--accent)" }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-20 grid md:grid-cols-[1.05fr_0.95fr] gap-14 items-start">
        <div>
          <span
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-3 py-1.5 rounded-[var(--radius)] border font-mono"
            style={{
              color: "var(--accent)",
              borderColor: "var(--border-strong)",
              background: "var(--accent-subtle)",
            }}
          >
            Enterprise Business Intelligence
          </span>
          <h1 className="font-bold text-[40px] md:text-[50px] leading-[1.08] tracking-tight mt-6">
            Your metrics, explained —<br /> not just charted.
          </h1>
          <p
            className="text-[17px] mt-5 max-w-md leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            InsightForge tracks revenue, churn, and margin in real time, then
            lets you ask why in plain English — answered by an AI that already
            knows your numbers.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link
              href="/auth"
              className="font-semibold text-sm text-white px-5 py-3 rounded-[var(--radius)] transition-colors"
              style={{ background: "var(--accent)" }}
            >
              Sign in to your dashboard →
            </Link>
            <button
              onClick={() => scrollToId("how")}
              className="font-semibold text-sm border px-5 py-3 rounded-[var(--radius)] transition-colors cursor-pointer"
              style={{ borderColor: "var(--border-strong)" }}
            >
              See how it works
            </button>
          </div>
          <div
            className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-xs font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            <span>Google OAuth</span>
            <span>CSV data sources</span>
            <span>Row-level security via Supabase</span>
          </div>
        </div>

        {/* text-only KPI panel — no chart/icon/illustration */}
        <div
          className="p-5 rounded-[var(--radius)] border"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <p
            className="text-[11px] uppercase tracking-wider mb-4 font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            Live dashboard · last 30 days
          </p>
          <div>
            <div
              className="flex items-center justify-between py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Revenue
              </span>
              <span className="text-sm font-semibold font-mono">
                $482,900 <span style={{ color: "var(--success)" }}>▲ 12%</span>
              </span>
            </div>
            <div
              className="flex items-center justify-between py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Profit margin
              </span>
              <span className="text-sm font-semibold font-mono">
                31.4% <span style={{ color: "var(--success)" }}>▲ 1.2pp</span>
              </span>
            </div>
            <div
              className="flex items-center justify-between py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Orders
              </span>
              <span className="text-sm font-semibold font-mono">
                2,318 <span style={{ color: "var(--success)" }}>▲ 6%</span>
              </span>
            </div>
            <div
              className="flex items-center justify-between py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Churn rate
              </span>
              <span className="text-sm font-semibold font-mono">
                3.2% <span style={{ color: "var(--danger)" }}>▼ 0.4pp</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Active users
              </span>
              <span className="text-sm font-semibold font-mono">
                14,092 <span style={{ color: "var(--success)" }}>▲ 9%</span>
              </span>
            </div>
          </div>
          <div
            className="mt-4 pt-4 border-t text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <span className="font-mono" style={{ color: "var(--accent)" }}>
              AI ›
            </span>{" "}
            &ldquo;Revenue is up mainly on retention — churn dropped 0.4pp while
            marketing spend held flat.&rdquo;
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        className="border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p
            className="text-xs uppercase tracking-wider mb-2 font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            How it works
          </p>
          <h2 className="font-bold text-3xl tracking-tight mb-12">
            Three steps to your first insight
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <span
                className="text-sm font-semibold font-mono"
                style={{ color: "var(--accent)" }}
              >
                01
              </span>
              <h3 className="font-semibold text-lg mt-2">Connect your data</h3>
              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Upload a CSV or connect a data source. Transactions sync into
                your workspace via Supabase.
              </p>
            </div>
            <div>
              <span
                className="text-sm font-semibold font-mono"
                style={{ color: "var(--accent)" }}
              >
                02
              </span>
              <h3 className="font-semibold text-lg mt-2">
                Watch the KPIs update
              </h3>
              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Revenue, profit, orders, users, churn, and margin — filtered by
                7, 30, or 90-day windows.
              </p>
            </div>
            <div>
              <span
                className="text-sm font-semibold font-mono"
                style={{ color: "var(--accent)" }}
              >
                03
              </span>
              <h3 className="font-semibold text-lg mt-2">Ask the AI why</h3>
              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Groq + Llama 3.1 reads your exact metrics and answers in plain
                language — no separate BI query language.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section
        id="capabilities"
        className="border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p
            className="text-xs uppercase tracking-wider mb-2 font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            What&apos;s inside
          </p>
          <h2 className="font-bold text-3xl tracking-tight mb-12">
            Built for running the business, not just viewing it
          </h2>
          <div
            className="grid md:grid-cols-3 gap-px border rounded-[var(--radius)] overflow-hidden"
            style={{
              background: "var(--border)",
              borderColor: "var(--border)",
            }}
          >
            {[
              [
                "KPI dashboard",
                "Revenue, profit, orders, users, churn rate, margin — six cards, always current.",
              ],
              [
                "Interactive charts",
                "Area, bar, and pie views with drill-down detail pages per metric.",
              ],
              [
                "AI chat",
                "Context-aware assistant powered by Groq + Llama 3.1, with suggested starter questions.",
              ],
              [
                "Data sources",
                "Upload CSV or connect an API. Data lands straight into your workspace.",
              ],
              [
                "Reports & saved views",
                "Generate reports, bookmark filter combinations, export to CSV in one click.",
              ],
              [
                "Google OAuth",
                "One-click sign-in, or email/password with a proper reset flow.",
              ],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="p-6"
                style={{ background: "var(--bg-surface)" }}
              >
                <h3 className="font-semibold">{title}</h3>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STRIP */}
      <section
        className="max-w-6xl mx-auto px-6 py-14 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="text-xs uppercase tracking-wider mb-4 font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          Built with
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "TypeScript",
            "Tailwind CSS v4",
            "Framer Motion",
            "Recharts",
            "Supabase",
            "Google OAuth",
            "Groq + Llama 3.1",
            "Pandas",
            "Vercel",
          ].map((t) => (
            <span
              key={t}
              className="px-3 py-1.5 rounded-[var(--radius)] text-xs border font-mono"
              style={{ borderColor: "var(--border-strong)" }}
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-20">
          <p
            className="text-xs uppercase tracking-wider mb-2 font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            FAQ
          </p>
          <h2 className="font-bold text-3xl tracking-tight mb-10">Questions</h2>
          <div
            className="divide-y border-t border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {[
              [
                "Is my data private?",
                "Yes. Data is stored in Supabase under your account with row-level security — not shared across workspaces.",
              ],
              [
                "What data can I upload?",
                "CSV upload today, with API-connected sources on the roadmap.",
              ],
              [
                "How do I sign in?",
                "Google OAuth for one click, or email and password with a standard reset flow.",
              ],
              [
                "What powers the AI chat?",
                "Groq running Llama 3.1. It's given your current metrics as context, so answers stay specific to your dashboard.",
              ],
            ].map(([q, a]) => (
              <details
                key={q}
                className="py-5"
                style={{ borderColor: "var(--border)" }}
              >
                <summary className="flex items-center justify-between font-medium text-[15px] cursor-pointer list-none">
                  {q}
                  <svg
                    className="w-4 h-4"
                    style={{ color: "var(--text-muted)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p
                  className="text-sm mt-3 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section
        className="border-t"
        style={{
          borderColor: "var(--border)",
          background: "var(--accent-subtle)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-bold text-3xl md:text-4xl tracking-tight">
            Your dashboard is one sign-in away.
          </h2>
          <p
            className="mt-3 max-w-md mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            No setup call, no sales form.
          </p>
          <Link
            href="/auth"
            className="inline-block mt-8 font-semibold text-sm text-white px-6 py-3 rounded-[var(--radius)]"
            style={{ background: "var(--accent)" }}
          >
            Sign in to your dashboard →
          </Link>
        </div>
      </section>
    </div>
  );
}
