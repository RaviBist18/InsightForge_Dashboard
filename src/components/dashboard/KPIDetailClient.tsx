"use client";

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft, TrendingUp, TrendingDown,
    DollarSign, Briefcase, Percent,
    ShoppingCart, Users, Activity,
    Download
} from 'lucide-react';
import Link from 'next/link';
import {
    ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    LineChart, Line
} from 'recharts';
import { cn } from '@/lib/utils';
import { DashboardStats } from '@/lib/data';

// ─── Config per slug ──────────────────────────────────────────────────────────
const SLUG_CONFIG: Record<string, {
    label: string;
    icon: React.ElementType;
    accentColor: string;
    glowColor: string;
    prefix?: string;
    suffix?: string;
    description: string;
}> = {
    'total-revenue': {
        label: 'Total Revenue',
        icon: DollarSign,
        accentColor: '#38bdf8',
        glowColor: '#0ea5e9',
        prefix: '$',
        description: 'Cumulative revenue across all categories and regions.',
    },
    'total-profit': {
        label: 'Total Profit',
        icon: Briefcase,
        accentColor: '#34d399',
        glowColor: '#10b981',
        prefix: '$',
        description: 'Net profit after all operational costs and expenses.',
    },
    'profit-margin': {
        label: 'Profit Margin',
        icon: Percent,
        accentColor: '#a78bfa',
        glowColor: '#8b5cf6',
        suffix: '%',
        description: 'Percentage of revenue retained as profit.',
    },
    'total-orders': {
        label: 'Total Orders',
        icon: ShoppingCart,
        accentColor: '#fb923c',
        glowColor: '#f97316',
        description: 'Total number of orders processed across all channels.',
    },
    'active-users': {
        label: 'Active Users',
        icon: Users,
        accentColor: '#38bdf8',
        glowColor: '#0ea5e9',
        description: 'Unique users who engaged with the platform this period.',
    },
    'churn-rate': {
        label: 'Churn Rate',
        icon: Activity,
        accentColor: '#f472b6',
        glowColor: '#ec4899',
        suffix: '%',
        description: 'Percentage of users who stopped using the platform.',
    },
};

// ─── Tooltips ─────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-4 py-3 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
            {label && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>}
            {payload.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-black text-white tabular-nums">
                        {prefix}{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}{suffix}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 relative overflow-hidden group">
        <div
            className="absolute top-0 left-0 right-0 h-[1px] opacity-50"
            style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }}
        />
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">{label}</p>
        <p className="text-2xl font-black text-white tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
);

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 relative overflow-hidden', className)}
    >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5">{title}</h3>
        {children}
    </motion.div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Inactive: 'bg-slate-500/10  text-slate-400  border-slate-500/20',
};

// ─── Main Client Component ────────────────────────────────────────────────────
interface KPIDetailClientProps {
    slug: string;
    analytics: any;
    stats: DashboardStats;
}

