"use client";
// src/app/components/KPISection.tsx

import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Briefcase,
  Percent,
  ShoppingCart,
  Users,
  Activity,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { DashboardStats } from "../../lib/data";

import { Database, TrendingUp, Zap } from "lucide-react";

// ─── Animated Counter ────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1.4, inView = false) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    motionVal.set(target);
  }, [target, inView, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v));
    return unsub;
  }, [spring]);

  return display;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  rawValue: number;
  displayValue: string;
  prefix?: string;
  suffix?: string;
  isFloat?: boolean;
  change?: number;
  trend?: "up" | "down";
  icon: React.ElementType;
  delay?: number;
  slug: string;
  onCardClick?: (slug: string) => void;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  rawValue,
  displayValue,
  prefix = "",
  suffix = "",
  isFloat = false,
  change,
  trend,
  icon: Icon,
  delay = 0,
  slug,
  onCardClick,
}) => {
  const ref = useRef(null);

  const inView = useInView(ref, { once: true, margin: "-40px" });
  const animated = useAnimatedCounter(rawValue, 1.4, inView);

  const formatAnimated = () => {
    if (isFloat) return `${prefix}${animated.toFixed(1)}${suffix}`;
    if (rawValue > 999)
      return `${prefix}${Math.floor(animated).toLocaleString("en-US")}${suffix}`;
    return `${prefix}${animated.toFixed(1)}${suffix}`;
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      onClick={() => onCardClick?.(slug)}
      className="relative rounded-xl p-5 h-full cursor-pointer transition-colors"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className="p-2 rounded-xl"
          style={{ background: "var(--accent-subtle)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        {change !== undefined && trend && (
          <div
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium",
            )}
            style={{
              color: trend === "up" ? "var(--success)" : "var(--danger)",
            }}
          >
            {trend === "up" ? (
              <ArrowUpRight size={11} />
            ) : (
              <ArrowDownRight size={11} />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p
        className="text-[12px] mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </p>
      <p
        className="text-[22px] font-semibold tabular-nums tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {formatAnimated()}
      </p>
    </motion.div>
  );
};

// ─── KPI Section ─────────────────────────────────────────────────────────────
interface KPISectionProps {
  stats: DashboardStats;
  allowedSlugs?: string[];
  onCardClick?: (slug: string) => void;
  revenueChangePct?: number;
}
export const KPISection: React.FC<KPISectionProps> = ({
  stats,
  allowedSlugs,
  onCardClick,
  revenueChangePct,
}) => {
  if (!stats)
    return (
      <div
        className="h-[320px] w-full animate-pulse rounded-xl"
        style={{ background: "var(--border)" }}
      />
    );

  const metrics = [
    {
      title: "Total Revenue",
      slug: "total-revenue",
      rawValue: stats.totalRevenue,
      displayValue: `$${stats.totalRevenue}`,
      icon: DollarSign,
      ...(revenueChangePct !== undefined && revenueChangePct !== 0
        ? {
            change: revenueChangePct,
            trend: revenueChangePct >= 0 ? ("up" as const) : ("down" as const),
          }
        : {}),
    },
    {
      title: "Total Profit",
      slug: "total-profit",
      rawValue: stats.totalProfit,
      displayValue: `$${stats.totalProfit}`,
      icon: Briefcase,
    },
    {
      title: "Profit Margin",
      slug: "profit-margin",
      rawValue: stats.profitMargin,
      displayValue: `${stats.profitMargin}%`,
      suffix: "%",
      isFloat: true,
      icon: Percent,
    },
    {
      title: "Total Orders",
      slug: "total-orders",
      rawValue: stats.totalOrders,
      displayValue: `${stats.totalOrders}`,
      icon: ShoppingCart,
    },
    {
      title: "Active Users",
      slug: "active-users",
      rawValue: stats.activeUsers,
      displayValue: `${stats.activeUsers}`,
      icon: Users,
    },
    {
      title: "Churn Rate",
      slug: "churn-rate",
      rawValue: stats.churnRate,
      displayValue: `${stats.churnRate}%`,
      suffix: "%",
      isFloat: true,
      icon: Activity,
    },
    {
      title: "Total Asset Value",
      slug: "total-asset-value",
      rawValue: stats.totalAssetValue ?? 0,
      displayValue: `$${stats.totalAssetValue ?? 0}`,
      prefix: "$",
      icon: Database,
    },
    {
      title: "Market Growth Yield",
      slug: "market-growth-yield",
      rawValue: stats.marketGrowthYield ?? 0,
      displayValue: `$${stats.marketGrowthYield ?? 0}`,
      prefix: "$",
      icon: TrendingUp,
    },
    {
      title: "Active Nodes",
      slug: "active-nodes-count",
      rawValue: stats.activeNodesCount ?? 0,
      displayValue: `${stats.activeNodesCount ?? 0}`,
      icon: Zap,
    },
  ];

  const filtered = allowedSlugs
    ? metrics.filter((m) => allowedSlugs.includes(m.slug))
    : metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((m, i) => (
        <KPICard
          key={m.title}
          {...m}
          delay={i * 0.05}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
};
