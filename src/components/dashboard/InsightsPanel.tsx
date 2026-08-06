"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";
import { Insight } from "../../data/mockData";
import { cn } from "../../lib/utils";

interface InsightsPanelProps {
  insights: Insight[];
}

// ─── UTILITY: THE FORGE PARSER ────────────────────────────────
// This function splits the AI's "Boardroom" response into UI-ready sections.
const parseInsightDescription = (description: string) => {
  const parts = {
    briefing: description,
    marginImpact: "Calculating...",
    action: "Awaiting strategic pivot...",
  };

  // Logic to catch the "Briefing:", "Margin Impact:", and "Executive Action:" labels
  if (description.includes("Briefing:")) {
    const briefingMatch = description.match(
      /Briefing:\s*(.*?)(?=\s*Margin Impact:|$)/s,
    );
    const marginMatch = description.match(
      /Margin Impact:\s*(.*?)(?=\s*Executive Action:|$)/s,
    );
    const actionMatch = description.match(/Executive Action:\s*(.*)/s);

    if (briefingMatch) parts.briefing = briefingMatch[1].trim();
    if (marginMatch) parts.marginImpact = marginMatch[1].trim();
    if (actionMatch) parts.action = actionMatch[1].trim();
  }

  return parts;
};

const PRIORITY_CONFIG = {
  critical: {
    border: "border-[var(--danger)]/20",
    bg: "bg-[var(--danger-bg)]",
    glow: "var(--danger)",
    badge:
      "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20",
    dot: "bg-[var(--danger)]",
    label: "Critical",
  },
  high: {
    border: "border-[var(--accent)]/20",
    bg: "bg-[var(--accent-subtle)]",
    glow: "var(--accent)",
    badge:
      "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/20",
    dot: "bg-[var(--accent)]",
    label: "High Priority",
  },
  medium: {
    border: "border-[var(--success)]/20",
    bg: "bg-[var(--success-bg)]",
    glow: "var(--success)",
    badge:
      "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20",
    dot: "bg-[var(--success)]",
    label: "Medium",
  },
  low: {
    border: "border-[var(--border)]",
    bg: "bg-[var(--bg-primary)]",
    glow: "var(--text-muted)",
    badge:
      "bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border)]",
    dot: "bg-[var(--text-muted)]",
    label: "Low",
  },
};

const TYPE_ICON = {
  trend: TrendingUp,
  anomaly: AlertTriangle,
  highlight: Lightbulb,
};

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--accent-subtle)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-widest">
            AI Insights
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, i) => {
          const cfg = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
          const Icon = TYPE_ICON[insight.type] ?? Lightbulb;

          // Apply the parser to the AI-generated description
          const insightData = parseInsightDescription(insight.description);

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ opacity: 0.8 }}
              style={{ cursor: "pointer" }}
              className={cn(
                "relative rounded-xl border p-5 overflow-hidden group transition-all duration-300 bg-[var(--bg-surface)]",
                cfg.border,
                insight.priority === "critical"
                  ? "ring-1 ring-[var(--danger)]/20"
                  : "",
              )}
            >
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div
                  className="p-2 rounded-xl"
                  style={{ background: `${cfg.glow}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: cfg.glow }} />
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest",
                    cfg.badge,
                  )}
                >
                  <div className={cn("w-1 h-1 rounded-full", cfg.dot)} />
                  {cfg.label}
                </div>
              </div>

              <h4 className="font-bold text-[var(--text-primary)] text-sm tracking-tight mb-3 relative z-10">
                {insight.title}
              </h4>

              {/* SECTION 1: THE BRIEFING */}
              <div className="mb-4 relative z-10">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                  &ldquo;{insightData.briefing}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <BarChart3 size={10} className="text-[var(--accent)]" />
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      Margin Impact
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">
                    {insightData.marginImpact}
                  </span>
                </div>
                <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={10} className="text-[var(--success)]" />
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      Recommended Move
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-primary)] truncate block">
                    {insightData.action}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)] relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={10} className="text-[var(--accent)]" />
                  <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-widest">
                    Recommended Action
                  </span>
                </div>
                <p className="text-[10px] font-bold text-[var(--text-primary)] leading-tight">
                  {insightData.action}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
