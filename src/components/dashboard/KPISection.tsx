"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight,
  DollarSign, Briefcase, Percent,
  ShoppingCart, Users, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Link from 'next/link';
import { DashboardStats } from '../../lib/data';
import { useSearchParams } from 'next/navigation';

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

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] p-6 h-[152px]">
    <div className="flex justify-between items-start mb-4">
      <div className="w-11 h-11 rounded-xl bg-white/[0.06] animate-pulse" />
      <div className="w-14 h-4 rounded bg-white/[0.06] animate-pulse" />
    </div>
    <div className="w-24 h-3 rounded bg-white/[0.06] animate-pulse mb-3" />
    <div className="w-32 h-7 rounded bg-white/[0.06] animate-pulse" />
  </div>
);

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
  href: string;
  isMatch?: boolean;
  accentColor: string;
  glowColor: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title, rawValue, displayValue, prefix = '', suffix = '',
  isFloat = false, change, trend, icon: Icon,
  delay = 0, href, isMatch = true,
  accentColor, glowColor
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const animated = useAnimatedCounter(rawValue, 1.4, inView);

  const formatAnimated = () => {
    if (isFloat) return `${prefix}${animated.toFixed(1)}${suffix}`;
    if (rawValue > 999) return `${prefix}${Math.floor(animated).toLocaleString('en-US')}${suffix}`;
    return `${prefix}${animated.toFixed(1)}${suffix}`;
  };

  return (
    <Link
      href={href}
      className={cn(
        "block group transition-all duration-500",
        !isMatch && "opacity-20 grayscale pointer-events-none"
      )}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.55, delay, ease: [0.23, 1, 0.32, 1] }}
        className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] p-6 h-full
                   transition-all duration-500 cursor-pointer
                   hover:border-white/[0.14] hover:-translate-y-1"
        style={{
          boxShadow: `0 0 0 0 ${glowColor}`,
        }}
        whileHover={{
          boxShadow: `0 8px 40px -8px ${glowColor}, 0 0 0 1px ${glowColor}22`,
        }}
      >
        {/* Ambient glow background */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 20% 20%, ${glowColor}18 0%, transparent 70%)`,
          }}
        />

        {/* Top row: icon + trend */}
        <div className="flex justify-between items-start mb-5 relative z-10">
          <motion.div
            className="p-2.5 rounded-xl border transition-all duration-500"
            style={{
              background: `${glowColor}12`,
              borderColor: `${glowColor}20`,
            }}
            whileHover={{ scale: 1.08, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Icon className="w-5 h-5 transition-colors duration-300"
              style={{ color: inView ? accentColor : '#64748b' }} />
          </motion.div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Trend badge */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: delay + 0.3, duration: 0.4 }}
              className={cn(
                "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border",
                trend === 'up'
                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                  : "text-rose-400 bg-rose-400/10 border-rose-400/20"
              )}
            >
              {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {change}%
            </motion.div>

            {/* View detail — appears on hover */}
            <motion.div
              className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400"
              style={{ color: accentColor }}
            >
              VIEW <ArrowUpRight size={9} />
            </motion.div>
          </div>
        </div>

        {/* Label */}
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1.5 relative z-10">
          {title}
        </p>

        {/* Animated value */}
        <motion.p
          className="text-[1.6rem] font-black text-white tracking-tight leading-none relative z-10 tabular-nums"
          animate={inView ? { opacity: 1 } : { opacity: 0.4 }}
        >
          {inView ? formatAnimated() : displayValue}
        </motion.p>

        {/* Bottom shimmer line on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }}
        />
      </motion.div>
    </Link>
  );
};

// ─── KPI Section ─────────────────────────────────────────────────────────────
interface KPISectionProps {
  stats: DashboardStats;
  category?: string;
  range?: string;
}

const CARD_CONFIG = [
  { accentColor: '#38bdf8', glowColor: '#0ea5e9' }, // sky
  { accentColor: '#34d399', glowColor: '#10b981' }, // emerald
  { accentColor: '#a78bfa', glowColor: '#8b5cf6' }, // violet
  { accentColor: '#fb923c', glowColor: '#f97316' }, // orange
  { accentColor: '#38bdf8', glowColor: '#0ea5e9' }, // sky
  { accentColor: '#f472b6', glowColor: '#ec4899' }, // pink
];

export const KPISection: React.FC<KPISectionProps> = ({ stats, category = '', range = '30d' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchParams = useSearchParams();

  // Check if we have actual data to display
  const hasData = stats && (stats.totalRevenue > 0 || stats.activeUsers > 0);
  const isFetching = !hasData;

  useEffect(() => {
    const handleSearch = (e: any) => setSearchQuery(e.detail || '');
    window.addEventListener('globalSearch', handleSearch);
    return () => window.removeEventListener('globalSearch', handleSearch);
  }, []);

  const metrics = [
    {
      title: 'Total Revenue',
      rawValue: stats.totalRevenue,
      displayValue: `$${stats.totalRevenue.toLocaleString('en-US')}`,
      prefix: '$',
      isFloat: false,
      change: 12.5,
      trend: 'up' as const,
      icon: DollarSign,
      href: '/dashboard/total-revenue',
    },
    {
      title: 'Total Profit',
      rawValue: stats.totalProfit,
      displayValue: `$${stats.totalProfit.toLocaleString('en-US')}`,
      prefix: '$',
      isFloat: false,
      change: 8.2,
      trend: 'up' as const,
      icon: Briefcase,
      href: '/dashboard/total-profit',
    },
    {
      title: 'Profit Margin',
      rawValue: stats.profitMargin,
      displayValue: `${stats.profitMargin}%`,
      suffix: '%',
      isFloat: true,
      change: 2.1,
      trend: 'down' as const,
      icon: Percent,
      href: '/dashboard/profit-margin',
    },
    {
      title: 'Total Orders',
      rawValue: stats.totalOrders,
      displayValue: stats.totalOrders.toLocaleString('en-US'),
      isFloat: false,
      change: 14.7,
      trend: 'up' as const,
      icon: ShoppingCart,
      href: '/dashboard/total-orders',
    },
    {
      title: 'Active Users',
      rawValue: stats.activeUsers,
      displayValue: stats.activeUsers.toLocaleString('en-US'),
      isFloat: false,
      change: 5.4,
      trend: 'up' as const,
      icon: Users,
      href: '/dashboard/active-users',
    },
    {
      title: 'Churn Rate',
      rawValue: stats.churnRate,
      displayValue: `${stats.churnRate}%`,
      suffix: '%',
      isFloat: true,
      change: 0.3,
      trend: 'down' as const,
      icon: Activity,
      href: '/dashboard/churn-rate',
    },
  ];

  if (isFetching) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, i) => {
        const matchesSearch = searchQuery === '' || metric.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = category === '' || metric.href.includes(category);
        const isMatch = matchesSearch && matchesCategory;

        return (
          <KPICard
            key={metric.title}
            {...metric}
            delay={i * 0.08}
            isMatch={isMatch}
            accentColor={CARD_CONFIG[i].accentColor}
            glowColor={CARD_CONFIG[i].glowColor}
          />
        );
      })}
    </div>
  );
};