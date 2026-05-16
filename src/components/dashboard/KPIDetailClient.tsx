"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft, TrendingUp, TrendingDown,
    DollarSign, Briefcase, Percent,
    ShoppingCart, Users, Activity,
    Download, Brain, Shield, User,
    AlertTriangle, Target, Zap, Star,
    ChevronRight, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import {
    ResponsiveContainer, AreaChart, Area,
    ComposedChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    LineChart, Line, BarChart,
    RadialBarChart, RadialBar,
    ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';
import { DashboardStats } from '@/lib/data';


// ─── Types ────────────────────────────────────────────────────────────────────

type AIPersona = 'aggressive' | 'balanced' | 'defensive';
type UserRole = 'admin' | 'user';

interface KPIDetailClientProps {
    slug: string;
    analytics: Record<string, unknown>;
    stats?: DashboardStats;
    role?: UserRole;
    persona?: AIPersona;
    userId?: string;
    /** "summary" = hero + 1 chart + 2 bullets only (Dashboard).
     *  "full"    = all forensic detail (Workspace). Default: "full" */
    viewMode?: 'full' | 'summary';
    onBack?: () => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const MONO = { fontFamily: "'JetBrains Mono','Fira Mono',monospace" };

// ─── Canonical values ─────────────────────────────────────────────────────────

const GLOBAL = { mrr: 1800, profit: 720, margin: 40, orders: 53, activeUsers: 37, churnRate: 1.8 };
const USER_C = { mrr: 36, profit: 14.4, margin: 40, orders: 1, activeUsers: 1, churnRate: 0.0 };

// ─── Slug config ──────────────────────────────────────────────────────────────

const SLUG_CONFIG: Record<string, {
    label: string;
    icon: React.ElementType;
    accentColor: string;
    glowColor: string;
    prefix?: string;
    suffix?: string;
    description: string;
    adminValue: number;
    userValue: number;
    humanLabel: (v: number, role: UserRole) => string;
}> = {
    'total-revenue': {
        label: 'Total Revenue', icon: DollarSign,
        accentColor: '#38bdf8', glowColor: '#0ea5e9', prefix: '$',
        description: 'Cumulative MRR across all subscription tiers.',
        adminValue: GLOBAL.mrr, userValue: USER_C.mrr,
        humanLabel: (v, r) => r === 'admin'
            ? 'Company is performing 12% above the quarterly baseline.'
            : `Your contribution is $${v}/mo — stable Starter tier seat.`,
    },
    'total-profit': {
        label: 'Total Profit', icon: Briefcase,
        accentColor: '#10b981', glowColor: '#059669', prefix: '$',
        description: 'Net profit after all operational and API costs.',
        adminValue: GLOBAL.profit, userValue: USER_C.profit,
        humanLabel: (v, r) => r === 'admin'
            ? '40% gross margin — 18.7 points above industry average.'
            : `Your seat generates $${v.toFixed(2)} net profit this month.`,
    },
    'profit-margin': {
        label: 'Profit Margin', icon: Percent,
        accentColor: '#a78bfa', glowColor: '#8b5cf6', suffix: '%',
        description: 'Percentage of revenue retained as profit.',
        adminValue: GLOBAL.margin, userValue: USER_C.margin,
        humanLabel: () => 'For every $1 earned, $0.40 is kept as profit.',
    },
    'total-orders': {
        label: 'Total Orders', icon: ShoppingCart,
        accentColor: '#fbbf24', glowColor: '#f59e0b',
        description: 'Total transactions processed this period.',
        adminValue: GLOBAL.orders, userValue: USER_C.orders,
        humanLabel: (v, r) => r === 'admin'
            ? `${v} transactions processed — Friday is peak volume day.`
            : 'Your 1 order this period is consistent with Starter usage.',
    },
    'active-users': {
        label: 'Active Users', icon: Users,
        accentColor: '#38bdf8', glowColor: '#0ea5e9',
        description: 'Unique users engaged with the platform.',
        adminValue: GLOBAL.activeUsers, userValue: USER_C.activeUsers,
        humanLabel: (v, r) => r === 'admin'
            ? `${v} active users — retention is 98.2%, outperforming industry by 4pts.`
            : 'You are an active user with healthy session cadence.',
    },
    'churn-rate': {
        label: 'Churn Rate', icon: Activity,
        accentColor: '#f43f5e', glowColor: '#e11d48', suffix: '%',
        description: 'Monthly subscriber cancellation rate.',
        adminValue: GLOBAL.churnRate, userValue: USER_C.churnRate,
        humanLabel: (_v, r) => r === 'admin'
            ? 'Retention is high — only 1 account lost in the last 30 days.'
            : 'No churn risk detected on your account. Status: retained.',
    },
};

// ─── Chart datasets ───────────────────────────────────────────────────────────

const REV_HIST = [
    { name: 'Oct', revenue: 1240, profit: 496, goal: 1500 },
    { name: 'Nov', revenue: 1380, profit: 552, goal: 1500 },
    { name: 'Dec', revenue: 1520, profit: 608, goal: 1600 },
    { name: 'Jan', revenue: 1610, profit: 644, goal: 1700 },
    { name: 'Feb', revenue: 1680, profit: 672, goal: 1700 },
    { name: 'Mar', revenue: 1740, profit: 696, goal: 1750 },
    { name: 'Apr', revenue: 1800, profit: 720, goal: 1750 },
];

const REV_HIST_USER = REV_HIST.map(d => ({
    name: d.name,
    revenue: parseFloat((d.revenue * 0.02).toFixed(2)),
    profit: parseFloat((d.profit * 0.02).toFixed(2)),
    goal: parseFloat((d.goal * 0.02).toFixed(2)),
}));

const ORDERS_HIST = [
    { name: 'Mon', value: 6, goal: 8 },
    { name: 'Tue', value: 8, goal: 8 },
    { name: 'Wed', value: 7, goal: 8 },
    { name: 'Thu', value: 9, goal: 8 },
    { name: 'Fri', value: 11, goal: 8 },
    { name: 'Sat', value: 8, goal: 8 },
    { name: 'Sun', value: 4, goal: 8 },
];

const USERS_STEP = [
    { name: 'Oct', value: 24, goal: 30 },
    { name: 'Nov', value: 26, goal: 30 },
    { name: 'Dec', value: 28, goal: 30 },
    { name: 'Jan', value: 31, goal: 35 },
    { name: 'Feb', value: 33, goal: 35 },
    { name: 'Mar', value: 35, goal: 35 },
    { name: 'Apr', value: 37, goal: 40 },
];

const CHURN_HIST = [
    { name: 'Oct', value: 2.4, goal: 2.0 },
    { name: 'Nov', value: 2.1, goal: 2.0 },
    { name: 'Dec', value: 2.3, goal: 2.0 },
    { name: 'Jan', value: 2.0, goal: 1.8 },
    { name: 'Feb', value: 1.9, goal: 1.8 },
    { name: 'Mar', value: 1.8, goal: 1.8 },
    { name: 'Apr', value: 1.8, goal: 1.5 },
];

const EXPENSE_BREAKDOWN = [
    { category: 'Hosting (Vercel)', amount: 180, percentage: 17 },
    { category: 'Groq API tokens', amount: 240, percentage: 22 },
    { category: 'Alpha Vantage', amount: 60, percentage: 6 },
    { category: 'NewsAPI', amount: 50, percentage: 5 },
    { category: 'Supabase', amount: 45, percentage: 4 },
    { category: 'Other OpEx', amount: 505, percentage: 46 },
];

// ─── Key Drivers ──────────────────────────────────────────────────────────────

type Driver = { label: string; value: string; color: string; icon: React.ElementType; trend?: 'up' | 'down' | 'neutral' };

function CheckIcon({ size = 14 }: { size?: number }) { return <Target size={size} />; }

const KEY_DRIVERS: Record<string, Driver[]> = {
    'total-revenue': [
        { label: 'Enterprise Tier', value: '$840 / 46.7%', color: '#38bdf8', icon: Star, trend: 'up' },
        { label: 'Pro Tier', value: '$630 / 35.0%', color: '#a78bfa', icon: Zap, trend: 'up' },
        { label: 'Starter Tier', value: '$330 / 18.3%', color: '#64748b', icon: Users, trend: 'neutral' },
    ],
    'total-profit': [
        { label: 'Groq API Burn', value: '$240 leak', color: '#f43f5e', icon: AlertTriangle, trend: 'down' },
        { label: 'Vercel Hosting', value: '$180 leak', color: '#fbbf24', icon: AlertCircle, trend: 'neutral' },
    ],
    'profit-margin': [
        { label: 'Enterprise Margin', value: '52%', color: '#10b981', icon: TrendingUp, trend: 'up' },
        { label: 'Pro Margin', value: '38%', color: '#38bdf8', icon: TrendingUp, trend: 'up' },
        { label: 'Starter Margin', value: '24%', color: '#64748b', icon: TrendingDown, trend: 'down' },
    ],
    'total-orders': [
        { label: 'Success Rate', value: '94.3%', color: '#10b981', icon: CheckIcon, trend: 'up' },
        { label: 'Failed/Refunded', value: '5.7%', color: '#f43f5e', icon: AlertTriangle, trend: 'down' },
        { label: 'Peak Day (Fri)', value: '11 orders', color: '#fbbf24', icon: Zap, trend: 'up' },
    ],
    'active-users': [
        { label: 'Enterprise Users', value: '8 (21.6%)', color: '#38bdf8', icon: Shield, trend: 'up' },
        { label: 'Pro Users', value: '14 (37.8%)', color: '#a78bfa', icon: Users, trend: 'up' },
        { label: 'Starter Users', value: '15 (40.6%)', color: '#64748b', icon: User, trend: 'neutral' },
    ],
    'churn-rate': [
        { label: 'Starter At-Risk', value: '2 accounts', color: '#f43f5e', icon: AlertTriangle, trend: 'down' },
        { label: 'Pro At-Risk', value: '1 account', color: '#fbbf24', icon: AlertCircle, trend: 'down' },
        { label: 'Enterprise At-Risk', value: '0 accounts', color: '#10b981', icon: Shield, trend: 'up' },
    ],
};

// ─── Micro-stats ──────────────────────────────────────────────────────────────

const MICRO_STATS: Record<string, (role: UserRole) => { label: string; value: string; sub: string }[]> = {
    'total-revenue': r => [
        { label: 'AVG/MONTH', value: r === 'admin' ? '$1,567' : '$31', sub: '6-month avg' },
        { label: 'ALL-TIME HIGH', value: r === 'admin' ? '$1,800' : '$36', sub: 'Apr 2026 ↑' },
        { label: 'FORECAST', value: r === 'admin' ? '$1,980' : '$40', sub: 'Next 30 days' },
    ],
    'total-profit': r => [
        { label: 'AVG/MONTH', value: r === 'admin' ? '$631' : '$12.60', sub: '6-month avg' },
        { label: 'ALL-TIME HIGH', value: r === 'admin' ? '$720' : '$14.40', sub: 'Apr 2026 ↑' },
        { label: 'FORECAST', value: r === 'admin' ? '$792' : '$15.80', sub: 'Next 30 days' },
    ],
    'profit-margin': () => [
        { label: 'INDUSTRY AVG', value: '21.3%', sub: 'Benchmark' },
        { label: 'ALL-TIME HIGH', value: '42.1%', sub: 'Jan 2026' },
        { label: 'TARGET', value: '45.0%', sub: 'EOY 2026' },
    ],
    'total-orders': r => [
        { label: 'AVG/DAY', value: r === 'admin' ? '7.6' : '0.14', sub: '7-day avg' },
        { label: 'PEAK DAY', value: 'Friday', sub: '11 orders' },
        { label: 'FORECAST', value: r === 'admin' ? '61' : '1', sub: 'Next period' },
    ],
    'active-users': r => [
        { label: 'RETENTION', value: '98.2%', sub: '30-day' },
        { label: 'GROWTH RATE', value: '+5.4%', sub: 'MoM' },
        { label: 'FORECAST', value: r === 'admin' ? '40' : '1', sub: 'Next month' },
    ],
    'churn-rate': () => [
        { label: 'INDUSTRY AVG', value: '2.5%', sub: 'Benchmark' },
        { label: 'ACCTS LOST', value: '1', sub: 'This month' },
        { label: 'FORECAST', value: '1.6%', sub: 'Next 30 days' },
    ],
};

// ─── Forensic bullets ─────────────────────────────────────────────────────────

const FB: Record<string, Record<UserRole, Record<AIPersona, string[]>>> = {
    'total-revenue': {
        admin: {
            aggressive: [
                'Enterprise tier at 46.7% of MRR — push Enterprise expansion now. Each new seat = +$105/mo ARR.',
                'Starter at 18.3% is a drag. Force upgrade at 90-day mark or sunset the tier.',
                'Forecast $1,980 is conservative. Aggressive pipeline could hit $2,100 — assign reps to 3 warm leads.',
            ],
            balanced: [
                'MRR growth 12.5% MoM is healthy. Reduce CAC while sustaining Enterprise conversion above 18%.',
                'Starter-to-Pro conversion <5%. A/B test in-app upgrade prompts next sprint.',
                '$1,980 forecast achievable with current retention. Protect base before top-of-funnel push.',
            ],
            defensive: [
                'Focus on LTV/CAC ratio before scaling marketing. Current 3.2x is acceptable but not defensible.',
                'Protect Enterprise accounts. 1 lost Enterprise seat = -$105 MRR = 3 Starter churns.',
                'Hold pricing. Discounts compress margin below 38% and trigger compounding cost issues.',
            ],
        },
        user: {
            aggressive: [
                '$36 Starter contribution. Upgrade to Pro (+$52/mo) — AI briefings + priority support, 3x ROI in 60 days.',
                'Refer 1 enterprise contact. Referral users = 4x LTV + network effects.',
                'Starter has lowest retention priority. Upgrade before next tier restructure.',
            ],
            balanced: [
                'Stable at 2% of company MRR. Consistent usage is the best tier-upgrade indicator.',
                'Consider Pro when monthly usage exceeds 40 sessions — currently tracking at 28.',
                'Account health 94/100. No immediate action required.',
            ],
            defensive: [
                'Starter tier is sufficient for your usage pattern. No upgrade pressure.',
                'Maintain login cadence to avoid inactivity flags.',
                'Small but predictable contribution — low risk profile.',
            ],
        },
    },
    'total-profit': {
        admin: {
            aggressive: [
                'Groq API at $240/mo is biggest variable cost. Switch to Llama-local = $120/mo saving (+16.7% margin).',
                '40% margin is 5pts below best-in-class. Each margin point = $18/mo at $1,800 MRR.',
                'Kill bottom 10% OpEx. $50 NewsAPI + $45 Supabase are consolidation candidates.',
            ],
            balanced: [
                'Profit healthy. Monitor API burn — scales non-linearly with usage.',
                'Vercel $180/mo fixed cost. Evaluate edge caching before next billing cycle.',
                'Target 42% margin by Q3 via Groq token optimization — achievable with prompt caching.',
            ],
            defensive: [
                '40% margin buffer is solid. No new fixed costs until MRR exceeds $2,500.',
                'Keep API cost under 30% of revenue. Currently at 27% — watch as usage scales.',
                'Prioritize profitability over growth until 6-month cash runway confirmed.',
            ],
        },
        user: {
            aggressive: [
                'Seat generates $14.40 net profit. Upgrade to Pro → $26.40 — 2x with same overhead.',
                'Enterprise gets priority support + features. Upgrade path is clear and ROI-positive.',
                'Starter LTV: $518 over 3 years. Pro LTV: $1,512. The difference compounds.',
            ],
            balanced: [
                'Profit contribution proportional and stable. Consistent engagement drives LTV.',
                'No cost inefficiencies detected on your profile.',
                'Annual lock-in at 20% discount — worth evaluating if staying 12+ months.',
            ],
            defensive: [
                'Small but steady profit contribution. No action required.',
                'Starter is cost-efficient for current usage.',
                'Maintain until usage clearly justifies Pro-tier unlock.',
            ],
        },
    },
    'profit-margin': {
        admin: {
            aggressive: [
                '40% margin is 18.7pts above industry. Raise Enterprise pricing 12% — no churn risk at this margin.',
                'Starter at 24% is below target. Raise $8/mo or kill the tier within 2 quarters.',
                'Every 1pt margin improvement = $18/mo. Target 44% via Groq + Vercel optimization.',
            ],
            balanced: [
                'Outperformance vs industry is a strong signal. Use in investor conversations.',
                'Variable API costs will compress margin as revenue scales — manage proactively.',
                'Current OpEx is lean but fragile. One API spike = -3pts margin.',
            ],
            defensive: [
                'Healthy buffer. No new recurring costs until MRR hits $3,000.',
                'Industry at 21.3% — you are 18.7pts above. This is a moat. Protect it.',
                'No pricing discounts. 5% Enterprise discount = -$5.25 margin erosion per seat/month.',
            ],
        },
        user: {
            aggressive: [
                'Tier margin mirrors company at 40%. Upgrade to Enterprise for volume features.',
                'Annual lock-in protects against future price increases. Act before restructure.',
                'Starter has lowest feature investment priority in the portfolio.',
            ],
            balanced: [
                'Account margin in line with company standards. Stable.',
                'No margin action needed at current tier.',
                'Consider Pro when usage justifies +$52/mo — break-even at 40 monthly sessions.',
            ],
            defensive: [
                'Cost-efficient for current usage. No adjustments.',
                'Margin healthy. Stay on current plan.',
                'No risk indicators.',
            ],
        },
    },
    'total-orders': {
        admin: {
            aggressive: [
                'Friday peak at 11 orders. Deploy campaigns Thursday evening — 20% volume uplift achievable.',
                'Sunday trough at 4. Automated re-engagement Sunday morning recovers 2-3 orders/week.',
                '94.3% success leaves 5.7% on table. Fix top 3 checkout failures = +$180 annualized.',
            ],
            balanced: [
                'Order volume consistent. Weekend spike = consumer usage — evaluate B2B pipeline separately.',
                'Success rate 94.3% above industry 91%. Focus on 3% refund rate as highest-leverage fix.',
                'Daily goal 8 — met 4/7 days. Tue/Thu underperforming — investigate funnel.',
            ],
            defensive: [
                'Monitor volume decline as leading churn indicator before it hits MRR.',
                'Do not over-optimize volume at expense of quality — failed order costs 3x to resolve.',
                'Maintain current funnel before adding new acquisition channels.',
            ],
        },
        user: {
            aggressive: [
                '1 order is baseline. Increase sessions to drive referral velocity and upsell triggers.',
                'Refer 1 contact — 3x conversion vs cold leads, $0 CAC.',
                'Order history qualifies for annual plan discount. Lock in now.',
            ],
            balanced: [
                'Order activity consistent with Starter average. Stable.',
                'Consistent usage is the best tier-upgrade signal.',
                'No anomalies detected.',
            ],
            defensive: ['Order activity stable.', 'Account in good standing.', 'Maintain current engagement.'],
        },
    },
    'active-users': {
        admin: {
            aggressive: [
                '37 users, 98.2% retention. Deploy 3 enterprise testimonials in content pipeline immediately.',
                'Week-2 activation is critical drop-off. Assign CS rep to white-glove onboarding for Enterprise.',
                'Forecast 40 users — ensure infra scales to 50 before hitting milestone.',
            ],
            balanced: [
                'Growth 5.4% MoM sustainable. Focus activation — 78% complete onboarding currently.',
                'Retention 98.2% signals strong PMF. Use in outbound messaging.',
                'Watch Enterprise churn — 1 cancellation = 3x Pro churn revenue impact.',
            ],
            defensive: [
                'Monitor support ticket velocity as proxy for satisfaction.',
                'Fix 22% week-2 activation drop before scaling marketing.',
                'Support capacity must match growth trajectory.',
            ],
        },
        user: {
            aggressive: [
                '1 of 37 active users. Refer 1 enterprise contact for network effect benefits.',
                'Top 30% session frequency. Leverage for priority feature access.',
                'Pro upgrade within 90 days = 4x LTV. Window is open now.',
            ],
            balanced: [
                'Active and consistent engagement. Healthy retention signal.',
                'Consistent usage = best path to tier upgrade.',
                'Account health 94/100.',
            ],
            defensive: ['Account in good standing.', 'No risk indicators.', 'Stable engagement.'],
        },
    },
    'churn-rate': {
        admin: {
            aggressive: [
                'Churn flat 2 months at 1.8%. Fix week-2 activation gap NOW before it becomes 2.5% quarterly trend.',
                '2 Starter at-risk. Assign CS outreach this week = $660 ARR saved.',
                '0.67 users/month at 37 users. At 200 users = 3.6 churns/month — unsustainable.',
            ],
            balanced: [
                '1.8% vs industry 2.5% — outperforming. Monitor Enterprise specifically.',
                'Early intervention at day 14 reduces churn 31% on average.',
                'Forecast 1.6% achievable with current CS cadence.',
            ],
            defensive: [
                'Below industry but flat. Survey at-risk accounts proactively.',
                'Do not cut CS or support quality while churn is in flux.',
                'Hold pricing steady — increases spike Starter churn first.',
            ],
        },
        user: {
            aggressive: [
                'Churn risk 0%. Negotiate annual lock-in at 20% discount before pricing changes.',
                'Loyalty = beta program candidate. Contact CS for early access.',
                'Refer 1 contact to offset subscription cost via referral credit.',
            ],
            balanced: [
                'Zero churn risk. Continue engagement.',
                'Top 20% retained users. No action required.',
                'Annual plan cost-effective at your usage level.',
            ],
            defensive: ['No churn risk. Stable.', 'Maintain usage patterns.', 'Account in good standing.'],
        },
    },
};

function getBullets(slug: string, role: UserRole, persona: AIPersona): string[] {
    return FB[slug]?.[role]?.[persona] ?? ['Analysis unavailable.', '', ''];
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }: {
    active?: boolean;
    payload?: Array<{ color: string; value: number; name: string }>;
    label?: string; prefix?: string; suffix?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-4 py-3 rounded-xl border border-white/10 bg-[#050a15]/95 backdrop-blur-xl shadow-2xl">
            {label && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2" style={MONO}>{label}</p>}
            {payload.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-black text-white tabular-nums" style={MONO}>
                        {prefix}{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}{suffix}
                    </span>
                </div>
            ))}
        </div>
    );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] opacity-50"
                style={{ background: `linear-gradient(90deg,transparent,${color}50,transparent)` }} />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2" style={MONO}>{label}</p>
            <p className="text-2xl font-black text-white tabular-nums" style={MONO}>{value}</p>
            {sub && <p className="text-[10px] text-slate-500 mt-1" style={MONO}>{sub}</p>}
        </div>
    );
}

function MicroStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600" style={MONO}>{label}</span>
            <span className="text-[13px] font-black tabular-nums" style={{ color, ...MONO }}>{value}</span>
            <span className="text-[8px] text-slate-600" style={MONO}>{sub}</span>
        </div>
    );
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className={cn('relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 overflow-hidden h-full', className)}
        >
            <div className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.007) 2px,rgba(255,255,255,0.007) 4px)' }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <h3 className="relative text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 mb-5" style={MONO}>{title}</h3>
            <div className="relative">{children}</div>
        </motion.div>
    );
}

// ─── Key Drivers Sidebar ──────────────────────────────────────────────────────

function KeyDrivers({ slug, role }: { slug: string; role: UserRole }) {
    const drivers = role === 'user'
        ? (KEY_DRIVERS[slug] ?? []).slice(0, 2)
        : (KEY_DRIVERS[slug] ?? []);
    if (!drivers.length) return null;

    return (
        <SectionCard title="KEY DRIVERS">
            <div className="space-y-3">
                {drivers.map((d, i) => {
                    const Icon = d.icon;
                    return (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1] transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg" style={{ background: `${d.color}15` }}>
                                    <Icon size={11} style={{ color: d.color }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400" style={MONO}>{d.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-white" style={MONO}>{d.value}</span>
                                <span style={{ color: d.trend === 'up' ? '#10b981' : d.trend === 'down' ? '#f43f5e' : '#64748b' }}>
                                    {d.trend === 'up' ? <TrendingUp size={10} /> :
                                        d.trend === 'down' ? <TrendingDown size={10} /> :
                                            <ChevronRight size={10} />}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ─── Forensic Narrative ───────────────────────────────────────────────────────

function ForensicNarrative({ slug, role, persona, accentColor, maxBullets }: {
    slug: string; role: UserRole; persona: AIPersona; accentColor: string;
    /** Limit bullets shown. Omit for all. */
    maxBullets?: number;
}) {
    const allBullets = getBullets(slug, role, persona);
    const bullets = maxBullets !== undefined ? allBullets.slice(0, maxBullets) : allBullets;
    const pColor = persona === 'aggressive' ? '#f43f5e' : persona === 'defensive' ? '#10b981' : '#38bdf8';
    const roleLabel = role === 'admin' ? 'OWNER ACTION' : 'DEVELOPER UPDATE';

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="relative rounded-2xl border overflow-hidden"
            style={{ borderColor: `${accentColor}30`, background: `${accentColor}06`, boxShadow: `0 0 24px ${accentColor}10` }}>
            <div className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />
            <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg,transparent,${accentColor}60,transparent)` }} />
            <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Brain size={12} style={{ color: accentColor }} />
                        <span className="text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: accentColor, ...MONO }}>
                            FORENSIC NARRATIVE — {roleLabel}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border"
                            style={{ color: pColor, borderColor: `${pColor}30`, background: `${pColor}10`, ...MONO }}>
                            {persona.toUpperCase()} MODE
                        </span>
                        <span className={cn('text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1',
                            role === 'admin' ? 'text-sky-400 border-sky-400/25 bg-sky-400/10' : 'text-violet-400 border-violet-400/25 bg-violet-400/10')}>
                            {role === 'admin' ? <Shield size={7} /> : <User size={7} />}
                            {role === 'admin' ? 'GLOBAL VIEW' : 'PERSONAL VIEW'}
                        </span>
                    </div>
                </div>
                <div className="space-y-3">
                    {bullets.filter(Boolean).map((b, i) => (
                        <motion.div key={i}
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 + i * 0.08 }}
                            className="flex gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                            <span className="text-[8px] font-black shrink-0 mt-0.5" style={{ color: accentColor, ...MONO }}>
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <p className="text-[10px] text-slate-300 leading-relaxed" style={MONO}>{b}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Persona Switcher ─────────────────────────────────────────────────────────

function PersonaSwitcher({ persona, onChange }: { persona: AIPersona; onChange: (p: AIPersona) => void }) {
    return (
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
            {(['aggressive', 'balanced', 'defensive'] as AIPersona[]).map(p => {
                const c = p === 'aggressive' ? '#f43f5e' : p === 'defensive' ? '#10b981' : '#38bdf8';
                return (
                    <button key={p} onClick={() => onChange(p)}
                        className={cn('px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                            persona === p ? 'bg-white/[0.08]' : 'text-slate-600 hover:text-slate-400')}
                        style={persona === p ? { color: c, ...MONO } : MONO}>
                        {p}
                    </button>
                );
            })}
        </div>
    );
}

// ─── ATH dot annotation ───────────────────────────────────────────────────────

function ATHDot({ cx, cy, payload, dataKey, data, color }: {
    cx?: number; cy?: number;
    payload?: Record<string, unknown>;
    dataKey: string;
    data: Array<Record<string, number | string>>;
    color: string;
}) {
    if (!payload || cx === undefined || cy === undefined) return null;
    const vals = data.map(d => Number(d[dataKey]));
    const max = Math.max(...vals);
    if (Number(payload[dataKey]) !== max) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.2} />
            <circle cx={cx} cy={cy} r={3.5} fill={color} />
            <text x={cx} y={cy - 13} textAnchor="middle" fill={color} fontSize={8} fontWeight={900} fontFamily="monospace">ATH</text>
        </g>
    );
}

// ─── Chart components ─────────────────────────────────────────────────────────

function RevenueAreaChart({ data, accent, prefix }: { data: typeof REV_HIST; accent: string; prefix: string }) {
    const avg = Math.round(data.reduce((a, d) => a + d.revenue, 0) / data.length);
    const goalVal = data[data.length - 1].goal;
    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ left: -10, right: 8 }}>
                <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                    tickFormatter={v => `${prefix}${v}`} />
                <Tooltip content={<ChartTooltip prefix={prefix} />} />
                <ReferenceLine y={avg} stroke={accent} strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: `AVG ${prefix}${avg}`, position: 'insideTopRight', fill: accent, fontSize: 8, fontFamily: 'monospace' }} />
                <ReferenceLine y={goalVal} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: 'GOAL', position: 'insideTopLeft', fill: '#10b981', fontSize: 8, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="revenue" stroke={accent} strokeWidth={2.5} fill="url(#rg)"
                    dot={(props: any) => {
                        const { key, ...rest } = props;
                        return <ATHDot key={key} {...rest} dataKey="revenue" data={data} color={accent} />;
                    }}
                    activeDot={{ r: 5, fill: accent, stroke: '#0f172a', strokeWidth: 2 }} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function ProfitComposedChart({ data, accent }: { data: typeof REV_HIST; accent: string }) {
    const avg = Math.round(data.reduce((a, d) => a + d.profit, 0) / data.length);
    return (
        <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                    tickFormatter={v => `$${v}`} />
                <Tooltip content={<ChartTooltip prefix="$" />} />
                <ReferenceLine y={avg} stroke={accent} strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: `AVG $${avg}`, position: 'insideTopRight', fill: accent, fontSize: 8, fontFamily: 'monospace' }} />
                <Bar dataKey="revenue" fill={`${accent}22`} radius={[4, 4, 0, 0]} barSize={22} />
                <Line type="monotone" dataKey="profit" stroke={accent} strokeWidth={2.5}
                    dot={(props: any) => {
                        const { key, ...rest } = props;
                        return <ATHDot key={key} {...rest} dataKey="profit" data={data} color={accent} />;
                    }}
                    activeDot={{ r: 5, fill: accent, stroke: '#0f172a', strokeWidth: 2 }} />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

function OrdersBarChart({ accent }: { accent: string }) {
    const avg = Math.round(ORDERS_HIST.reduce((a, d) => a + d.value, 0) / ORDERS_HIST.length);
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ORDERS_HIST} margin={{ left: -20, right: 8 }}>
                <defs>
                    <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0.4} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={avg} stroke={accent} strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: `AVG ${avg}`, position: 'insideTopRight', fill: accent, fontSize: 8, fontFamily: 'monospace' }} />
                <ReferenceLine y={8} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: 'GOAL 8', position: 'insideTopLeft', fill: '#10b981', fontSize: 8, fontFamily: 'monospace' }} />
                <Bar dataKey="value" fill="url(#og)" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function UsersStepLine({ accent }: { accent: string }) {
    const avg = Math.round(USERS_STEP.reduce((a, d) => a + d.value, 0) / USERS_STEP.length);
    return (
        <ResponsiveContainer width="100%" height={260}>
            <LineChart data={USERS_STEP} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={avg} stroke={accent} strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: `AVG ${avg}`, position: 'insideTopRight', fill: accent, fontSize: 8, fontFamily: 'monospace' }} />
                <ReferenceLine y={40} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.45}
                    label={{ value: 'GOAL 40', position: 'insideTopLeft', fill: '#10b981', fontSize: 8, fontFamily: 'monospace' }} />
                {/* BUGFIX: was referencing undefined `data`; use USERS_STEP directly */}
                <Line type="stepAfter" dataKey="value" stroke={accent} strokeWidth={2.5}
                    dot={(props: any) => {
                        const { key, ...rest } = props;
                        return <ATHDot key={key} {...rest} dataKey="value" data={USERS_STEP} color={accent} />;
                    }}
                    activeDot={{ r: 5, fill: accent, stroke: '#0f172a', strokeWidth: 2 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}

function MarginDonut({ margin, accent }: { margin: number; accent: string }) {
    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie data={[{ name: 'Margin', value: margin, fill: accent }, { name: 'Cost', value: 100 - margin, fill: 'rgba(255,255,255,0.06)' }]}
                        innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none" animationDuration={1200}>
                        {[accent, 'rgba(255,255,255,0.06)'].map((c, i) => <Cell key={i} fill={c} fillOpacity={0.9} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white" style={MONO}>{margin}%</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500" style={MONO}>MARGIN</span>
                <span className="text-[8px] text-emerald-400 mt-0.5" style={MONO}>+18.7% vs industry</span>
            </div>
        </div>
    );
}

function ChurnGauge({ churnRate, accent }: { churnRate: number; accent: string }) {
    const pct = Math.min(100, (churnRate / 5) * 100);
    const color = churnRate > 3 ? '#f43f5e' : churnRate > 1.5 ? '#fbbf24' : '#10b981';
    const label = churnRate > 3 ? 'CRITICAL' : churnRate > 1.5 ? 'WARNING' : 'HEALTHY';
    return (
        <div className="relative flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%"
                    startAngle={180} endAngle={0} data={[{ value: pct, fill: color }]}>
                    <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.04)' }} cornerRadius={8} />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-4 pointer-events-none">
                <span className="text-3xl font-black text-white" style={MONO}>{churnRate}%</span>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1" style={{ color, ...MONO }}>{label}</span>
                <span className="text-[7px] text-slate-600 mt-0.5" style={MONO}>0–5% DANGER SCALE</span>
            </div>
        </div>
    );
}

// ─── Summary View (Dashboard density) ────────────────────────────────────────

function SummaryView({ slug, cfg, displayVal, prefix, suffix, accent, histData, role, persona }: {
    slug: string;
    cfg: (typeof SLUG_CONFIG)[string];
    displayVal: number;
    prefix: string;
    suffix: string;
    accent: string;
    histData: typeof REV_HIST;
    role: UserRole;
    persona: AIPersona;
}) {
    const Icon = cfg.icon;
    const humanText = cfg.humanLabel(displayVal, role);

    return (
        <div className="space-y-4">
            {/* Hero value */}
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl border" style={{ background: `${cfg.glowColor}15`, borderColor: `${cfg.glowColor}25` }}>
                    <Icon className="w-6 h-6" style={{ color: accent }} />
                </div>
                <div>
                    <p className="text-3xl font-black text-white tabular-nums" style={MONO}>
                        {prefix}{typeof displayVal === 'number' ? displayVal.toLocaleString() : displayVal}{suffix}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5" style={MONO}>{humanText}</p>
                </div>
            </div>

            {/* Single high-impact chart */}
            {slug === 'total-revenue' && <RevenueAreaChart data={histData} accent={accent} prefix={prefix} />}
            {slug === 'total-profit' && <ProfitComposedChart data={histData} accent={accent} />}
            {slug === 'profit-margin' && <MarginDonut margin={GLOBAL.margin} accent={accent} />}
            {slug === 'total-orders' && <OrdersBarChart accent={accent} />}
            {slug === 'active-users' && <UsersStepLine accent={accent} />}
            {slug === 'churn-rate' && <ChurnGauge churnRate={GLOBAL.churnRate} accent={accent} />}

            {/* Top 2 AI bullets only */}
            <ForensicNarrative slug={slug} role={role} persona={persona} accentColor={accent} maxBullets={2} />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const KPIDetailClient: React.FC<KPIDetailClientProps> = ({
    slug, analytics, stats,
    role = 'admin',
    persona: initPersona = 'balanced',
    viewMode = 'full',
    onBack,
}) => {
    const cfg = SLUG_CONFIG[slug];
    if (!cfg) return null;

    const [persona, setPersona] = useState<AIPersona>(initPersona);


    const accent = cfg.accentColor;
    const glow = cfg.glowColor;
    const prefix = cfg.prefix ?? '';
    const suffix = cfg.suffix ?? '';
    const Icon = cfg.icon;

    const displayVal = role === 'admin'
        ? (stats?.totalRevenue !== undefined && slug === 'total-revenue' ? stats.totalRevenue : cfg.adminValue)
        : cfg.userValue;

    const histData = role === 'admin' ? REV_HIST : REV_HIST_USER;
    const microStats = (MICRO_STATS[slug] ?? (() => []))(role);
    const humanText = cfg.humanLabel(displayVal, role);

    const handleExport = () => {
        const rows = `Metric,Value,Role,Persona,Timestamp\n"${cfg.label}","${prefix}${displayVal}${suffix}","${role}","${persona}","${new Date().toISOString()}"`;
        const blob = new Blob([rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}_${role}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── SUMMARY MODE: Dashboard compact density ───────────────────────────────
    if (viewMode === 'summary') {
        return (
            <SummaryView
                slug={slug} cfg={cfg} displayVal={displayVal}
                prefix={prefix} suffix={suffix} accent={accent}
                histData={histData} role={role} persona={persona}
            />
        );
    }

    // ── FULL MODE: Workspace deep-dive (all 1100+ lines of forensic detail) ───
    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600" style={MONO}>
                <button onClick={() => onBack ? onBack() : setActiveTab('pulse')} className="hover:text-sky-400 transition-colors flex items-center gap-1.5">
                    <ArrowLeft size={11} />
                </button>
                <span className="opacity-30">/</span>
                <span style={{ color: accent }}>{cfg.label}</span>
                {role === 'user' && <><span className="opacity-30">/</span><span className="text-violet-400">PERSONAL</span></>}
            </div>

            {/* ── Hero ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 overflow-hidden">
                <div className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />
                <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-[0.07] pointer-events-none"
                    style={{ background: `radial-gradient(circle,${glow},transparent 70%)` }} />
                <div className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg,transparent,${accent}60,transparent)` }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 flex-wrap">
                    {/* Left */}
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-2xl border flex-shrink-0" style={{ background: `${glow}15`, borderColor: `${glow}25` }}>
                            <Icon className="w-7 h-7" style={{ color: accent }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-600" style={MONO}>
                                    {role === 'admin' ? 'GLOBAL FORENSIC LAB' : 'PERSONAL CONTRIBUTION'}
                                </p>
                                <span className={cn('text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border flex items-center gap-1',
                                    role === 'admin' ? 'text-sky-400 border-sky-400/25 bg-sky-400/10' : 'text-violet-400 border-violet-400/25 bg-violet-400/10')}>
                                    {role === 'admin' ? <Shield size={7} /> : <User size={7} />}
                                    {role === 'admin' ? 'ADMIN' : 'MEMBER'}
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">{cfg.label}</h1>
                            <p className="text-slate-500 text-[11px] mt-0.5" style={MONO}>{cfg.description}</p>
                        </div>
                    </div>

                    {/* Right: big value + micro-stats + controls */}
                    <div className="flex flex-col gap-3">
                        <div>
                            <p className="text-4xl font-black text-white tabular-nums" style={MONO}>
                                {prefix}{typeof displayVal === 'number' ? displayVal.toLocaleString() : displayVal}{suffix}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-xs" style={MONO}>{humanText}</p>
                            {role === 'user' && (
                                <p className="text-[9px] text-slate-600 mt-0.5" style={MONO}>
                                    2% of company total ({prefix}{cfg.adminValue.toLocaleString()}{suffix})
                                </p>
                            )}
                        </div>

                        {/* Micro-stats row — AVG / ATH / FORECAST */}
                        {microStats.length > 0 && (
                            <div className="flex items-start gap-5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex-wrap">
                                {microStats.map((ms, i) => (
                                    <React.Fragment key={ms.label}>
                                        <MicroStat {...ms} color={accent} />
                                        {i < microStats.length - 1 && <div className="w-px h-8 bg-white/[0.06] self-center" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                <TrendingUp size={11} /> 12.5% vs last period
                            </div>
                            <PersonaSwitcher persona={persona} onChange={setPersona} />
                            <button onClick={handleExport}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-[9px] font-black text-slate-400 hover:text-white transition-all"
                                style={MONO}>
                                <Download size={10} /> CSV
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── TOTAL REVENUE ── */}
            {slug === 'total-revenue' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="This Month" value={`${prefix}${displayVal.toLocaleString()}`} sub="+12.5% MoM" color={accent} />
                        <StatCard label="Last Month" value={`${prefix}${role === 'admin' ? '1,740' : '35'}`} sub="Baseline" color={accent} />
                        <StatCard label="YTD" value={`${prefix}${role === 'admin' ? '11,570' : '231'}`} sub="Oct–Apr" color={accent} />
                        <StatCard label="Forecast" value={`${prefix}${role === 'admin' ? '1,980' : '40'}`} sub="Next 30d" color={accent} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <SectionCard title="REVENUE TREND — AREA CHART · AVG + GOAL REFERENCE LINES">
                                <RevenueAreaChart data={histData} accent={accent} prefix={prefix} />
                            </SectionCard>
                        </div>
                        <KeyDrivers slug={slug} role={role} />
                    </div>
                </>
            )}

            {/* ── TOTAL PROFIT ── */}
            {slug === 'total-profit' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="This Month" value={`${prefix}${displayVal.toLocaleString()}`} sub="+8.2% MoM" color={accent} />
                        <StatCard label="Last Month" value={`${prefix}${role === 'admin' ? '696' : '13.9'}`} sub="Baseline" color={accent} />
                        <StatCard label="Margin" value="40%" sub="Gross" color={accent} />
                        <StatCard label="API OpEx" value={role === 'admin' ? '$335' : '$6.70'} sub="Monthly burn" color={accent} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <SectionCard title="REVENUE VS PROFIT — COMPOSED CHART (BARS=REVENUE · LINE=PROFIT)">
                                <ProfitComposedChart data={histData} accent={accent} />
                            </SectionCard>
                        </div>
                        <KeyDrivers slug={slug} role={role} />
                    </div>
                    {role === 'admin' && (
                        <SectionCard title="WATERFALL EXPENSE BREAKDOWN — ADMIN ONLY">
                            <div className="space-y-3">
                                {EXPENSE_BREAKDOWN.map(e => (
                                    <div key={e.category}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-slate-400" style={MONO}>{e.category}</span>
                                            <span className="text-[10px] font-black text-white" style={MONO}>${e.amount}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${e.percentage}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                className="h-full rounded-full" style={{ background: accent }} />
                                        </div>
                                        <p className="text-[8px] text-slate-600 mt-0.5" style={MONO}>{e.percentage}% of total OpEx</p>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}
                    {role === 'user' && (
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
                            <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                            <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest" style={MONO}>
                                EXPENSE BREAKDOWN — ADMIN ONLY · Upgrade to Strategic Lead for full access
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ── PROFIT MARGIN ── */}
            {slug === 'profit-margin' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Current" value={`${displayVal}${suffix}`} sub="-2.1% MoM" color={accent} />
                        <StatCard label="Industry Avg" value="21.3%" sub="Benchmark" color={accent} />
                        <StatCard label="Best Month" value="42.1%" sub="Jan 2026" color={accent} />
                        <StatCard label="Target EOY" value="45.0%" sub="2026 goal" color={accent} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <SectionCard title="MARGIN DONUT — MARGIN VS COST">
                                <MarginDonut margin={GLOBAL.margin} accent={accent} />
                                <div className="flex justify-center gap-6 mt-3">
                                    {[{ n: 'Margin', c: accent }, { n: 'Cost', c: 'rgba(255,255,255,0.15)' }].map(d => (
                                        <div key={d.n} className="flex items-center gap-2 text-[10px] font-bold text-slate-400" style={MONO}>
                                            <div className="w-2 h-2 rounded-full" style={{ background: d.c }} /> {d.n}
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        </div>
                        <KeyDrivers slug={slug} role={role} />
                    </div>
                </>
            )}

            {/* ── TOTAL ORDERS ── */}
            {slug === 'total-orders' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="This Period" value={String(displayVal)} sub="+14.7% WoW" color={accent} />
                        <StatCard label="Peak Day" value="Friday" sub="11 orders" color={accent} />
                        <StatCard label="Success Rate" value="94.3%" sub="Completed" color={accent} />
                        <StatCard label="Failed" value="5.7%" sub="Refunded" color={accent} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <SectionCard title="ORDER VOLUME — BAR CHART · AVG + GOAL LINES">
                                <OrdersBarChart accent={accent} />
                            </SectionCard>
                        </div>
                        <KeyDrivers slug={slug} role={role} />
                    </div>
                </>
            )}

            {/* ── ACTIVE USERS ── */}
            {slug === 'active-users' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Active" value={String(displayVal)} sub="+5.4% MoM" color={accent} />
                        <StatCard label="Retention" value="98.2%" sub="30-day" color={accent} />
                        <StatCard label="New This Month" value={role === 'admin' ? '4' : '0'} sub="Joined recently" color={accent} />
                        <StatCard label="Inactive" value={role === 'admin' ? '3' : '0'} sub="Past 30 days" color={accent} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <SectionCard title="USER GROWTH — STEP LINE CHART · GOAL LINE">
                                <UsersStepLine accent={accent} />
                            </SectionCard>
                        </div>
                        <KeyDrivers slug={slug} role={role} />
                    </div>
                </>
            )}

            {/* ── CHURN RATE ── */}
            {slug === 'churn-rate' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Current Rate" value={`${displayVal}${suffix}`} sub="-0.3% MoM" color={accent} />
                        <StatCard label="Industry Avg" value="2.5%" sub="Benchmark" color={accent} />
                        <StatCard label="Retained" value="98.2%" sub="This month" color={accent} />
                        <StatCard label="Accts Lost" value={role === 'admin' ? '1' : '0'} sub="This period" color={accent} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SectionCard title="CHURN RADIAL GAUGE — 0–5% DANGER">
                                    <ChurnGauge churnRate={GLOBAL.churnRate} accent={accent} />
                                </SectionCard>
                                <SectionCard title="CHURN TREND">
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={CHURN_HIST} margin={{ left: -20, right: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false}
                                                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }} />
                                            <YAxis axisLine={false} tickLine={false}
                                                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'monospace' }}
                                                tickFormatter={v => `${v}%`} />
                                            <Tooltip content={<ChartTooltip suffix="%" />} />
                                            <ReferenceLine y={1.5} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.45}
                                                label={{ value: 'GOAL', position: 'insideTopLeft', fill: '#10b981', fontSize: 8, fontFamily: 'monospace' }} />
                                            <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} dot={false}
                                                activeDot={{ r: 5, fill: accent, stroke: '#0f172a', strokeWidth: 2 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </SectionCard>
                            </div>
                        </div>
                        <KeyDrivers slug={slug} role={role} />
                    </div>
                </>
            )}

            {/* Forensic Narrative — full bullets, always last */}
            <ForensicNarrative slug={slug} role={role} persona={persona} accentColor={accent} />
        </div>
    );
};