"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { cn } from "../../lib/utils";
import type { OpportunityItem } from "@/lib/data";

interface OpportunitiesPanelProps {
  opportunities: OpportunityItem[];
}

const IMPACT_CONFIG = {
  high: {
    border: "border-[var(--success)]/40",
    badge: "bg-[var(--success)] text-white border-[var(--success)]",
    glow: "var(--success)",
    dot: "bg-[var(--success)]",
    label: "High Impact",
  },
  medium: {
    border: "border-[var(--success)]/15",
    badge:
      "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20",
    glow: "var(--success)",
    dot: "bg-[var(--success)]/50",
    label: "Medium Impact",
  },
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  Revenue: DollarSign,
  Sales: TrendingUp,
  Product: Package,
  Customer: Users,
};

const CATEGORIES = ["All", "Revenue", "Sales", "Product", "Customer"];
const DEFAULT_LIMIT = 6;

export const OpportunitiesPanel: React.FC<OpportunitiesPanelProps> = ({
  opportunities,
}) => {
  const [filter, setFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () =>
      filter === "All"
        ? opportunities
        : opportunities.filter((o) => o.category === filter),
    [opportunities, filter],
  );

  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_LIMIT);

  if (opportunities.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 px-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--success-bg)]">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-widest">
            Business Opportunities
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setFilter(c);
                setShowAll(false);
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors",
                filter === c
                  ? "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30"
                  : "text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)]",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          visible.length >= 3
            ? "md:grid-cols-3"
            : visible.length === 2
              ? "md:grid-cols-2"
              : "md:grid-cols-1 md:max-w-md",
        )}
      >
        {visible.map((o, i) => {
          const cfg = IMPACT_CONFIG[o.impact] ?? IMPACT_CONFIG.medium;
          const Icon = CATEGORY_ICON[o.category] ?? TrendingUp;

          return (
            <motion.div
              key={`${o.filename}-${o.category}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ opacity: 0.85 }}
              className={cn(
                "relative rounded-xl border p-5 overflow-hidden group transition-all duration-300 bg-[var(--bg-surface)]",
                cfg.border,
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
                {o.category} Opportunity
              </h4>

              <div className="relative z-10">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {o.message}
                </p>
                <p className="text-[10px] mt-2 font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {o.filename}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length > DEFAULT_LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 text-[12px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: "var(--success)" }}
        >
          {showAll ? "Show less" : `Show all (${filtered.length})`}
        </button>
      )}
    </div>
  );
};
