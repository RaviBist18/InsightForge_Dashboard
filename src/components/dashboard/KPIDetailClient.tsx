"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Percent,
  ShoppingCart,
  Users,
  Activity,
  Download,
  Shield,
  User,
  AlertTriangle,
  Target,
  Zap,
  Star,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  RadialBarChart,
  RadialBar,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { DashboardStats } from "@/lib/data";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type AIPersona = "aggressive" | "balanced" | "defensive";
type UserRole = "admin" | "user";

interface KPIDetailClientProps {
  slug: string;
  analytics: Record<string, unknown>;
  stats?: DashboardStats;
  role?: UserRole;
  persona?: AIPersona;
  userId?: string;
  viewMode?: "full" | "summary";
  onBack?: () => void;
}

// ─── Canonical values (known fake-data debt — original 6 slugs, see roadmap) ──

const GLOBAL = {
  mrr: 1800,
  profit: 720,
  margin: 40,
  orders: 53,
  activeUsers: 37,
  churnRate: 1.8,
};
const USER_C = {
  mrr: 36,
  profit: 14.4,
  margin: 40,
  orders: 1,
  activeUsers: 1,
  churnRate: 0.0,
};

// ─── Chart palette ────────────────────────────────────────────────────────────

const PALETTE = ["#003366", "#4C7A9E", "#94A3B8", "#C9A66B"];

// ─── Slug config ──────────────────────────────────────────────────────────────

const SLUG_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    accentColor: string;
    prefix?: string;
    suffix?: string;
    description: string;
    adminValue: number;
    userValue: number;
    humanLabel: (v: number, role: UserRole) => string;
  }
> = {
  "total-revenue": {
    label: "Total Revenue",
    icon: DollarSign,
    accentColor: PALETTE[0],
    prefix: "$",
    description: "Cumulative MRR across all subscription tiers.",
    adminValue: GLOBAL.mrr,
    userValue: USER_C.mrr,
    humanLabel: (v, r) =>
      r === "admin"
        ? "Company is performing 12% above the quarterly baseline."
        : `Your contribution is $${v}/mo — stable Starter tier seat.`,
  },
  "total-profit": {
    label: "Total Profit",
    icon: Briefcase,
    accentColor: PALETTE[1],
    prefix: "$",
    description: "Net profit after all operational and API costs.",
    adminValue: GLOBAL.profit,
    userValue: USER_C.profit,
    humanLabel: (v, r) =>
      r === "admin"
        ? "40% gross margin — 18.7 points above industry average."
        : `Your seat generates $${v.toFixed(2)} net profit this month.`,
  },
  "profit-margin": {
    label: "Profit Margin",
    icon: Percent,
    accentColor: PALETTE[3],
    suffix: "%",
    description: "Percentage of revenue retained as profit.",
    adminValue: GLOBAL.margin,
    userValue: USER_C.margin,
    humanLabel: () => "For every $1 earned, $0.40 is kept as profit.",
  },
  "total-orders": {
    label: "Total Orders",
    icon: ShoppingCart,
    accentColor: PALETTE[2],
    description: "Total transactions processed this period.",
    adminValue: GLOBAL.orders,
    userValue: USER_C.orders,
    humanLabel: (v, r) =>
      r === "admin"
        ? `${v} transactions processed — Friday is peak volume day.`
        : "Your 1 order this period is consistent with Starter usage.",
  },
  "active-users": {
    label: "Active Users",
    icon: Users,
    accentColor: PALETTE[0],
    description: "Unique users engaged with the platform.",
    adminValue: GLOBAL.activeUsers,
    userValue: USER_C.activeUsers,
    humanLabel: (v, r) =>
      r === "admin"
        ? `${v} active users — retention is 98.2%, outperforming industry by 4pts.`
        : "You are an active user with healthy session cadence.",
  },
  "churn-rate": {
    label: "Churn Rate",
    icon: Activity,
    accentColor: "#DC2626",
    suffix: "%",
    description: "Monthly subscriber cancellation rate.",
    adminValue: GLOBAL.churnRate,
    userValue: USER_C.churnRate,
    humanLabel: (_v, r) =>
      r === "admin"
        ? "Retention is high — only 1 account lost in the last 30 days."
        : "No churn risk detected on your account. Status: retained.",
  },
};

// ─── Chart datasets (known fake-data debt — original 6 slugs, see roadmap) ────

// ─── Chart datasets (known fake-data debt — original 6 slugs, see roadmap) ────
type RevPoint = { name: string; revenue: number; profit: number };
type NamedValuePoint = { name: string; value: number };

const EXPENSE_BREAKDOWN = [
  { category: "Hosting (Vercel)", amount: 180, percentage: 17 },
  { category: "Groq API tokens", amount: 240, percentage: 22 },
  { category: "Alpha Vantage", amount: 60, percentage: 6 },
  { category: "NewsAPI", amount: 50, percentage: 5 },
  { category: "Supabase", amount: 45, percentage: 4 },
  { category: "Other OpEx", amount: 505, percentage: 46 },
];

// ─── Key Drivers ──────────────────────────────────────────────────────────────

type Driver = {
  label: string;
  value: string;
  color: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
};

function CheckIcon({ size = 14 }: { size?: number }) {
  return <Target size={size} />;
}

