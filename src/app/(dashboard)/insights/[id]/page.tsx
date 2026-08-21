import { INSIGHTS } from "@/data/mockData";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function InsightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const insight = INSIGHTS.find((i) => String(i.id) === id);

  if (!insight) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-xs font-bold uppercase tracking-widest mb-8 group"
      >
        <ChevronLeft
          size={14}
          className="group-hover:-translate-x-1 transition-transform"
        />
        Back to Dashboard
      </Link>

      <div
        className={cn(
          "rounded-xl p-8 md:p-12 relative overflow-hidden bg-[var(--bg-surface)] border",
          insight.priority === "critical"
            ? "border-[var(--danger)]/20"
            : insight.priority === "high"
              ? "border-[var(--accent)]/20"
              : "border-[var(--success)]/20",
        )}
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              "p-3 rounded-xl",
              insight.priority === "critical"
                ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                : insight.priority === "high"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "bg-[var(--success-bg)] text-[var(--success)]",
            )}
          >
            {insight.type === "trend" ? (
              <TrendingUp size={24} />
            ) : insight.type === "anomaly" ? (
              <AlertTriangle size={24} />
            ) : (
              <Lightbulb size={24} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded border",
                  insight.priority === "critical"
                    ? "border-[var(--danger)]/20 text-[var(--danger)] bg-[var(--danger-bg)]"
                    : insight.priority === "high"
                      ? "border-[var(--accent)]/20 text-[var(--accent)] bg-[var(--accent-subtle)]"
                      : "border-[var(--success)]/20 text-[var(--success)] bg-[var(--success-bg)]",
                )}
              >
                {insight.priority} Priority
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {insight.title}
            </h1>
          </div>
        </div>

        <div className="max-w-none">
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
            {insight.description}
          </p>

          <div className="mt-12 pt-12 border-t border-[var(--border)]">
            <div className="rounded-xl p-6 bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
              <h4 className="text-[var(--accent)] font-bold uppercase text-xs tracking-widest mb-2">
                Recommended Action
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Review this {insight.type} to determine next steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
