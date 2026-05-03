"use client";

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart2, Globe } from 'lucide-react';

const COLORS = ['#38bdf8', '#10b981', '#8b5cf6', '#f43f5e'];

// ─── Tooltips ────────────────────────────────────────────────────────────────
const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl min-w-[150px]">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.16em] mb-2 pb-1.5 border-b border-white/5">{label}</p>
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
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="text-sm font-black text-white tabular-nums">{data.value.toLocaleString()} units</span>
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

// ─── Chart Card Wrapper ───────────────────────────────────────────────────────
const ChartCard = ({
  title, icon: Icon, children, className = '', delay = 0, accentColor = '#38bdf8'
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  accentColor?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.55, delay, ease: [0.23, 1, 0.32, 1] }}
    className={`relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 overflow-hidden ${className}`}
  >
    {/* top glow line */}
    <div
      className="absolute top-0 left-0 right-0 h-[1px] opacity-40"
      style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }}
    />
    {/* ambient glow */}
    <div
      className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-[0.04] pointer-events-none"
      style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
    />

    <div className="flex items-center gap-2 mb-6 relative z-10">
      <div className="p-1.5 rounded-lg" style={{ background: `${accentColor}15` }}>
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
      </div>
      <h3 className="font-black text-white text-[11px] uppercase tracking-[0.18em]">{title}</h3>
    </div>

    <div className="relative z-10">{children}</div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
interface ChartsSectionProps {
  revenueData: any[];
  categoryData: any[];
  regionData: any[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ revenueData, categoryData, regionData }) => {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const regionWithColors = regionData.map((item, i) => ({
    ...item,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">

      {/* ── Revenue Growth (full width) ── */}
      <ChartCard
        title="Revenue Growth Analysis"
        icon={TrendingUp}
        accentColor="#38bdf8"
        delay={0}
        className="col-span-1 lg:col-span-2"
      >
        {/* Legend */}
        <div className="absolute top-6 right-6 flex gap-4">
          {[{ label: 'Revenue', color: '#38bdf8' }, { label: 'Profit', color: '#10b981' }].map(l => (
            <div key={l.label} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
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
            <XAxis
              dataKey="name"
              axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
              dy={12}
            />
            <YAxis
              axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
            <Area
              type="monotone" name="Revenue" dataKey="revenue"
              stroke="#38bdf8" strokeWidth={2.5}
              fill="url(#gradRev)" fillOpacity={1}
              dot={false} activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }}
              animationDuration={1600}
            />
            <Area
              type="monotone" name="Profit" dataKey="profit"
              stroke="#10b981" strokeWidth={2} strokeDasharray="6 4"
              fill="url(#gradProfit)" fillOpacity={1}
              dot={false} activeDot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Category Allocation ── */}
      <ChartCard title="Category Allocation" icon={BarChart2} accentColor="#8b5cf6" delay={0.1}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name" axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
            />
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
            <Pie
              data={regionWithColors}
              innerRadius={58}
              outerRadius={82}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
              cx="38%"
              cy="50%"
              animationDuration={1400}
              onMouseEnter={(_, i) => setActivePieIndex(i)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              {regionWithColors.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={activePieIndex === index ? entry.fill : `${entry.fill}70`}
                  style={{
                    filter: activePieIndex === index ? `drop-shadow(0 0 10px ${entry.fill}99)` : 'none',
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                    outline: 'none',
                  } as React.CSSProperties}
                  stroke={activePieIndex === index ? entry.fill : 'none'}
                  strokeWidth={activePieIndex === index ? 1.5 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              content={({ payload }) => (
                <ul className="flex flex-col gap-3 pl-4">
                  {payload?.map((entry: any, index: number) => {
                    const isActive = activePieIndex === index;
                    return (
                      <li
                        key={index}
                        className="flex items-center gap-2.5 cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200"
                          style={{
                            backgroundColor: entry.color,
                            boxShadow: isActive ? `0 0 8px ${entry.color}` : 'none',
                            transform: isActive ? 'scale(1.3)' : 'scale(1)',
                          }}
                        />
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-200"
                          style={{ color: isActive ? '#f1f5f9' : '#64748b' }}
                        >
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