const KEY_DRIVERS: Record<string, Driver[]> = {
  "total-revenue": [
    {
      label: "Enterprise Tier",
      value: "$840 / 46.7%",
      color: PALETTE[0],
      icon: Star,
      trend: "up",
    },
    {
      label: "Pro Tier",
      value: "$630 / 35.0%",
      color: PALETTE[1],
      icon: Zap,
      trend: "up",
    },
    {
      label: "Starter Tier",
      value: "$330 / 18.3%",
      color: PALETTE[2],
      icon: Users,
      trend: "neutral",
    },
  ],
  "total-profit": [
    {
      label: "Groq API Cost",
      value: "$240",
      color: "#DC2626",
      icon: AlertTriangle,
      trend: "down",
    },
    {
      label: "Vercel Hosting",
      value: "$180",
      color: "#D97706",
      icon: AlertCircle,
      trend: "neutral",
    },
  ],
  "profit-margin": [
    {
      label: "Enterprise Margin",
      value: "52%",
      color: "#059669",
      icon: TrendingUp,
      trend: "up",
    },
    {
      label: "Pro Margin",
      value: "38%",
      color: PALETTE[0],
      icon: TrendingUp,
      trend: "up",
    },
    {
      label: "Starter Margin",
      value: "24%",
      color: PALETTE[2],
      icon: TrendingDown,
      trend: "down",
    },
  ],
  "total-orders": [
    {
      label: "Success Rate",
      value: "94.3%",
      color: "#059669",
      icon: CheckIcon,
      trend: "up",
    },
    {
      label: "Failed/Refunded",
      value: "5.7%",
      color: "#DC2626",
      icon: AlertTriangle,
      trend: "down",
    },
    {
      label: "Peak Day (Fri)",
      value: "11 orders",
      color: "#D97706",
      icon: Zap,
      trend: "up",
    },
  ],
  "active-users": [
    {
      label: "Enterprise Users",
      value: "8 (21.6%)",
      color: PALETTE[0],
      icon: Shield,
      trend: "up",
    },
    {
      label: "Pro Users",
      value: "14 (37.8%)",
      color: PALETTE[1],
      icon: Users,
      trend: "up",
    },
    {
      label: "Starter Users",
      value: "15 (40.6%)",
      color: PALETTE[2],
      icon: User,
      trend: "neutral",
    },
  ],
  "churn-rate": [
    {
      label: "Starter At-Risk",
      value: "2 accounts",
      color: "#DC2626",
      icon: AlertTriangle,
      trend: "down",
    },
    {
      label: "Pro At-Risk",
      value: "1 account",
      color: "#D97706",
      icon: AlertCircle,
      trend: "down",
    },
    {
      label: "Enterprise At-Risk",
      value: "0 accounts",
      color: "#059669",
      icon: Shield,
      trend: "up",
    },
  ],
};

// ─── Micro-stats ──────────────────────────────────────────────────────────────

const MICRO_STATS: Record<
  string,
  (role: UserRole) => { label: string; value: string; sub: string }[]
> = {
  "total-revenue": (r) => [
    {
      label: "Avg / Month",
      value: r === "admin" ? "$1,567" : "$31",
      sub: "6-month avg",
    },
    {
      label: "All-Time High",
      value: r === "admin" ? "$1,800" : "$36",
      sub: "Apr 2026",
    },
    {
      label: "Forecast",
      value: r === "admin" ? "$1,980" : "$40",
      sub: "Next 30 days",
    },
  ],
  "total-profit": (r) => [
    {
      label: "Avg / Month",
      value: r === "admin" ? "$631" : "$12.60",
      sub: "6-month avg",
    },
    {
      label: "All-Time High",
      value: r === "admin" ? "$720" : "$14.40",
      sub: "Apr 2026",
    },
    {
      label: "Forecast",
      value: r === "admin" ? "$792" : "$15.80",
      sub: "Next 30 days",
    },
  ],
  "profit-margin": () => [
    { label: "Industry Avg", value: "21.3%", sub: "Benchmark" },
    { label: "All-Time High", value: "42.1%", sub: "Jan 2026" },
    { label: "Target", value: "45.0%", sub: "EOY 2026" },
  ],
  "total-orders": (r) => [
    {
      label: "Avg / Day",
      value: r === "admin" ? "7.6" : "0.14",
      sub: "7-day avg",
    },
    { label: "Peak Day", value: "Friday", sub: "11 orders" },
    {
      label: "Forecast",
      value: r === "admin" ? "61" : "1",
      sub: "Next period",
    },
  ],
  "active-users": (r) => [
    { label: "Retention", value: "98.2%", sub: "30-day" },
    { label: "Growth Rate", value: "+5.4%", sub: "MoM" },
    { label: "Forecast", value: r === "admin" ? "40" : "1", sub: "Next month" },
  ],
  "churn-rate": () => [
    { label: "Industry Avg", value: "2.5%", sub: "Benchmark" },
    { label: "Accts Lost", value: "1", sub: "This month" },
    { label: "Forecast", value: "1.6%", sub: "Next 30 days" },
  ],
};

// ─── Strategic notes (static reference text — not AI-generated, see label) ────

