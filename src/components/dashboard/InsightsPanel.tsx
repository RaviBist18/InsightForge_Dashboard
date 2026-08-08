"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { Insight } from "../../data/mockData";
import { cn } from "../../lib/utils";

interface InsightsPanelProps {
  insights: Insight[];
}

const PRIORITY_CONFIG = {
  critical: {
    border: "border-[var(--danger)]/20",
    bg: "bg-[var(--danger-bg)]",
    glow: "var(--danger)",
    badge: "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20",
    dot: "bg-[var(--danger)]",
    label: "Critical",
  },
  high: {
    border: "border-[var(--accent)]/20",
    bg: "bg-[var(--accent-subtle)]",
    glow: "var(--accent)",
    badge: "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/20",
    dot: "bg-[var(--accent)]",
    label: "High Priority",
  },
  medium: {
    border: "border-[var(--success)]/20",
    bg: "bg-[var(--success-bg)]",
    glow: "var(--success)",
    badge: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20",
    dot: "bg-[var(--success)]",
    label: "Medium",
  },
  low: {
    border: "border-[var(--border)]",
    bg: "bg-[var(--bg-primary)]",
    glow: "var(--text-muted)",
    badge: "bg-[var(--bg-primary)] text-[var(--text-muted)] border-[var(--border)]",
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

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          insights.length >= 3
            ? "md:grid-cols-3"
            : insights.length === 2
              ? "md:grid-cols-2"
              : "md:grid-cols-1 md:max-w-md",
        )}
      >
        {insights.map((insight, i) => {
          const cfg = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
          const Icon = TYPE_ICON[insight.type] ?? Lightbulb;

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
                insight.priority === "critical" ? "ring-1 ring-[var(--danger)]/20" : "",
              )}
            >
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-2 rounded-xl" style={{ background: `${cfg.glow}18` }}>
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

              <div className="relative z-10">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                  &ldquo;{insight.description}&rdquo;
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
