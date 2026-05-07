"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, BarChart2, Globe, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

const COLORS = ['#38bdf8', '#10b981', '#8b5cf6', '#f43f5e'];
const GROSS_MARGIN = 0.78;

// ─── AI Markers ───────────────────────────────────────────────────────────────
const AI_MARKERS: Record<string, { label: string; color: string }> = {
  'Mar': { label: 'Tech sector growth detected via Alpha Vantage — revenue spike correlates with NASDAQ +8%', color: '#10b981' },
  'May': { label: 'Enterprise churn risk: Rising interest rates affecting B2B SaaS budgets', color: '#f43f5e' },
  'Q2': { label: 'Strong Q2 enterprise renewals — churn down 0.3% vs prior quarter', color: '#10b981' },
};

// ─── Dynamic X-axis data generator ───────────────────────────────────────────
const generateChartData = (range: string, baseData: any[], tierMultiplier: number) => {
  const now = new Date();

  if (range === 'daily') {
    // Last 12 hours — live
    return Array.from({ length: 12 }, (_, i) => {
      const h = new Date(now);
      h.setHours(now.getHours() - 11 + i, 0, 0, 0);
      const label = h.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const base = 3000 + Math.random() * 2000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: label, revenue, profit: Math.round(revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1)),
        tooltip: `${h.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${label}`
      };
    });
  }

  if (range === 'weekly') {
    // Rolling 7 days
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - 6 + i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const base = 8000 + Math.random() * 4000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: label, revenue, profit: Math.round(revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1)),
        tooltip: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      };
    });
  }

  if (range === 'monthly') {
    // 4 weeks with date ranges
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth(), i * 7 + 1);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min((i + 1) * 7, 28));
      const base = baseData[i]?.revenue ?? 35000 + Math.random() * 10000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: `Week ${i + 1}`,
        revenue,
        profit: Math.round(revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1)),
        tooltip: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      };
    });
  }

  if (range === 'quarterly') {
    const quarters = [
      { name: 'Q1', months: 'Jan, Feb, Mar', start: 0 },
      { name: 'Q2', months: 'Apr, May, Jun', start: 3 },
      { name: 'Q3', months: 'Jul, Aug, Sep', start: 6 },
      { name: 'Q4', months: 'Oct, Nov, Dec', start: 9 },
    ];
    return quarters.map(q => {
      const base = 120000 + Math.random() * 40000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: q.name, revenue, profit: Math.round(revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1)),
        tooltip: `${q.name}: ${q.months} ${now.getFullYear()}`
      };
    });
  }

  // annually — 12 months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((m, i) => {
    const base = baseData[i]?.revenue ?? 35000 + Math.random() * 15000;
    const revenue = Math.round(base * tierMultiplier);
    return {
      name: m, revenue, profit: Math.round(revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1)),
      tooltip: `${m} ${now.getFullYear()}`
    };
  });
};