const FB: Record<string, Record<UserRole, Record<AIPersona, string[]>>> = {
  "total-revenue": {
    admin: {
      aggressive: [
        "Enterprise tier at 46.7% of MRR — push Enterprise expansion now. Each new seat = +$105/mo ARR.",
        "Starter at 18.3% is a drag. Force upgrade at 90-day mark or sunset the tier.",
        "Forecast $1,980 is conservative. Aggressive pipeline could hit $2,100 — assign reps to 3 warm leads.",
      ],
      balanced: [
        "MRR growth 12.5% MoM is healthy. Reduce CAC while sustaining Enterprise conversion above 18%.",
        "Starter-to-Pro conversion <5%. A/B test in-app upgrade prompts next sprint.",
        "$1,980 forecast achievable with current retention. Protect base before top-of-funnel push.",
      ],
      defensive: [
        "Focus on LTV/CAC ratio before scaling marketing. Current 3.2x is acceptable but not defensible.",
        "Protect Enterprise accounts. 1 lost Enterprise seat = -$105 MRR = 3 Starter churns.",
        "Hold pricing. Discounts compress margin below 38% and trigger compounding cost issues.",
      ],
    },
    user: {
      aggressive: [
        "$36 Starter contribution. Upgrade to Pro (+$52/mo) — AI briefings + priority support, 3x ROI in 60 days.",
        "Refer 1 enterprise contact. Referral users = 4x LTV + network effects.",
        "Starter has lowest retention priority. Upgrade before next tier restructure.",
      ],
      balanced: [
        "Stable at 2% of company MRR. Consistent usage is the best tier-upgrade indicator.",
        "Consider Pro when monthly usage exceeds 40 sessions — currently tracking at 28.",
        "Account health 94/100. No immediate action required.",
      ],
      defensive: [
        "Starter tier is sufficient for your usage pattern. No upgrade pressure.",
        "Maintain login cadence to avoid inactivity flags.",
        "Small but predictable contribution — low risk profile.",
      ],
    },
  },
  "total-profit": {
    admin: {
      aggressive: [
        "Groq API at $240/mo is biggest variable cost. Switch to Llama-local = $120/mo saving (+16.7% margin).",
        "40% margin is 5pts below best-in-class. Each margin point = $18/mo at $1,800 MRR.",
        "Kill bottom 10% OpEx. $50 NewsAPI + $45 Supabase are consolidation candidates.",
      ],
      balanced: [
        "Profit healthy. Monitor API cost — scales non-linearly with usage.",
        "Vercel $180/mo fixed cost. Evaluate edge caching before next billing cycle.",
        "Target 42% margin by Q3 via Groq token optimization — achievable with prompt caching.",
      ],
      defensive: [
        "40% margin buffer is solid. No new fixed costs until MRR exceeds $2,500.",
        "Keep API cost under 30% of revenue. Currently at 27% — watch as usage scales.",
        "Prioritize profitability over growth until 6-month cash runway confirmed.",
      ],
    },
    user: {
      aggressive: [
        "Seat generates $14.40 net profit. Upgrade to Pro → $26.40 — 2x with same overhead.",
        "Enterprise gets priority support + features. Upgrade path is clear and ROI-positive.",
        "Starter LTV: $518 over 3 years. Pro LTV: $1,512. The difference compounds.",
      ],
      balanced: [
        "Profit contribution proportional and stable. Consistent engagement drives LTV.",
        "No cost inefficiencies detected on your profile.",
        "Annual lock-in at 20% discount — worth evaluating if staying 12+ months.",
      ],
      defensive: [
        "Small but steady profit contribution. No action required.",
        "Starter is cost-efficient for current usage.",
        "Maintain until usage clearly justifies Pro-tier unlock.",
      ],
    },
  },
  "profit-margin": {
    admin: {
      aggressive: [
        "40% margin is 18.7pts above industry. Raise Enterprise pricing 12% — no churn risk at this margin.",
        "Starter at 24% is below target. Raise $8/mo or kill the tier within 2 quarters.",
        "Every 1pt margin improvement = $18/mo. Target 44% via Groq + Vercel optimization.",
      ],
      balanced: [
        "Outperformance vs industry is a strong signal. Use in investor conversations.",
        "Variable API costs will compress margin as revenue scales — manage proactively.",
        "Current OpEx is lean but fragile. One API spike = -3pts margin.",
      ],
      defensive: [
        "Healthy buffer. No new recurring costs until MRR hits $3,000.",
        "Industry at 21.3% — you are 18.7pts above. This is a moat. Protect it.",
        "No pricing discounts. 5% Enterprise discount = -$5.25 margin erosion per seat/month.",
      ],
    },
    user: {
      aggressive: [
        "Tier margin mirrors company at 40%. Upgrade to Enterprise for volume features.",
        "Annual lock-in protects against future price increases. Act before restructure.",
        "Starter has lowest feature investment priority in the portfolio.",
      ],
      balanced: [
        "Account margin in line with company standards. Stable.",
        "No margin action needed at current tier.",
        "Consider Pro when usage justifies +$52/mo — break-even at 40 monthly sessions.",
      ],
      defensive: [
        "Cost-efficient for current usage. No adjustments.",
        "Margin healthy. Stay on current plan.",
        "No risk indicators.",
      ],
    },
  },
  "total-orders": {
    admin: {
      aggressive: [
        "Friday peak at 11 orders. Deploy campaigns Thursday evening — 20% volume uplift achievable.",
        "Sunday trough at 4. Automated re-engagement Sunday morning recovers 2-3 orders/week.",
        "94.3% success leaves 5.7% on table. Fix top 3 checkout failures = +$180 annualized.",
      ],
      balanced: [
        "Order volume consistent. Weekend spike = consumer usage — evaluate B2B pipeline separately.",
        "Success rate 94.3% above industry 91%. Focus on 3% refund rate as highest-leverage fix.",
        "Daily goal 8 — met 4/7 days. Tue/Thu underperforming — investigate funnel.",
      ],
      defensive: [
        "Monitor volume decline as leading churn indicator before it hits MRR.",
        "Do not over-optimize volume at expense of quality — failed order costs 3x to resolve.",
        "Maintain current funnel before adding new acquisition channels.",
      ],
    },
    user: {
      aggressive: [
        "1 order is baseline. Increase sessions to drive referral velocity and upsell triggers.",
        "Refer 1 contact — 3x conversion vs cold leads, $0 CAC.",
        "Order history qualifies for annual plan discount. Lock in now.",
      ],
      balanced: [
        "Order activity consistent with Starter average. Stable.",
        "Consistent usage is the best tier-upgrade signal.",
        "No anomalies detected.",
      ],
      defensive: [
        "Order activity stable.",
        "Account in good standing.",
        "Maintain current engagement.",
      ],
    },
  },
  "active-users": {
    admin: {
      aggressive: [
        "37 users, 98.2% retention. Deploy 3 enterprise testimonials in content pipeline immediately.",
        "Week-2 activation is critical drop-off. Assign CS rep to white-glove onboarding for Enterprise.",
        "Forecast 40 users — ensure infra scales to 50 before hitting milestone.",
      ],
      balanced: [
        "Growth 5.4% MoM sustainable. Focus activation — 78% complete onboarding currently.",
        "Retention 98.2% signals strong PMF. Use in outbound messaging.",
        "Watch Enterprise churn — 1 cancellation = 3x Pro churn revenue impact.",
      ],
      defensive: [
        "Monitor support ticket velocity as proxy for satisfaction.",
        "Fix 22% week-2 activation drop before scaling marketing.",
        "Support capacity must match growth trajectory.",
      ],
    },
    user: {
      aggressive: [
        "1 of 37 active users. Refer 1 enterprise contact for network effect benefits.",
        "Top 30% session frequency. Leverage for priority feature access.",
        "Pro upgrade within 90 days = 4x LTV. Window is open now.",
      ],
      balanced: [
        "Active and consistent engagement. Healthy retention signal.",
        "Consistent usage = best path to tier upgrade.",
        "Account health 94/100.",
      ],
      defensive: [
        "Account in good standing.",
        "No risk indicators.",
        "Stable engagement.",
      ],
    },
  },
  "churn-rate": {
    admin: {
      aggressive: [
        "Churn flat 2 months at 1.8%. Fix week-2 activation gap now before it becomes 2.5% quarterly trend.",
        "2 Starter at-risk. Assign CS outreach this week = $660 ARR saved.",
        "0.67 users/month at 37 users. At 200 users = 3.6 churns/month — unsustainable.",
      ],
      balanced: [
        "1.8% vs industry 2.5% — outperforming. Monitor Enterprise specifically.",
        "Early intervention at day 14 reduces churn 31% on average.",
        "Forecast 1.6% achievable with current CS cadence.",
      ],
      defensive: [
        "Below industry but flat. Survey at-risk accounts proactively.",
        "Do not cut CS or support quality while churn is in flux.",
        "Hold pricing steady — increases spike Starter churn first.",
      ],
    },
    user: {
      aggressive: [
        "Churn risk 0%. Negotiate annual lock-in at 20% discount before pricing changes.",
        "Loyalty = beta program candidate. Contact CS for early access.",
        "Refer 1 contact to offset subscription cost via referral credit.",
      ],
      balanced: [
        "Zero churn risk. Continue engagement.",
        "Top 20% retained users. No action required.",
        "Annual plan cost-effective at your usage level.",
      ],
      defensive: [
        "No churn risk. Stable.",
        "Maintain usage patterns.",
        "Account in good standing.",
      ],
    },
  },
};

