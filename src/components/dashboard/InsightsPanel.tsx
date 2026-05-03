"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowUpRight } from 'lucide-react';
import { Insight } from '../../data/mockData';
import { cn } from '../../lib/utils';
import Link from 'next/link';

interface InsightsPanelProps {
  insights: Insight[];
}

const PRIORITY_CONFIG = {
  critical: {
    border: 'border-rose-500/25',
    bg: 'bg-rose-500/[0.04]',
    glow: '#f43f5e',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    dot: 'bg-rose-400',
    label: 'Critical',
  },
  high: {
    border: 'border-sky-500/25',
    bg: 'bg-sky-500/[0.04]',
    glow: '#38bdf8',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    dot: 'bg-sky-400',
    label: 'High',
  },
  medium: {
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/[0.04]',
    glow: '#10b981',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-400',
    label: 'Medium',
  },
  low: {
    border: 'border-slate-500/25',
    bg: 'bg-slate-500/[0.04]',
    glow: '#64748b',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
    dot: 'bg-slate-400',
    label: 'Low',
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-400/10">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <h3 className="font-black text-white text-[11px] uppercase tracking-[0.18em]">
            AI Insights
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-sky-400/10 text-sky-400 border border-sky-400/20 ml-1">
            Live
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          {insights.length} insights
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, i) => {
          const cfg = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
          const Icon = TYPE_ICON[insight.type] ?? Lightbulb;

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className={cn(
                'relative rounded-2xl border p-5 overflow-hidden group cursor-default transition-all duration-300',
                cfg.border, cfg.bg,
                'hover:border-white/[0.14]'
              )}
            >
              {/* Ambient glow top-left */}
              <div
                className="absolute -top-6 -left-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-[0.12] transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${cfg.glow}, transparent 70%)` }}
              />

              {/* Top row: icon + priority badge */}
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div
                  className="p-2 rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${cfg.glow}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: cfg.glow }} />
                </div>

                <div className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest',
                  cfg.badge
                )}>
                  <div className={cn('w-1 h-1 rounded-full animate-pulse', cfg.dot)} />
                  {cfg.label}
                </div>
              </div>

              {/* Title */}
              <h4 className="font-black text-white text-sm tracking-tight mb-2 relative z-10">
                {insight.title}
              </h4>

              {/* Description */}
              <p className="text-[11px] text-slate-400 leading-relaxed relative z-10">
                {insight.description}
              </p>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between relative z-10">
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1 h-1 rounded-full', cfg.dot)} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                    Updated 2m ago
                  </span>
                </div>
                <Link
                  href={`/insights/${insight.id}`}
                  className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest transition-colors duration-200 group/link"
                  style={{ color: cfg.glow }}
                >
                  Explore
                  <ArrowUpRight
                    size={10}
                    className="opacity-60 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200"
                  />
                </Link>
              </div>

              {/* Bottom shimmer on hover */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${cfg.glow}50, transparent)` }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};