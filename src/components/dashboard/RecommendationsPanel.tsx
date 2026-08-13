"use client";

import React from "react";
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Recommendation } from "@/lib/data";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

const PRIORITY_CONFIG = {
  high: {
    border: "border-[var(--accent)]/40",
    badge: "bg-[var(--accent)] text-white border-[var(--accent)]",
    glow: "var(--accent)",
    label: "High Priority",
  },
  medium: {
    border: "border-[var(--accent)]/15",
    badge:
      "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/20",
    glow: "var(--accent)",
    label: "Medium Priority",
  },
};

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
}) => {
  if (recommendations.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="p-1.5 rounded-lg bg-[var(--accent-subtle)]">
          <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
        </div>
        <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-widest">
          AI Recommendations
        </h3>
      </div>

      <div className="space-y-3">
        {recommendations.map((r, i) => {
          const cfg = PRIORITY_CONFIG[r.priority] ?? PRIORITY_CONFIG.medium;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 bg-[var(--bg-surface)]",
                cfg.border,
              )}
            >
              <ArrowRight
                className="w-4 h-4 flex-shrink-0"
                style={{ color: cfg.glow }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  {r.action}
                </p>
                <p className="text-[11px] mt-0.5 text-[var(--text-muted)]">
                  {r.basis}
                </p>
              </div>
              <div
                className={cn(
                  "flex-shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest",
                  cfg.badge,
                )}
              >
                {cfg.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