function getBullets(
  slug: string,
  role: UserRole,
  persona: AIPersona,
): string[] {
  return FB[slug]?.[role]?.[persona] ?? [];
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ color: string; value: number; name: string }>;
  label?: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-4 py-3 rounded-xl border shadow-lg"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {label && (
        <p
          className="text-[11px] font-medium mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      )}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {prefix}
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : item.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <p
        className="text-[11px] font-medium mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-semibold tabular-nums"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[11px] mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function MicroStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="text-[14px] font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {sub}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("relative rounded-xl border p-6 h-full", className)}
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <h3
        className="text-[12px] font-semibold mb-5"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h3>
      <div>{children}</div>
    </motion.div>
  );
}

// ─── Key Drivers Sidebar ──────────────────────────────────────────────────────

function KeyDrivers({ slug, role }: { slug: string; role: UserRole }) {
  const drivers =
    role === "user"
      ? (KEY_DRIVERS[slug] ?? []).slice(0, 2)
      : (KEY_DRIVERS[slug] ?? []);
  if (!drivers.length) return null;

  return (
    <SectionCard title="Key Drivers">
      <div className="space-y-3">
        {drivers.map((d, i) => {
          const Icon = d.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-primary)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ background: `${d.color}15` }}
                >
                  <Icon size={13} style={{ color: d.color }} />
                </div>
                <span
                  className="text-[12px] font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {d.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {d.value}
                </span>
                <span
                  style={{
                    color:
                      d.trend === "up"
                        ? "var(--success)"
                        : d.trend === "down"
                          ? "var(--danger)"
                          : "var(--text-muted)",
                  }}
                >
                  {d.trend === "up" ? (
                    <TrendingUp size={12} />
                  ) : d.trend === "down" ? (
                    <TrendingDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Strategic Notes (static reference text, not live AI generation) ──────────

function ForensicNarrative({
  slug,
  role,
  persona,
  accentColor,
  maxBullets,
}: {
  slug: string;
  role: UserRole;
  persona: AIPersona;
  accentColor: string;
  maxBullets?: number;
}) {
  const allBullets = getBullets(slug, role, persona);
  if (!allBullets.length) return null;
  const bullets =
    maxBullets !== undefined ? allBullets.slice(0, maxBullets) : allBullets;
  const roleLabel = role === "admin" ? "Company View" : "Personal View";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className="relative rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span
            className="text-[11px] font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Strategic Notes — {roleLabel}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
            style={{
              color: "var(--accent)",
              borderColor: "var(--accent)",
              background: "var(--accent-subtle)",
            }}
          >
            {persona.charAt(0).toUpperCase() + persona.slice(1)} mode
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Reference guidance, not live-generated
          </span>
        </div>
        <div className="space-y-3">
          {bullets.filter(Boolean).map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
              className="flex gap-3 p-3 rounded-xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-primary)",
              }}
            >
              <span
                className="text-[11px] font-semibold shrink-0 mt-0.5"
                style={{ color: accentColor }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {b}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Persona Switcher ─────────────────────────────────────────────────────────

function PersonaSwitcher({
  persona,
  onChange,
}: {
  persona: AIPersona;
  onChange: (p: AIPersona) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-xl border p-1"
      style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
    >
      {(["aggressive", "balanced", "defensive"] as AIPersona[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all"
          style={{
            background: persona === p ? "var(--accent-subtle)" : "transparent",
            color: persona === p ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ─── ATH dot annotation ───────────────────────────────────────────────────────

function ATHDot({
  cx,
  cy,
  payload,
  dataKey,
  data,
  color,
}: {
  cx?: number;
  cy?: number;
  payload?: Record<string, unknown>;
  dataKey: string;
  data: Array<Record<string, number | string>>;
  color: string;
}) {
  if (!payload || cx === undefined || cy === undefined) return null;
  const vals = data.map((d) => Number(d[dataKey]));
  const max = Math.max(...vals);
  if (Number(payload[dataKey]) !== max) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={3} fill={color} />
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fill={color}
        fontSize={9}
        fontWeight={600}
      >
        ATH
      </text>
    </g>
  );
}

// ─── Chart components ─────────────────────────────────────────────────────────

function RevenueAreaChart({
  data,
  accent,
  prefix,
}: {
  data: RevPoint[];
  accent: string;
  prefix: string;
}) {
  const avg = data.length
    ? Math.round(data.reduce((a, d) => a + d.revenue, 0) / data.length)
    : 0;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 8 }}>
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          tickFormatter={(v) => `${prefix}${v}`}
        />
        <Tooltip content={<ChartTooltip prefix={prefix} />} />
        <ReferenceLine
          y={avg}
          stroke={accent}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{
            value: `Avg ${prefix}${avg}`,
            position: "insideTopRight",
            fill: accent,
            fontSize: 10,
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={accent}
          strokeWidth={2}
          fill="url(#rg)"
          dot={(props: any) => {
            const { key, ...rest } = props;
            return (
              <ATHDot
                key={key}
                {...rest}
                dataKey="revenue"
                data={data}
                color={accent}
              />
            );
          }}
          activeDot={{ r: 5, fill: accent, stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ProfitComposedChart({
  data,
  accent,
}: {
  data: RevPoint[];
  accent: string;
}) {
  const avg = data.length
    ? Math.round(data.reduce((a, d) => a + d.profit, 0) / data.length)
    : 0;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={<ChartTooltip prefix="$" />} />
        <ReferenceLine
          y={avg}
          stroke={accent}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{
            value: `Avg $${avg}`,
            position: "insideTopRight",
            fill: accent,
            fontSize: 10,
          }}
        />
        <Bar
          dataKey="revenue"
          fill={`${accent}25`}
          radius={[4, 4, 0, 0]}
          barSize={22}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke={accent}
          strokeWidth={2}
          dot={(props: any) => {
            const { key, ...rest } = props;
            return (
              <ATHDot
                key={key}
                {...rest}
                dataKey="profit"
                data={data}
                color={accent}
              />
            );
          }}
          activeDot={{ r: 5, fill: accent, stroke: "#fff", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function OrdersBarChart({
  data,
  accent,
}: {
  data: NamedValuePoint[];
  accent: string;
}) {
  const avg = data.length
    ? Math.round(data.reduce((a, d) => a + d.value, 0) / data.length)
    : 0;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine
          y={avg}
          stroke={accent}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{
            value: `Avg ${avg}`,
            position: "insideTopRight",
            fill: accent,
            fontSize: 10,
          }}
        />
        <Bar dataKey="value" fill={accent} radius={[6, 6, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function UsersStepLine({
  data,
  accent,
}: {
  data: NamedValuePoint[];
  accent: string;
}) {
  const avg = data.length
    ? Math.round(data.reduce((a, d) => a + d.value, 0) / data.length)
    : 0;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine
          y={avg}
          stroke={accent}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{
            value: `Avg ${avg}`,
            position: "insideTopRight",
            fill: accent,
            fontSize: 10,
          }}
        />
        <Line
          type="stepAfter"
          dataKey="value"
          stroke={accent}
          strokeWidth={2}
          dot={(props: any) => {
            const { key, ...rest } = props;
            return (
              <ATHDot
                key={key}
                {...rest}
                dataKey="value"
                data={data}
                color={accent}
              />
            );
          }}
          activeDot={{ r: 5, fill: accent, stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MarginDonut({ margin, accent }: { margin: number; accent: string }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={[
              { name: "Margin", value: margin, fill: accent },
              { name: "Cost", value: 100 - margin, fill: "#E5E7EB" },
            ]}
            innerRadius={65}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            animationDuration={900}
          >
            {[accent, "#E5E7EB"].map((c, i) => (
              <Cell key={i} fill={c} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip suffix="%" />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {margin}%
        </span>
        <span
          className="text-[10px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Margin
        </span>
        <span
          className="text-[10px] mt-0.5"
          style={{ color: "var(--success)" }}
        >
          +18.7% vs industry
        </span>
      </div>
    </div>
  );
}

function ChurnGauge({
  churnRate,
  accent,
}: {
  churnRate: number;
  accent: string;
}) {
  const pct = Math.min(100, (churnRate / 5) * 100);
  const color =
    churnRate > 3
      ? "var(--danger)"
      : churnRate > 1.5
        ? "var(--warning)"
        : "var(--success)";
  const label =
    churnRate > 3 ? "Critical" : churnRate > 1.5 ? "Watch" : "Healthy";
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart
          cx="50%"
          cy="80%"
          innerRadius="60%"
          outerRadius="90%"
          startAngle={180}
          endAngle={0}
          data={[{ value: pct, fill: color }]}
        >
          <RadialBar
            dataKey="value"
            background={{ fill: "#F1F5F9" }}
            cornerRadius={8}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-4 pointer-events-none">
        <span
          className="text-3xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {churnRate}%
        </span>
        <span className="text-[10px] font-medium mt-1" style={{ color }}>
          {label}
        </span>
        <span
          className="text-[10px] mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          0–5% scale
        </span>
      </div>
    </div>
  );
}

// ─── Summary View (Dashboard density) ─────────────────────────────────────────

function SummaryView({
  slug,
  cfg,
  displayVal,
  prefix,
  suffix,
  accent,
  histData,
  ordersHistData,
  usersHistData,
  role,
  persona,
}: {
  slug: string;
  cfg: (typeof SLUG_CONFIG)[string];
  displayVal: number;
  prefix: string;
  suffix: string;
  accent: string;
  histData: RevPoint[];
  ordersHistData: NamedValuePoint[];
  usersHistData: NamedValuePoint[];
  role: UserRole;
  persona: AIPersona;
}) {
  if (!cfg) return null;

  const Icon = cfg.icon;
  const humanText = cfg.humanLabel(displayVal, role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div
          className="p-3 rounded-xl border"
          style={{
            background: "var(--accent-subtle)",
            borderColor: "var(--border)",
          }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div>
          <p
            className="text-3xl font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {prefix}
            {typeof displayVal === "number"
              ? displayVal.toLocaleString()
              : displayVal}
            {suffix}
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {humanText}
          </p>
        </div>
      </div>

      {slug === "total-revenue" && (
        <RevenueAreaChart data={histData} accent={accent} prefix={prefix} />
      )}
      {slug === "total-profit" && (
        <ProfitComposedChart data={histData} accent={accent} />
      )}
      {slug === "profit-margin" && (
        <MarginDonut margin={displayVal} accent={accent} />
      )}
      {slug === "total-orders" && (
        <OrdersBarChart data={ordersHistData} accent={accent} />
      )}
      {slug === "active-users" && (
        <UsersStepLine data={usersHistData} accent={accent} />
      )}
      {slug === "churn-rate" && (
        <ChurnGauge churnRate={displayVal} accent={accent} />
      )}

      <ForensicNarrative
        slug={slug}
        role={role}
        persona={persona}
        accentColor={accent}
        maxBullets={2}
      />
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export const KPIDetailClient: React.FC<KPIDetailClientProps> = ({
  slug,
  analytics,
  stats,
  role = "admin",
  persona: initPersona = "balanced",
  viewMode = "full",
  onBack,
  userId,
}) => {
  const cfg = SLUG_CONFIG[slug];
  const [persona, setPersona] = useState<AIPersona>(initPersona);
  const [histData, setHistData] = useState<RevPoint[]>([]);
  const [ordersHistData, setOrdersHistData] = useState<NamedValuePoint[]>([]);
  const [usersHistData, setUsersHistData] = useState<NamedValuePoint[]>([]);
  const [churnHistData, setChurnHistData] = useState<NamedValuePoint[]>([]);
  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    const fetchHistories = async () => {
      if (!userId) return;
      try {
        const { data: membership } = await supabase
          .from("memberships")
          .select("company_id")
          .eq("user_id", userId)
          .single();
        if (!membership?.company_id) return;

        let query = supabase
          .from("transactions")
          .select("amount, customer, created_at")
          .eq("company_id", membership.company_id);
        if (role === "user") {
          query = query.eq("user_id", userId);
        }
        const { data: txns, error } = await query;
        if (error) throw error;
        const rows = txns || [];

        // ── Revenue / Profit (last 6 months) ──
        const now = new Date();
        const months: { key: string; name: string }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            key: `${d.getFullYear()}-${d.getMonth()}`,
            name: d.toLocaleString("en-US", { month: "short" }),
          });
        }
        const revSums: Record<string, number> = {};
        const customersByMonth: Record<string, Set<string>> = {};
        months.forEach((m) => {
          revSums[m.key] = 0;
          customersByMonth[m.key] = new Set();
        });
        rows.forEach((t: any) => {
          const d = new Date(t.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (key in revSums) {
            revSums[key] += Number(t.amount) || 0;
            if (t.customer) customersByMonth[key].add(t.customer);
          }
        });
        const revPoints: RevPoint[] = months.map((m) => ({
          name: m.name,
          revenue: Math.round(revSums[m.key]),
          profit: Math.round(revSums[m.key] * 0.4),
        }));

        // ── Active users (distinct customers per month) ──
        const usersPoints: NamedValuePoint[] = months.map((m) => ({
          name: m.name,
          value: customersByMonth[m.key].size,
        }));

        // ── Churn (customers present last month, absent this month) ──
        const churnPoints: NamedValuePoint[] = months.map((m, i) => {
          if (i === 0) return { name: m.name, value: 0 };
          const prev = customersByMonth[months[i - 1].key];
          const curr = customersByMonth[m.key];
          if (prev.size === 0) return { name: m.name, value: 0 };
          let lost = 0;
          prev.forEach((c) => {
            if (!curr.has(c)) lost += 1;
          });
          return {
            name: m.name,
            value: parseFloat(((lost / prev.size) * 100).toFixed(1)),
          };
        });

        // ── Orders (transaction count, last 7 days) ──
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayCounts: Record<string, number> = {};
        const last7 = new Date();
        last7.setDate(last7.getDate() - 6);
        rows.forEach((t: any) => {
          const d = new Date(t.created_at);
          if (d >= last7) {
            const label = dayLabels[d.getDay()];
            dayCounts[label] = (dayCounts[label] || 0) + 1;
          }
        });
        const orderedDays: NamedValuePoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const label = dayLabels[d.getDay()];
          orderedDays.push({ name: label, value: dayCounts[label] || 0 });
        }

        if (!cancelled) {
          setHistData(revPoints);
          setUsersHistData(usersPoints);
          setChurnHistData(churnPoints);
          setOrdersHistData(orderedDays);
        }
      } catch (err) {
        console.error("fetchHistories error:", err);
      }
    };
    fetchHistories();
    return () => {
      cancelled = true;
    };
  }, [userId, role]);
  const isAdmin = role === "admin";

  const accent = cfg.accentColor;
  const prefix = cfg.prefix ?? "";
  const suffix = cfg.suffix ?? "";
  const Icon = cfg.icon;

  const displayVal = (() => {
    if (role === "admin") {
      if (slug === "total-revenue" && stats?.totalRevenue !== undefined)
        return stats.totalRevenue;
      if (slug === "total-profit" && stats?.totalProfit !== undefined)
        return stats.totalProfit;
      if (slug === "profit-margin" && stats?.profitMargin !== undefined)
        return stats.profitMargin;
      if (slug === "total-orders" && stats?.totalOrders !== undefined)
        return stats.totalOrders;
      if (slug === "active-users" && stats?.activeUsers !== undefined)
        return stats.activeUsers;
      if (slug === "churn-rate" && stats?.churnRate !== undefined)
        return stats.churnRate;
      return cfg.adminValue;
    }
    if (slug === "total-revenue" && stats?.totalRevenue !== undefined)
      return stats.totalRevenue;
    if (slug === "total-profit" && stats?.totalProfit !== undefined)
      return stats.totalProfit;
    if (slug === "profit-margin" && stats?.profitMargin !== undefined)
      return stats.profitMargin;
    if (slug === "total-asset-value" && stats?.totalAssetValue !== undefined)
      return stats.totalAssetValue;
    if (
      slug === "market-growth-yield" &&
      stats?.marketGrowthYield !== undefined
    )
      return stats.marketGrowthYield;
    if (slug === "active-nodes-count" && stats?.activeNodesCount !== undefined)
      return stats.activeNodesCount;
    return cfg.userValue;
  })();

  const microStats = (MICRO_STATS[slug] ?? (() => []))(role);
  const humanText = cfg.humanLabel(displayVal, role);

  const handleExport = () => {
    const rows = `Metric,Value,Role,Persona,Timestamp\n"${cfg.label}","${prefix}${displayVal}${suffix}","${role}","${persona}","${new Date().toISOString()}"`;
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}_${role}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (viewMode === "summary") {
    return (
      <SummaryView
        slug={slug}
        cfg={cfg}
        displayVal={displayVal}
        prefix={prefix}
        suffix={suffix}
        accent={accent}
        histData={histData}
        ordersHistData={ordersHistData}
        usersHistData={usersHistData}
        role={role}
        persona={persona}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-2 text-[12px] font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        <button
          onClick={() => onBack?.()}
          className="transition-colors flex items-center gap-1.5 hover:opacity-70"
        >
          <ArrowLeft size={13} />
        </button>
        <span className="opacity-40">/</span>
        <span style={{ color: accent }}>{cfg.label}</span>
        {role === "user" && (
          <>
            <span className="opacity-40">/</span>
            <span style={{ color: "var(--text-secondary)" }}>Personal</span>
          </>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-xl border p-7"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="p-4 rounded-xl border flex-shrink-0"
              style={{
                background: "var(--accent-subtle)",
                borderColor: "var(--border)",
              }}
            >
              <Icon className="w-7 h-7" style={{ color: accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p
                  className="text-[11px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {role === "admin" ? "Company View" : "Personal Contribution"}
                </p>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1"
                  style={{
                    color: "var(--accent)",
                    borderColor: "var(--accent)",
                    background: "var(--accent-subtle)",
                  }}
                >
                  {role === "admin" ? <Shield size={10} /> : <User size={10} />}
                  {role === "admin" ? "Admin" : "Member"}
                </span>
              </div>
              <h1
                className="text-3xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {cfg.label}
              </h1>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {cfg.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p
                className="text-4xl font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {prefix}
                {typeof displayVal === "number"
                  ? displayVal.toLocaleString()
                  : displayVal}
                {suffix}
              </p>
              <p
                className="text-[12px] mt-1 max-w-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {humanText}
              </p>
              {role === "user" && (
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  2% of company total ({prefix}
                  {cfg.adminValue.toLocaleString()}
                  {suffix})
                </p>
              )}
            </div>

            {microStats.length > 0 && (
              <div
                className="flex items-start gap-5 p-3 rounded-xl border flex-wrap"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-primary)",
                }}
              >
                {microStats.map((ms, i) => (
                  <React.Fragment key={ms.label}>
                    <MicroStat {...ms} color={accent} />
                    {i < microStats.length - 1 && (
                      <div
                        className="w-px h-8 self-center"
                        style={{ background: "var(--border)" }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium"
                style={{
                  background: "var(--success-bg)",
                  color: "var(--success)",
                  borderColor: "var(--success)",
                }}
              >
                <TrendingUp size={12} /> 12.5% vs last period
              </div>
              <PersonaSwitcher persona={persona} onChange={setPersona} />
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium transition-all hover:opacity-80"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-secondary)",
                }}
              >
                <Download size={12} /> CSV
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {slug === "total-revenue" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="This Month"
              value={`${prefix}${displayVal.toLocaleString()}`}
              sub="+12.5% MoM"
              color={accent}
            />
            <StatCard
              label="Last Month"
              value={`${prefix}${role === "admin" ? "1,740" : "35"}`}
              sub="Baseline"
              color={accent}
            />
            <StatCard
              label="YTD"
              value={`${prefix}${role === "admin" ? "11,570" : "231"}`}
              sub="Oct–Apr"
              color={accent}
            />
            <StatCard
              label="Forecast"
              value={`${prefix}${role === "admin" ? "1,980" : "40"}`}
              sub="Next 30d"
              color={accent}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              isAdmin && "lg:grid-cols-3",
            )}
          >
            <div className={isAdmin ? "lg:col-span-2" : "w-full"}>
              <SectionCard title="Revenue Trend">
                <RevenueAreaChart
                  data={histData}
                  accent={accent}
                  prefix={prefix}
                />
              </SectionCard>
            </div>
            {isAdmin && <KeyDrivers slug={slug} role={role} />}
          </div>
        </>
      )}

      {slug === "total-profit" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="This Month"
              value={`${prefix}${displayVal.toLocaleString()}`}
              sub="+8.2% MoM"
              color={accent}
            />
            <StatCard
              label="Last Month"
              value={`${prefix}${role === "admin" ? "696" : "13.9"}`}
              sub="Baseline"
              color={accent}
            />
            <StatCard label="Margin" value="40%" sub="Gross" color={accent} />
            <StatCard
              label="API Cost"
              value={role === "admin" ? "$335" : "$6.70"}
              sub="Monthly"
              color={accent}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              isAdmin && "lg:grid-cols-3",
            )}
          >
            <div className={isAdmin ? "lg:col-span-2" : "w-full"}>
              <SectionCard title="Revenue vs Profit">
                <ProfitComposedChart data={histData} accent={accent} />
              </SectionCard>
            </div>
            {isAdmin && <KeyDrivers slug={slug} role={role} />}
          </div>
          {role === "admin" && (
            <SectionCard title="Expense Breakdown">
              <div className="space-y-3">
                {EXPENSE_BREAKDOWN.map((e) => (
                  <div key={e.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {e.category}
                      </span>
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        ${e.amount}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "#E5E7EB" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${e.percentage}%` }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                        className="h-full rounded-full"
                        style={{ background: accent }}
                      />
                    </div>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {e.percentage}% of total OpEx
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {role === "user" && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl border"
              style={{
                borderColor: "var(--warning)",
                background: "var(--warning-bg)",
              }}
            >
              <AlertTriangle
                size={13}
                style={{ color: "var(--warning)" }}
                className="shrink-0"
              />
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--warning)" }}
              >
                Expense breakdown is admin-only.
              </p>
            </div>
          )}
        </>
      )}

      {slug === "profit-margin" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Current"
              value={`${displayVal}${suffix}`}
              sub="-2.1% MoM"
              color={accent}
            />
            <StatCard
              label="Industry Avg"
              value="21.3%"
              sub="Benchmark"
              color={accent}
            />
            <StatCard
              label="Best Month"
              value="42.1%"
              sub="Jan 2026"
              color={accent}
            />
            <StatCard
              label="Target EOY"
              value="45.0%"
              sub="2026 goal"
              color={accent}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              isAdmin && "lg:grid-cols-3",
            )}
          >
            <div className={isAdmin ? "lg:col-span-2" : "w-full"}>
              <SectionCard title="Margin Breakdown">
                <MarginDonut margin={displayVal} accent={accent} />
                <div className="flex justify-center gap-6 mt-3">
                  {[
                    { n: "Margin", c: accent },
                    { n: "Cost", c: "#E5E7EB" },
                  ].map((d) => (
                    <div
                      key={d.n}
                      className="flex items-center gap-2 text-[12px] font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: d.c }}
                      />{" "}
                      {d.n}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
            {isAdmin && <KeyDrivers slug={slug} role={role} />}
          </div>
        </>
      )}

      {slug === "total-orders" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="This Period"
              value={String(displayVal)}
              sub="+14.7% WoW"
              color={accent}
            />
            <StatCard
              label="Peak Day"
              value="Friday"
              sub="11 orders"
              color={accent}
            />
            <StatCard
              label="Success Rate"
              value="94.3%"
              sub="Completed"
              color={accent}
            />
            <StatCard
              label="Failed"
              value="5.7%"
              sub="Refunded"
              color={accent}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              isAdmin && "lg:grid-cols-3",
            )}
          >
            <div className={isAdmin ? "lg:col-span-2" : "w-full"}>
              <SectionCard title="Order Volume">
                <OrdersBarChart data={ordersHistData} accent={accent} />
              </SectionCard>
            </div>
            {isAdmin && <KeyDrivers slug={slug} role={role} />}
          </div>
        </>
      )}

      {slug === "active-users" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Active"
              value={String(displayVal)}
              sub="+5.4% MoM"
              color={accent}
            />
            <StatCard
              label="Retention"
              value="98.2%"
              sub="30-day"
              color={accent}
            />
            <StatCard
              label="New This Month"
              value={role === "admin" ? "4" : "0"}
              sub="Joined recently"
              color={accent}
            />
            <StatCard
              label="Inactive"
              value={role === "admin" ? "3" : "0"}
              sub="Past 30 days"
              color={accent}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              isAdmin && "lg:grid-cols-3",
            )}
          >
            <div className={isAdmin ? "lg:col-span-2" : "w-full"}>
              <SectionCard title="User Growth">
                <UsersStepLine data={usersHistData} accent={accent} />
              </SectionCard>
            </div>
            {isAdmin && <KeyDrivers slug={slug} role={role} />}
          </div>
        </>
      )}

      {slug === "churn-rate" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Current Rate"
              value={`${displayVal}${suffix}`}
              sub="-0.3% MoM"
              color={accent}
            />
            <StatCard
              label="Industry Avg"
              value="2.5%"
              sub="Benchmark"
              color={accent}
            />
            <StatCard
              label="Retained"
              value="98.2%"
              sub="This month"
              color={accent}
            />
            <StatCard
              label="Accts Lost"
              value={role === "admin" ? "1" : "0"}
              sub="This period"
              color={accent}
            />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              isAdmin && "lg:grid-cols-3",
            )}
          >
            <div className={isAdmin ? "lg:col-span-2" : "w-full"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Churn Gauge">
                  <ChurnGauge churnRate={displayVal} accent={accent} />
                </SectionCard>
                <SectionCard title="Churn Trend">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={churnHistData}
                      margin={{ left: -20, right: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={accent}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: accent,
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </SectionCard>
              </div>
            </div>
            {isAdmin && <KeyDrivers slug={slug} role={role} />}
          </div>
        </>
      )}

      <ForensicNarrative
        slug={slug}
        role={role}
        persona={persona}
        accentColor={accent}
      />
    </div>
  );
};
