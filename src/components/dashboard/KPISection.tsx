"use client";
// src/app/components/KPISection.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight,
  DollarSign, Briefcase, Percent,
  ShoppingCart, Users, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashboardStats } from '../../lib/data';
import { useWorkspace } from '@/context/WorkspaceContext';


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
    const unsub = spring.on('change', (v) => setDisplay(v));
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
  change: number;
  trend: 'up' | 'down';
  icon: React.ElementType;
  delay?: number;
  slug: string;
  accentColor: string;
  glowColor: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title, rawValue, displayValue, prefix = '', suffix = '',
  isFloat = false, change, trend, icon: Icon,
  delay = 0, slug, accentColor, glowColor
}) => {
  const ref = useRef(null);
  const { setActiveTab } = useWorkspace();

  const [activeKPI, setActiveKPI] = useState<string | null>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const animated = useAnimatedCounter(rawValue, 1.4, inView);

  const formatAnimated = () => {
    if (isFloat) return `${prefix}${animated.toFixed(1)}${suffix}`;
    if (rawValue > 999) return `${prefix}${Math.floor(animated).toLocaleString('en-US')}${suffix}`;
    return `${prefix}${animated.toFixed(1)}${suffix}`;
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      onClick={() => setActiveTab(slug as any)}
      className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 h-full cursor-pointer group hover:border-white/[0.12] transition-all"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div className="p-2.5 rounded-xl border" style={{ background: `${glowColor}10`, borderColor: `${glowColor}20` }}>
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div className={cn(
          "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black border",
          trend === 'up' ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : "text-rose-400 border-rose-400/20 bg-rose-400/5"
        )}>
          {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-black text-white tabular-nums tracking-tight">
        {formatAnimated()}
      </p>
    </motion.div>
  );
};

// ─── KPI Section ─────────────────────────────────────────────────────────────
interface KPISectionProps {
  stats: DashboardStats;
}

export const KPISection: React.FC<KPISectionProps> = ({ stats }) => {
  // FIXED: No more "isFetching" re-render loop
  if (!stats) return <div className="h-[320px] w-full animate-pulse bg-white/5 rounded-2xl" />;

  const metrics = [
    { title: 'Total Revenue', slug: 'total-revenue', rawValue: stats.totalRevenue, displayValue: `$${stats.totalRevenue}`, icon: DollarSign, accentColor: '#38bdf8', glowColor: '#0ea5e9', change: 12.5, trend: 'up' as const },
    { title: 'Total Profit', slug: 'total-profit', rawValue: stats.totalProfit, displayValue: `$${stats.totalProfit}`, icon: Briefcase, accentColor: '#10b981', glowColor: '#059669', change: 8.2, trend: 'up' as const },
    { title: 'Profit Margin', slug: 'profit-margin', rawValue: stats.profitMargin, displayValue: `${stats.profitMargin}%`, suffix: '%', isFloat: true, icon: Percent, accentColor: '#a78bfa', glowColor: '#8b5cf6', change: 2.1, trend: 'down' as const },
    { title: 'Total Orders', slug: 'total-orders', rawValue: stats.totalOrders, displayValue: `${stats.totalOrders}`, icon: ShoppingCart, accentColor: '#fbbf24', glowColor: '#f59e0b', change: 14.7, trend: 'up' as const },
    { title: 'Active Users', slug: 'active-users', rawValue: stats.activeUsers, displayValue: `${stats.activeUsers}`, icon: Users, accentColor: '#38bdf8', glowColor: '#0ea5e9', change: 5.4, trend: 'up' as const },
    { title: 'Churn Rate', slug: 'churn-rate', rawValue: stats.churnRate, displayValue: `${stats.churnRate}%`, suffix: '%', isFloat: true, icon: Activity, accentColor: '#f43f5e', glowColor: '#e11d48', change: 0.3, trend: 'down' as const },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m, i) => (
        <KPICard key={m.title} {...m} delay={i * 0.05} />
      ))}
    </div>
  );
};