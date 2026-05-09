"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ArrowUpRight, Zap, Target, BarChart3 } from 'lucide-react';
import { Insight } from '../../data/mockData';
import { cn } from '../../lib/utils';

interface InsightsPanelProps {
  insights: Insight[];
}

// ─── UTILITY: THE FORGE PARSER ────────────────────────────────
// This function splits the AI's "Boardroom" response into UI-ready sections.
const parseAiForge = (description: string) => {
  const parts = {
    briefing: description,
    marginImpact: "Calculating...",
    action: "Awaiting strategic pivot..."
  };

  // Logic to catch the "Briefing:", "Margin Impact:", and "Executive Action:" labels
  if (description.includes('Briefing:')) {
    const briefingMatch = description.match(/Briefing:\s*(.*?)(?=\s*Margin Impact:|$)/s);
    const marginMatch = description.match(/Margin Impact:\s*(.*?)(?=\s*Executive Action:|$)/s);
    const actionMatch = description.match(/Executive Action:\s*(.*)/s);

    if (briefingMatch) parts.briefing = briefingMatch[1].trim();
    if (marginMatch) parts.marginImpact = marginMatch[1].trim();
    if (actionMatch) parts.action = actionMatch[1].trim();
  }

  return parts;
};

const PRIORITY_CONFIG = {
  critical: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/[0.04]',
    glow: '#f43f5e',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    dot: 'bg-rose-400',
    label: 'Critical Forge', // Updated for AI context
  },
  high: {
    border: 'border-sky-500/25',
    bg: 'bg-sky-500/[0.04]',
    glow: '#38bdf8',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    dot: 'bg-sky-400',
    label: 'High Priority',
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
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-400/10">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <h3 className="font-black text-white text-[11px] uppercase tracking-[0.18em]">
            Strategic Forge Insights
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1 animate-pulse">
            Live Intelligence
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, i) => {
          const cfg = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
          const Icon = TYPE_ICON[insight.type] ?? Lightbulb;

          // Apply the parser to the AI-generated description
          const forgeData = parseAiForge(insight.description);

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ opacity: 0.8 }}
              style={{ cursor: 'pointer' }}
              className={cn(
                'relative rounded-2xl border p-5 overflow-hidden group transition-all duration-300',
                cfg.border, cfg.bg,
                insight.priority === 'critical' ? 'ring-1 ring-rose-500/20' : ''
              )}
            >
              {/* Cinematic Pulse for Critical Alerts */}
              {insight.priority === 'critical' && (
                <div className="absolute inset-0 bg-rose-500/[0.02] animate-pulse pointer-events-none" />
              )}

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-2 rounded-xl" style={{ background: `${cfg.glow}18` }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.glow }} />
                </div>
                <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest', cfg.badge)}>
                  <div className={cn('w-1 h-1 rounded-full', insight.priority === 'critical' ? 'animate-ping' : '', cfg.dot)} />
                  {cfg.label}
                </div>
              </div>

              <h4 className="font-black text-white text-sm tracking-tight mb-3 relative z-10">
                {insight.title}
              </h4>

              {/* SECTION 1: THE BRIEFING */}
              <div className="mb-4 relative z-10">
                <p className="text-[11px] text-slate-300 leading-relaxed italic">
                  &ldquo;{forgeData.briefing}&rdquo;
                </p>
              </div>

              {/* SECTION 2: AI FORGE STATS */}
              <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <BarChart3 size={10} className="text-sky-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Margin Impact</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">{forgeData.marginImpact}</span>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={10} className="text-emerald-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Executive Move</span>
                  </div>
                  <span className="text-[10px] font-bold text-white truncate block">{forgeData.action}</span>
                </div>
              </div>

              {/* SECTION 3: THE ACTION */}
              <div className="mt-4 pt-3 border-t border-white/[0.05] relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={10} className="text-sky-400 animate-pulse" />
                  <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Strategic Action</span>
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">
                  {forgeData.action}
                </p>
              </div>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
};