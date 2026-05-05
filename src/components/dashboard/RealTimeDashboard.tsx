"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, TrendingDown, AlertTriangle,
    RefreshCw, Sparkles, Activity, DollarSign, Zap, BarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface MetricData {
    current: number;
    previous: number;
    trendPercent: number;
    sparkline: number[];
    alert: { triggered: boolean; message: string; severity: 'low' | 'medium' | 'high' } | null;
    aiInsight: string;
    lastUpdated: string;
    source: 'live' | 'cache' | 'mock';
}

interface RealTimeData {
    revenue: MetricData;
    operationalEfficiency: MetricData;
    marketTrends: MetricData & { symbol: string; newsHeadline: string };
    timestamp: string;
    _cached?: boolean;
}

const SEVERITY_STYLE = {
    high: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
    medium: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    low: 'bg-sky-500/10 border-sky-500/25 text-sky-400',
};

const SOURCE_STYLE = {
    live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cache: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    mock: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// Mini sparkline tooltip
const SparkTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-2 py-1 rounded-lg bg-slate-950/95 border border-white/10 text-[10px] font-black text-white">
            {typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
        </div>
    );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
interface MetricCardProps {
    title: string;
    icon: React.ElementType;
    data: MetricData & { symbol?: string; newsHeadline?: string };
    prefix?: string;
    suffix?: string;
    accentColor: string;
    glowColor: string;
    delay?: number;
}

const MetricCard = ({
    title, icon: Icon, data, prefix = '', suffix = '',
    accentColor, glowColor, delay = 0
}: MetricCardProps) => {
    const isUp = data.trendPercent >= 0;
    const sparkData = data.sparkline.map((v, i) => ({ i, v }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
            className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-hidden"
        >
            {/* top glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }} />

            {/* ambient glow */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.06] pointer-events-none"
                style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }} />

            {/* Header */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl border" style={{ background: `${glowColor}15`, borderColor: `${glowColor}25` }}>
                        <Icon className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{title}</p>
                        {data.symbol && (
                            <p className="text-[9px] text-slate-700 font-bold">{data.symbol}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Source badge */}
                    <span className={cn('px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest', SOURCE_STYLE[data.source])}>
                        {data.source}
                    </span>
                    {/* Trend badge */}
                    <span className={cn(
                        'flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] font-black',
                        isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    )}>
                        {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {isUp ? '+' : ''}{data.trendPercent.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Value */}
            <div className="relative z-10 mb-1">
                <p className="text-3xl font-black text-white tabular-nums tracking-tight">
                    {prefix}{typeof data.current === 'number'
                        ? data.current > 1000 ? `${(data.current / 1000).toFixed(1)}k` : data.current.toLocaleString()
                        : data.current}{suffix}
                </p>
                <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                    vs {prefix}{typeof data.previous === 'number'
                        ? data.previous > 1000 ? `${(data.previous / 1000).toFixed(1)}k` : data.previous.toLocaleString()
                        : data.previous}{suffix} last period
                </p>
            </div>

            {/* Sparkline */}
            <div className="h-12 -mx-2 my-3 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <defs>
                            <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip content={<SparkTooltip />} />
                        <Area
                            type="monotone" dataKey="v"
                            stroke={accentColor} strokeWidth={1.5}
                            fill={`url(#spark-${title})`}
                            dot={false}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Alert */}
            <AnimatePresence>
                {data.alert?.triggered && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn('flex items-start gap-2 p-2.5 rounded-xl border text-[10px] font-bold mb-3 relative z-10', SEVERITY_STYLE[data.alert.severity])}
                    >
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                        {data.alert.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* News headline (market only) */}
            {data.newsHeadline && (
                <p className="text-[10px] text-slate-600 mb-2 relative z-10 italic line-clamp-1">
                    📰 {data.newsHeadline}
                </p>
            )}

            {/* AI Insight */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] relative z-10">
                <Sparkles size={10} className="flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                <p className="text-[10px] text-slate-400 leading-relaxed">{data.aiInsight}</p>
            </div>

            {/* Last updated */}
            <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest mt-2 relative z-10">
                Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function RealTimeDashboard() {
    const [data, setData] = useState<RealTimeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(60);

    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        setError(null);
        try {
            const res = await fetch('/api/realtime-data');
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setData(json);
            setLastFetch(new Date());
            setCountdown(60);
        } catch {
            setError('Failed to load real-time data. Using cached data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial fetch + auto-refresh every 60s
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(c => c > 0 ? c - 1 : 60);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <div className="space-y-4 mt-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-sky-400 animate-pulse" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">Real-Time Intelligence</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 h-64 animate-pulse">
                            <div className="w-32 h-3 bg-white/[0.05] rounded mb-4" />
                            <div className="w-24 h-8 bg-white/[0.05] rounded mb-2" />
                            <div className="w-full h-12 bg-white/[0.05] rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const totalAlerts = [data.revenue, data.operationalEfficiency, data.marketTrends]
        .filter(m => m.alert?.triggered).length;

    return (
        <div className="mt-6 space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-400/10">
                        <Activity className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
                        Real-Time Intelligence
                    </h3>
                    {totalAlerts > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-[9px] font-black text-rose-400">
                            {totalAlerts} alert{totalAlerts > 1 ? 's' : ''}
                        </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <p className="text-[10px] text-slate-600 font-bold">
                        Refresh in {countdown}s
                    </p>
                    <motion.button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-[10px] font-black text-slate-400 hover:text-white transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </motion.button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400">
                    <AlertTriangle size={13} /> {error}
                </div>
            )}

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    title="Revenue"
                    icon={DollarSign}
                    data={data.revenue}
                    prefix="$"
                    accentColor="#38bdf8"
                    glowColor="#0ea5e9"
                    delay={0}
                />
                <MetricCard
                    title="Operational Efficiency"
                    icon={Zap}
                    data={data.operationalEfficiency}
                    suffix="%"
                    accentColor="#34d399"
                    glowColor="#10b981"
                    delay={0.1}
                />
                <MetricCard
                    title="Market Trends"
                    icon={BarChart2}
                    data={data.marketTrends}
                    prefix="$"
                    accentColor="#a78bfa"
                    glowColor="#8b5cf6"
                    delay={0.2}
                />
            </div>

            {/* Last updated */}
            {lastFetch && (
                <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest text-right">
                    Last updated: {lastFetch.toLocaleTimeString()}
                    {data._cached && ' · serving cached data'}
                </p>
            )}
        </div>
    );
}