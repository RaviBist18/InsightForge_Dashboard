"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Activity, DollarSign, Zap, BarChart2, Eye, Target, Crosshair, ShieldCheck, ArrowUpRight, ArrowDownRight, X, Maximize2, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface MetricData {
    current: number;
    previous: number;
    trendPercent: number;
    sparkline: number[];
    alert: { triggered: boolean; message: string; severity: 'low' | 'medium' | 'high' } | null;
    aiInsight: string;
    lastUpdated: string;
    source: 'live' | 'cache' | 'mock';
    alphaBadge?: string;
    shadowProjection?: string;
    transactions?: { label: string; value: string; type: 'plus' | 'minus' }[];
}

interface RealTimeData {
    revenue: MetricData;
    operationalEfficiency: MetricData;
    marketTrends: MetricData & { symbol: string; newsHeadline: string };
    timestamp: string;
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

const MetricCard = ({
    title, icon: Icon, data, prefix = '', suffix = '',
    accentColor, glowColor, delay = 0
}: any) => {
    const [isFocused, setIsFocused] = useState(false);
    const isUp = data.trendPercent >= 0;
    const sparkData = data.sparkline.map((v: number, i: number) => ({ i, v }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
                "relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-hidden group transition-all duration-500",
                data.alert?.severity === 'high' ? "ring-1 ring-rose-500/30 bg-rose-500/[0.03]" : "hover:bg-white/[0.04]"
            )}
        >
            {/* POINT 5: CLICK-TO-FOCUS VIEW (SONY A1 STYLE) */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        className="absolute inset-0 bg-slate-950/98 z-50 p-6 flex flex-col justify-center"
                    >
                        <button
                            onClick={() => setIsFocused(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-90"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                            <Crosshair size={12} className="text-sky-400 animate-pulse" />
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Supabase Focus</span>
                        </div>

                        <div className="space-y-2">
                            {data.transactions?.map((t: any, i: number) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t.label}</span>
                                    <span className={cn("text-[10px] font-black", t.type === 'plus' ? "text-emerald-400" : "text-rose-400")}>{t.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-3 border-t border-white/5 flex justify-between items-center text-[7px] font-mono text-slate-600 uppercase tracking-[0.2em]">
                            <span>85mm f1.4 Emulation</span>
                            <span>ISO 100</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header: Badges & Focus Trigger */}
            <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                        style={{ boxShadow: `0 0 15px ${glowColor}10` }}>
                        <Icon size={14} style={{ color: accentColor }} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
                        {data.alphaBadge && (
                            <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest block mt-0.5">
                                • {data.alphaBadge}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFocused(true)}
                        className="p-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-500 hover:text-sky-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Maximize2 size={10} />
                    </button>
                    <div className={cn(
                        'px-2 py-0.5 rounded-full border text-[9px] font-black',
                        isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    )}>
                        {isUp ? '+' : ''}{data.trendPercent.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Value Section: Refined Compact Size */}
            <div className="mb-5 relative z-10">
                <h3 className="text-2xl font-black text-white tracking-tighter tabular-nums mb-1.5">
                    {prefix}{typeof data.current === 'number' && data.current > 1000 ? `${(data.current / 1000).toFixed(1)}k` : data.current.toLocaleString()}{suffix}
                </h3>

                <div className="flex items-center gap-3">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">
                        vs {prefix}{data.previous.toLocaleString()} last period
                    </p>
                    {data.shadowProjection && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-sky-400 uppercase bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">
                            <Target size={8} /> {data.shadowProjection}
                        </div>
                    )}
                </div>
                {/* POINT: THE COLORED CINEMATIC UNDERLINE */}
                <div
                    className="absolute top-16 -bottom-[2px] left-0 right-0 h-[1px] opacity-40"
                    style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
                />
            </div>

            {/* Strategic Forge */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.04] relative z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Zap size={10} className="text-sky-400 animate-pulse" />
                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Strategic Forge</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed font-medium italic">
                    &ldquo;{data.aiInsight}&rdquo;
                </p>
            </div>
        </motion.div>
    );
};

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export function RealTimeDashboard() {
    const [data, setData] = useState<RealTimeData | null>(null);
    const [volatility, setVolatility] = useState(0);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(52); // Synced with screenshot

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/realtime-data');
            const json = await res.json();
            const marketTrend = json.marketTrends.trendPercent + volatility;
            const alpha = (json.revenue.trendPercent / Math.abs(marketTrend || 1)).toFixed(1);

            setData({
                ...json,
                revenue: {
                    ...json.revenue,
                    alphaBadge: `${alpha}X ALPHA CAPTURE`,
                    shadowProjection: "PROJECTED EOD: $46.2K",
                    aiInsight: `High-Alpha Capture: Outpacing sector by ${alpha}x. Execute Pro-tier migration to capture 13% velocity.`,
                    transactions: [{ label: "Enterprise Subscription", value: "+$2,450", type: 'plus' }, { label: "Pro Tier Upgrade", value: "+$890", type: 'plus' }]
                },
                operationalEfficiency: {
                    ...json.operationalEfficiency,
                    shadowProjection: "NEXT 24H: +1.2%",
                    aiInsight: "81.5% efficiency stable. Shadow projection suggests +1.2% shift if Vercel burn stays flat.",
                    transactions: [{ label: "Automation Savings", value: "+$1,200", type: 'plus' }, { label: "AI Token Burn", value: "-$244", type: 'minus' }]
                },
                marketTrends: {
                    ...json.marketTrends,
                    trendPercent: marketTrend,
                    aiInsight: "Tech resilience supports counter-cyclical growth. Capture upside during SPY resilience.",
                    transactions: [{ label: "SPY Index", value: `$${(184.99 + volatility).toFixed(2)}`, type: 'plus' }]
                }
            });
            setLoading(false);
            setCountdown(60);
        } catch (err) { console.error(err); }
    }, [volatility]);

    useEffect(() => {
        fetchData();
        const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 60), 1000);
        return () => clearInterval(timer);
    }, [fetchData]);

    if (loading || !data) return <div className="h-64 animate-pulse bg-white/[0.02] rounded-3xl mt-8" />;

    return (
        <div className="mt-8 space-y-6">
            {/* Header: Decision Cockpit with Live Feed & Refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 relative z-10">
                            <Activity className="w-5 h-5 text-sky-400" />
                        </div>
                        <div className="absolute inset-0 bg-sky-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Decision Cockpit</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                Live Feed
                            </span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block">Sony A1 Master Engine</span>
                        </div>
                    </div>
                </div>

                {/* Stress Factor & Auto-Refresh Controls */}
                <div className="flex items-center gap-6 bg-slate-950/40 p-3 rounded-2xl border border-white/[0.06] backdrop-blur-md">
                    <div className="hidden lg:block min-w-[120px]">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.15em] mb-1">Stress Factor</p>
                        <p className="text-[10px] font-bold text-white uppercase">{volatility}% Volatility</p>
                    </div>
                    <input type="range" min="-20" max="15" value={volatility} onChange={(e) => setVolatility(parseInt(e.target.value))}
                        className="w-32 lg:w-48 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-rose-500" />

                    <div className="h-8 w-[1px] bg-white/10" />

                    <div className="flex items-center gap-4 px-2">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Auto-Refresh</p>
                            <p className="text-[10px] font-mono font-bold text-white tracking-tighter">{countdown}s</p>
                        </div>
                        <button
                            onClick={() => fetchData()}
                            className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white transition-all hover:bg-white/[0.08]"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <MetricCard title="Revenue" icon={DollarSign} data={data.revenue} prefix="$" accentColor="#38bdf8" glowColor="#0ea5e9" delay={0} />
                <MetricCard title="Operational Efficiency" icon={ShieldCheck} data={data.operationalEfficiency} suffix="%" accentColor="#34d399" glowColor="#10b981" delay={0.1} />
                <MetricCard title="Market Trends" icon={BarChart2} data={data.marketTrends} prefix="$" accentColor="#a78bfa" glowColor="#8b5cf6" delay={0.2} />
            </div>
        </div>
    );
}