export const KPIDetailClient: React.FC<KPIDetailClientProps> = ({ slug, analytics, stats }) => {
    const cfg = SLUG_CONFIG[slug];
    if (!cfg) return null;

    const Icon = cfg.icon;
    const { accentColor, glowColor, prefix = '', suffix = '' } = cfg;

    const growthIsPositive = (analytics.growthPercentage ?? 0) >= 0;

    // ── CSV export ──
    const handleExport = () => {
        let rows = '';
        if (analytics.userData) {
            rows = 'Name,Email,Status,Join Date\n' +
                analytics.userData.map((u: any) => `"${u.name}","${u.email}","${u.status}","${u.joinDate}"`).join('\n');
        } else if (analytics.expenses) {
            rows = 'Category,Amount,Percentage\n' +
                analytics.expenses.map((e: any) => `"${e.category}","${e.amount}","${e.percentage}%"`).join('\n');
        } else if (analytics.chartData) {
            rows = 'Period,Value\n' +
                analytics.chartData.map((d: any) => `"${d.name}","${d.value}"`).join('\n');
        }
        if (!rows) return;
        const blob = new Blob([rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">

            {/* ── Breadcrumb + Back ── */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                <Link href="/" className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                    <ArrowLeft size={12} /> Dashboard
                </Link>
                <span className="opacity-30">/</span>
                <span style={{ color: accentColor }}>{cfg.label}</span>
            </div>

            {/* ── Hero Header ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 overflow-hidden"
            >
                {/* ambient glow */}
                <div
                    className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-[0.08] pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }}
                />
                <div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div
                            className="p-4 rounded-2xl border"
                            style={{ background: `${glowColor}15`, borderColor: `${glowColor}25` }}
                        >
                            <Icon className="w-7 h-7" style={{ color: accentColor }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">Analytics</p>
                            <h1 className="text-3xl font-black text-white tracking-tight">{cfg.label}</h1>
                            <p className="text-slate-500 text-[12px] mt-1">{cfg.description}</p>
                        </div>
                    </div>

                    <div className="flex items-end flex-col gap-2">
                        <p className="text-4xl font-black text-white tabular-nums">
                            {prefix}{typeof analytics.totalValue === 'number'
                                ? analytics.totalValue.toLocaleString()
                                : analytics.totalValue}{suffix}
                        </p>
                        <div className={cn(
                            'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black',
                            growthIsPositive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        )}>
                            {growthIsPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(analytics.growthPercentage)}% vs last period
                        </div>

                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-black text-slate-400 hover:text-white transition-all mt-1"
                        >
                            <Download size={12} /> Export CSV
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ── Slug-specific content ── */}

            {/* TOTAL REVENUE */}
            {slug === 'total-revenue' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="This Month" value="$45,000" sub="+12.5% MoM" color={accentColor} />
                        <StatCard label="Last Month" value="$40,000" sub="Baseline" color={accentColor} />
                        <StatCard label="YTD Revenue" value="$242,000" sub="Jan–Jun 2024" color={accentColor} />
                        <StatCard label="Avg Monthly" value="$40,333" sub="6-month avg" color={accentColor} />
                    </div>
                    <SectionCard title="Revenue Trend">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={analytics.chartData} margin={{ left: -10, right: 0 }}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<ChartTooltip prefix="$" />} />
                                <Area type="monotone" dataKey="value" stroke={accentColor} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: accentColor, stroke: '#0f172a', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </>
            )}

            {/* TOTAL PROFIT */}
            {slug === 'total-profit' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="This Month" value="$8,370" sub="+8.2% MoM" color={accentColor} />
                        <StatCard label="Last Month" value="$7,734" sub="Baseline" color={accentColor} />
                        <StatCard label="YTD Profit" value="$44,070" sub="Jan–Jun 2024" color={accentColor} />
                        <StatCard label="Avg Monthly" value="$7,345" sub="6-month avg" color={accentColor} />
                    </div>
                    <SectionCard title="Profit Trend">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={analytics.chartData} margin={{ left: -10, right: 0 }}>
                                <defs>
                                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<ChartTooltip prefix="$" />} />
                                <Area type="monotone" dataKey="value" stroke={accentColor} strokeWidth={2.5} fill="url(#profGrad)" dot={false} activeDot={{ r: 5, fill: accentColor, stroke: '#0f172a', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </>
            )}

            {/* PROFIT MARGIN */}
            {slug === 'profit-margin' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Current Margin" value="18.6%" sub="-2.1% MoM" color={accentColor} />
                        <StatCard label="Industry Avg" value="21.3%" sub="Benchmark" color={accentColor} />
                        <StatCard label="Best Month" value="23.1%" sub="March 2024" color={accentColor} />
                        <StatCard label="Target" value="25.0%" sub="End of year" color={accentColor} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SectionCard title="Expense Breakdown">
                            <div className="space-y-3">
                                {analytics.expenses?.map((e: any) => (
                                    <div key={e.category}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-400">{e.category}</span>
                                            <span className="text-[11px] font-black text-white">${e.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${e.percentage}%` }}
                                                transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                                className="h-full rounded-full"
                                                style={{ background: accentColor }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-600 mt-0.5 font-bold">{e.percentage}% of total</p>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                        <SectionCard title="Margin vs Industry">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={[
                                    { name: 'Our Margin', value: 18.6 },
                                    { name: 'Industry Avg', value: 21.3 },
                                    { name: 'Target', value: 25.0 },
                                ]} margin={{ left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} tickFormatter={v => `${v}%`} />
                                    <Tooltip content={<ChartTooltip suffix="%" />} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                                        {[accentColor, '#64748b', '#10b981'].map((c, i) => (
                                            <Cell key={i} fill={c} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </SectionCard>
                    </div>
                </>
            )}

            {/* TOTAL ORDERS */}
            {slug === 'total-orders' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="This Week" value="280" sub="+14.7% WoW" color={accentColor} />
                        <StatCard label="Last Week" value="244" sub="Baseline" color={accentColor} />
                        <StatCard label="Avg/Day" value="40" sub="7-day avg" color={accentColor} />
                        <StatCard label="Peak Day" value="Sat" sub="300 orders" color={accentColor} />
                    </div>
                    <SectionCard title="Orders by Day of Week">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={analytics.chartData} margin={{ left: -20 }}>
                                <defs>
                                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={accentColor} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={accentColor} stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="value" fill="url(#ordGrad)" radius={[6, 6, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </SectionCard>
                </>
            )}

            {/* ACTIVE USERS */}
            {slug === 'active-users' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Active" value="12,500" sub="+5.4% MoM" color={accentColor} />
                        <StatCard label="New This Month" value="1,240" sub="Joined recently" color={accentColor} />
                        <StatCard label="Retention" value="94.2%" sub="30-day" color={accentColor} />
                        <StatCard label="Inactive" value="842" sub="Past 30 days" color={accentColor} />
                    </div>
                    <SectionCard title="User List">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        {['Name', 'Email', 'Status', 'Joined'].map(h => (
                                            <th key={h} className="pb-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600 pr-6">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {analytics.userData?.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 pr-6 text-[12px] font-bold text-white">{u.name}</td>
                                            <td className="py-3 pr-6 text-[11px] text-slate-500">{u.email}</td>
                                            <td className="py-3 pr-6">
                                                <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest', STATUS_STYLES[u.status] ?? STATUS_STYLES.Inactive)}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-[11px] text-slate-500">{u.joinDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </>
            )}

            {/* CHURN RATE */}
            {slug === 'churn-rate' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Current Rate" value="1.2%" sub="-0.3% MoM" color={accentColor} />
                        <StatCard label="Industry Avg" value="2.5%" sub="Benchmark" color={accentColor} />
                        <StatCard label="Retained" value="98.8%" sub="Of all users" color={accentColor} />
                        <StatCard label="Lost Users" value="152" sub="This month" color={accentColor} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SectionCard title="Retention vs Churn">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={analytics.pieData}
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                        animationDuration={1200}
                                    >
                                        {analytics.pieData?.map((entry: any, i: number) => (
                                            <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip suffix="%" />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-6 mt-2">
                                {analytics.pieData?.map((d: any) => (
                                    <div key={d.name} className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                                        {d.name} ({d.value}%)
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                        <SectionCard title="Churn Over Time">
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={[
                                    { name: 'Jan', value: 1.8 },
                                    { name: 'Feb', value: 1.6 },
                                    { name: 'Mar', value: 2.1 },
                                    { name: 'Apr', value: 1.9 },
                                    { name: 'May', value: 1.5 },
                                    { name: 'Jun', value: 1.2 },
                                ]} margin={{ left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} tickFormatter={v => `${v}%`} />
                                    <Tooltip content={<ChartTooltip suffix="%" />} />
                                    <Line type="monotone" dataKey="value" stroke={accentColor} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: accentColor, stroke: '#0f172a', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </SectionCard>
                    </div>
                </>
            )}

        </div>
    );
};