// ─── Tooltips ─────────────────────────────────────────────────────────────────
const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.name === 'MRR')?.value ?? 0;
  const profit = payload.find((p: any) => p.name === 'Gross Profit')?.value ?? 0;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';
  const dataPoint = payload[0]?.payload;
  const marker = AI_MARKERS[label];

  return (
    <div className="px-4 py-3 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl min-w-[200px]">
      {/* Full date label from tooltip field */}
      <p className="text-[10px] font-black text-slate-400 mb-1">{dataPoint?.tooltip || label}</p>
      <div className="border-b border-white/[0.05] mb-2 pb-1.5">
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.name}</span>
            </div>
            <span className="text-sm font-black text-white tabular-nums">${item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {/* Gross Margin */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Gross Margin</span>
        <span className="text-[11px] font-black text-emerald-400">{margin}%</span>
      </div>
      {/* AI Marker */}
      {marker && (
        <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-start gap-1.5">
          <Zap size={9} className="flex-shrink-0 mt-0.5" style={{ color: marker.color }} />
          <p className="text-[9px] text-slate-400 leading-relaxed">{marker.label}</p>
        </div>
      )}
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
        <span className="text-sm font-black text-white tabular-nums">{payload[0].value.toLocaleString()} subscribers</span>
      </div>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  const color = data.payload.fill || '#38bdf8';
  return (
    <div className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>{data.name}</p>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        <span className="text-sm font-black text-white">{data.value}% share</span>
      </div>
    </div>
  );
};

// ─── Chart Card ───────────────────────────────────────────────────────────────
const ChartCard = ({
  title, icon: Icon, children, className = '', delay = 0, accentColor = '#38bdf8', badge, id
}: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  className?: string; delay?: number; accentColor?: string; badge?: React.ReactNode; id?: string;
}) => (
  <motion.div
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.55, delay, ease: [0.23, 1, 0.32, 1] }}
    className={`relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 overflow-hidden ${className}`}
  >
    <div className="absolute top-0 left-0 right-0 h-[1px] opacity-40"
      style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }} />
    <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-[0.04] pointer-events-none"
      style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }} />

    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${accentColor}15` }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <h3 className="font-black text-white text-[11px] uppercase tracking-[0.18em]">{title}</h3>
      </div>
      {badge}
    </div>
    <div className="relative z-10">{children}</div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
interface ChartsSectionProps {
  revenueData: any[];
  categoryData: any[];
  regionData: any[];
  category?: string;
  range?: string;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  revenueData, categoryData, regionData, category: categoryProp = '', range: rangeProp = 'monthly'
}) => {
  // Read directly from URL — updates instantly on filter change
  const searchParams = useSearchParams();
  const range = searchParams.get('range') || rangeProp || 'monthly';
  const category = searchParams.get('category') || categoryProp || '';

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);

  const tierMultiplier = category === 'starter' ? 0.3 : category === 'pro' ? 0.6 : category === 'enterprise' ? 1.4 : 1;

  // Regenerate chart data when range or tier changes
  const regenerate = useCallback(() => {
    setChartData(generateChartData(range, revenueData, tierMultiplier));
  }, [range, revenueData, tierMultiplier]);

  useEffect(() => { regenerate(); }, [regenerate]);

  // Live clock tick for daily view
  useEffect(() => {
    if (range !== 'daily') return;
    const t = setInterval(() => regenerate(), 60000); // refresh every minute
    return () => clearInterval(t);
  }, [range, regenerate]);

  // Supabase realtime
  useEffect(() => {
    const channel = supabase
      .channel('charts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        setIsLive(true);
        const amt = payload.new?.amount ?? 0;
        setLiveEvents(prev => [`+$${Number(amt).toLocaleString()} new transaction`, ...prev].slice(0, 3));

        if (range === 'daily') {
          setChartData(prev => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            last.revenue = (last.revenue || 0) + amt;
            last.profit = Math.round(last.revenue * GROSS_MARGIN);
            updated[updated.length - 1] = last;
            return updated;
          });
        }
        setTimeout(() => setIsLive(false), 3000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [range]);

  // SaaS category bars
  const saasCategories = categoryData.map(d => ({
    ...d,
    name: d.name === 'Electronics' ? 'Starter' : d.name === 'Clothing' ? 'Pro' : d.name === 'Home & Garden' ? 'Enterprise' : d.name,
    value: Math.round(d.value * tierMultiplier),
  }));

  const regionWithColors = regionData.map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length] }));

  const rangeLabel: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annual',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">

      {/* ── Revenue Growth Analysis ── */}
      <ChartCard
        title="Revenue Growth Analysis"
        icon={TrendingUp}
        accentColor="#38bdf8"
        delay={0}
        className="col-span-1 lg:col-span-2"
        id="mrr-chart"
        badge={
          <div className="flex flex-wrap items-center gap-2">
            {/* Live badge */}
            <AnimatePresence>
              {isLive && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </motion.span>
              )}
            </AnimatePresence>

            {/* Range badge */}
            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[9px] font-black text-sky-400 uppercase">
              {rangeLabel[range] || 'Monthly'}
            </span>

            {/* Tier badge */}
            {category && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] font-black text-violet-400 uppercase">
                {category} tier
              </span>
            )}

            {/* Legend */}
            <div className="flex gap-3">
              {[{ label: 'MRR', color: '#38bdf8' }, { label: 'Gross Profit', color: '#10b981' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        }
      >
        {/* Live event feed */}
        <AnimatePresence>
          {liveEvents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <AlertCircle size={11} /> {liveEvents[0]}
            </motion.div>
          )}
        </AnimatePresence>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} dy={12} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
            <Area type="monotone" name="MRR" dataKey="revenue"
              stroke="#38bdf8" strokeWidth={2.5} fill="url(#gradRev)" fillOpacity={1}
              dot={false} activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }}
              animationDuration={1200} />
            <Area type="monotone" name="Gross Profit" dataKey="profit"
              stroke="#10b981" strokeWidth={2} strokeDasharray="6 4"
              fill="url(#gradProfit)" fillOpacity={1}
              dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
              animationDuration={1600} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Subscription Tier Distribution ── */}
      <ChartCard title="Subscription Tier Distribution" icon={BarChart2} accentColor="#8b5cf6" delay={0.1}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={saasCategories} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomBarTooltip />} />
            <Bar dataKey="value" fill="url(#gradBar)" radius={[6, 6, 0, 0]} barSize={28} animationDuration={1400} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Regional Markets ── */}
      <ChartCard title="Regional Markets" icon={Globe} accentColor="#10b981" delay={0.2}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={regionWithColors} innerRadius={58} outerRadius={82} paddingAngle={6}
              dataKey="value" stroke="none" cx="38%" cy="50%"
              animationDuration={1400}
              onMouseEnter={(_, i) => setActivePieIndex(i)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              {regionWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`}
                  fill={activePieIndex === index ? entry.fill : `${entry.fill}70`}
                  style={{ filter: activePieIndex === index ? `drop-shadow(0 0 10px ${entry.fill}99)` : 'none', transition: 'all 0.25s ease', cursor: 'pointer', outline: 'none' } as React.CSSProperties}
                  stroke={activePieIndex === index ? entry.fill : 'none'}
                  strokeWidth={activePieIndex === index ? 1.5 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            <Legend verticalAlign="middle" align="right" layout="vertical"
              content={({ payload }) => (
                <ul className="flex flex-col gap-3 pl-4">
                  {payload?.map((entry: any, index: number) => {
                    const isActive = activePieIndex === index;
                    return (
                      <li key={index} className="flex items-center gap-2.5 cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setActivePieIndex(index)} onMouseLeave={() => setActivePieIndex(null)}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200"
                          style={{ backgroundColor: entry.color, boxShadow: isActive ? `0 0 8px ${entry.color}` : 'none', transform: isActive ? 'scale(1.3)' : 'scale(1)' }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-200"
                          style={{ color: isActive ? '#f1f5f9' : '#64748b' }}>
                          {entry.value}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};