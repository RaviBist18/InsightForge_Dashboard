"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BarChart2,
  Globe,
  Zap,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

const COLORS = ["#003366", "#4C7A9E", "#94A3B8", "#C9A66B"];
const GROSS_MARGIN = 0.78;
const BENCHMARK_LINE = 33; // 33% average tier distribution

// ─── AI Insights per chart ────────────────────────────────────────────────────
const TIER_AI_INSIGHT =
  "Pro growth peaking; squeeze Starter upgrades to protect margins.";

const TIER_INSIGHTS = [TIER_AI_INSIGHT];

const REGION_AI_INSIGHTS: Record<
  string,
  { insight: string; sentiment: "positive" | "negative" | "neutral" }
> = {
  "North America": {
    insight:
      "Strong enterprise renewals in Q2. Correlates with continued SaaS budget growth.",
    sentiment: "positive",
  },
  Europe: {
    insight:
      "External market volatility may impact Enterprise renewals. Monitor compliance costs.",
    sentiment: "negative",
  },
  "Asia Pacific": {
    insight:
      "Showing 3x hardware growth. Potential expansion market for the Pro tier.",
    sentiment: "positive",
  },
  "Latin America": {
    insight:
      "Emerging market — Starter tier adoption growing. Currency volatility a risk factor.",
    sentiment: "neutral",
  },
};

// ─── AI Markers ───────────────────────────────────────────────────────────────
const AI_MARKERS: Record<string, { label: string; color: string }> = {
  Mar: {
    label:
      "Tech sector growth detected — revenue spike correlates with broader market gains",
    color: "var(--success)",
  },
  May: {
    label:
      "Enterprise churn risk: rising interest rates affecting B2B SaaS budgets",
    color: "var(--danger)",
  },
  Q2: {
    label: "Strong Q2 enterprise renewals — churn down 0.3% vs prior quarter",
    color: "var(--success)",
  },
};

// ─── Default SaaS tier data (fallback) ───────────────────────────────────────
const DEFAULT_TIER_DATA = [
  { name: "Starter", value: 420 },
  { name: "Pro", value: 310 },
  { name: "Enterprise", value: 180 },
];

// ─── Dynamic X-axis data generator ───────────────────────────────────────────
const generateChartData = (
  range: string,
  baseData: any[],
  tierMultiplier: number,
) => {
  const now = new Date();

  if (range === "daily") {
    return Array.from({ length: 12 }, (_, i) => {
      const h = new Date(now);
      h.setHours(now.getHours() - 11 + i, 0, 0, 0);
      const label = h.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const base = 3000 + Math.random() * 2000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: label,
        revenue,
        profit: Math.round(
          revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1),
        ),
        tooltip: `${h.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${label}`,
      };
    });
  }

  if (range === "weekly") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - 6 + i);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const base = 8000 + Math.random() * 4000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: label,
        revenue,
        profit: Math.round(
          revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1),
        ),
        tooltip: d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      };
    });
  }

  if (range === "monthly") {
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth(), i * 7 + 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        Math.min((i + 1) * 7, 28),
      );
      const base = baseData[i]?.revenue ?? 35000 + Math.random() * 10000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: `Week ${i + 1}`,
        revenue,
        profit: Math.round(
          revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1),
        ),
        tooltip: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      };
    });
  }

  if (range === "quarterly") {
    const quarters = [
      { name: "Q1", months: "Jan, Feb, Mar" },
      { name: "Q2", months: "Apr, May, Jun" },
      { name: "Q3", months: "Jul, Aug, Sep" },
      { name: "Q4", months: "Oct, Nov, Dec" },
    ];
    return quarters.map((q) => {
      const base = 120000 + Math.random() * 40000;
      const revenue = Math.round(base * tierMultiplier);
      return {
        name: q.name,
        revenue,
        profit: Math.round(
          revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1),
        ),
        tooltip: `${q.name}: ${q.months} ${now.getFullYear()}`,
      };
    });
  }

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months.map((m, i) => {
    const base = baseData[i]?.revenue ?? 35000 + Math.random() * 15000;
    const revenue = Math.round(base * tierMultiplier);
    return {
      name: m,
      revenue,
      profit: Math.round(revenue * GROSS_MARGIN * (0.95 + Math.random() * 0.1)),
      tooltip: `${m} ${now.getFullYear()}`,
    };
  });
};

// ─── Tooltips ─────────────────────────────────────────────────────────────────
const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.name === "MRR")?.value ?? 0;
  const profit =
    payload.find((p: any) => p.name === "Gross Profit")?.value ?? 0;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";
  const dataPoint = payload[0]?.payload;
  const marker = AI_MARKERS[label];

  return (
    <div
      className="px-4 py-3 rounded-xl shadow-md min-w-[200px]"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-[12px] font-medium mb-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {dataPoint?.tooltip || label}
      </p>
      <div
        className="border-b mb-2 pb-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        {payload.map((item: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-6 mb-1 last:mb-0"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="text-[12px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.name}
              </span>
            </div>
            <span
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              ${item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[12px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Gross Margin
        </span>
        <span
          className="text-[12px] font-semibold"
          style={{ color: "var(--success)" }}
        >
          {margin}%
        </span>
      </div>
      {marker && (
        <div
          className="mt-2 pt-2 border-t flex items-start gap-1.5"
          style={{ borderColor: "var(--border)" }}
        >
          <Zap
            size={10}
            className="flex-shrink-0 mt-0.5"
            style={{ color: marker.color }}
          />
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {marker.label}
          </p>
        </div>
      )}
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl shadow-md"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-[12px] font-medium mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: payload[0].color }}
        />
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {payload[0].value.toLocaleString()} subscribers
        </span>
      </div>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  const color = data.payload.fill || "var(--accent)";
  return (
    <div
      className="px-3 py-2.5 rounded-xl shadow-md"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-[12px] font-medium mb-1" style={{ color }}>
        {data.name}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {data.value}% share
        </span>
      </div>
    </div>
  );
};

// ─── Chart Card ───────────────────────────────────────────────────────────────
const ChartCard = ({
  title,
  icon: Icon,
  children,
  className = "",
  delay = 0,
  badge,
  id,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  accentColor?: string;
  badge?: React.ReactNode;
  id?: string;
}) => (
  <motion.div
    id={id}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
    className={`relative rounded-xl p-5 overflow-hidden ${className}`}
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
    }}
  >
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2">
        <div
          className="p-1.5 rounded-xl"
          style={{ background: "var(--accent-subtle)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        </div>
        <h3
          className="font-semibold text-[13px]"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
      </div>
      {badge}
    </div>
    <div>{children}</div>
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
  revenueData,
  categoryData,
  regionData,
  category: categoryProp = "",
  range: rangeProp = "monthly",
}) => {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || rangeProp || "monthly";
  const category = searchParams.get("category") || categoryProp || "";

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);

  const tierMultiplier =
    category === "starter"
      ? 0.3
      : category === "pro"
        ? 0.6
        : category === "enterprise"
          ? 1.4
          : 1;

  const regenerate = useCallback(() => {
    setChartData(generateChartData(range, revenueData, tierMultiplier));
  }, [range, revenueData, tierMultiplier]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  useEffect(() => {
    if (range !== "daily") return;
    const t = setInterval(() => regenerate(), 60000);
    return () => clearInterval(t);
  }, [range, regenerate]);

  useEffect(() => {
    const channel = supabase
      .channel("charts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload: any) => {
          setIsLive(true);
          const amt = payload.new?.amount ?? 0;
          setLiveEvents((prev) =>
            [
              `+$${Number(amt).toLocaleString()} new transaction`,
              ...prev,
            ].slice(0, 3),
          );

          if (range === "daily") {
            setChartData((prev) => {
              const updated = [...prev];
              const last = { ...updated[updated.length - 1] };
              last.revenue = (last.revenue || 0) + amt;
              last.profit = Math.round(last.revenue * GROSS_MARGIN);
              updated[updated.length - 1] = last;
              return updated;
            });
          }
          setTimeout(() => setIsLive(false), 3000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [range]);

  const [tierData, setTierData] = useState(DEFAULT_TIER_DATA);

  useEffect(() => {
    const fetchTierData = async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("category");
        if (error || !data?.length) return;

        const counts: Record<string, number> = {
          Starter: 0,
          Pro: 0,
          Enterprise: 0,
        };
        data.forEach((row: any) => {
          const cat = row.category as string;
          if (["SaaS", "Analytics", "Fintech"].includes(cat))
            counts["Starter"]++;
          else if (["Cloud", "Infrastructure"].includes(cat)) counts["Pro"]++;
          else if (["Research", "Consulting", "Hardware"].includes(cat))
            counts["Enterprise"]++;
        });

        setTierData([
          {
            name: "Starter",
            value: counts["Starter"] || DEFAULT_TIER_DATA[0].value,
          },
          { name: "Pro", value: counts["Pro"] || DEFAULT_TIER_DATA[1].value },
          {
            name: "Enterprise",
            value: counts["Enterprise"] || DEFAULT_TIER_DATA[2].value,
          },
        ]);
      } catch {
        /* use defaults */
      }
    };
    fetchTierData();
  }, []);

  const saasCategories = tierData.map((d) => ({
    ...d,
    value: Math.round(d.value * tierMultiplier),
  }));

  const regionSentiment: Record<string, "positive" | "negative" | "neutral"> = {
    "North America": "positive",
    Europe: "negative",
    "Asia Pacific": "positive",
    "Latin America": "neutral",
  };

  const regionWithColors = regionData.map((item, i) => ({
    ...item,
    fill: COLORS[i % COLORS.length],
    sentiment: regionSentiment[item.name] ?? "neutral",
    aiInsight: REGION_AI_INSIGHTS[item.name] ?? {
      insight: "No data available.",
      sentiment: "neutral",
    },
  }));

  const rangeLabel: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annually: "Annual",
  };

  const calculateProfitStats = () => {
    const totalRevenue = chartData.reduce(
      (acc, curr) => acc + (curr.revenue || 0),
      0,
    );
    const userCount = saasCategories.reduce((acc, curr) => acc + curr.value, 0);
    const apiTokenCost = userCount * 0.08;
    const hostingCost = 40;
    const netProfit = totalRevenue - (apiTokenCost + hostingCost);
    const efficiency = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { netProfit, efficiency };
  };
  const { netProfit, efficiency } = calculateProfitStats();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {/* ── MRR Growth Analysis ── */}
      <ChartCard
        title="MRR Growth Analysis"
        icon={TrendingUp}
        delay={0}
        className="col-span-1 lg:col-span-2"
        badge={
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="hidden md:flex items-center gap-4 pr-4 border-r"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Net Efficiency
                </p>
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--success)" }}
                >
                  {efficiency.toFixed(1)}%
                </p>
              </div>
              <div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Net Profit
                </p>
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  ${(netProfit / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
            <AnimatePresence>
              {isLive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{
                    background: "var(--success-bg)",
                    color: "var(--success)",
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--success)" }}
                  />{" "}
                  Live
                </motion.span>
              )}
            </AnimatePresence>
            <span
              className="px-2 py-0.5 rounded-md text-[11px] font-medium"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
              }}
            >
              {rangeLabel[range] || "Monthly"}
            </span>
            {category && (
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{
                  background: "var(--bg-primary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {category} tier
              </span>
            )}
            <div className="flex gap-3">
              {[
                { label: "MRR", color: COLORS[0] },
                { label: "Gross Profit", color: "var(--success)" },
              ].map((l) => (
                <div
                  key={l.label}
                  className="flex items-center gap-1.5 text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        }
      >
        <AnimatePresence>
          {liveEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-[12px] font-medium"
              style={{
                background: "var(--success-bg)",
                color: "var(--success)",
              }}
            >
              <AlertCircle size={12} /> {liveEvents[0]}
            </motion.div>
          )}
        </AnimatePresence>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.15} />
                <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0} />
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
              tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
              dy={12}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={<CustomAreaTooltip />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              name="MRR"
              dataKey="revenue"
              stroke={COLORS[0]}
              strokeWidth={2}
              fill="url(#gradRev)"
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: 4,
                fill: COLORS[0],
                strokeWidth: 2,
                stroke: "#fff",
              }}
              animationDuration={900}
            />
            <Area
              type="monotone"
              name="Gross Profit"
              dataKey="profit"
              stroke="#059669"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              fill="url(#gradProfit)"
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: 4,
                fill: "#059669",
                strokeWidth: 2,
                stroke: "#fff",
              }}
              animationDuration={1100}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Subscription Tier Distribution ── */}
      <ChartCard
        title="Subscription Tier Distribution"
        icon={BarChart2}
        delay={0.1}
        id="tier-chart"
        badge={
          <div className="group relative">
            {/* The Trigger Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium cursor-help transition-opacity group-hover:opacity-0"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
              }}
            >
              <Zap size={11} /> AI Insight
            </div>

            {/* The Overlay Box: covers the badge exactly on hover */}
            <div className="absolute inset-0 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
              <div
                className="absolute right-0 top-0 w-64 p-3 rounded-xl shadow-md flex flex-col gap-1.5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap size={11} style={{ color: "var(--accent)" }} />
                  <p
                    className="text-[11px] font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    AI Insight
                  </p>
                </div>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {TIER_AI_INSIGHT}
                </p>
              </div>
            </div>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={saasCategories}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
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
              tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-primary)" }}
              content={<CustomBarTooltip />}
            />
            <ReferenceLine
              y={BENCHMARK_LINE}
              stroke="#D97706"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "33% Benchmark",
                position: "insideTopRight",
                fill: "#D97706",
                fontSize: 10,
                fontWeight: 500,
              }}
            />
            <Bar
              dataKey="value"
              fill={COLORS[0]}
              radius={[6, 6, 0, 0]}
              barSize={48}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Regional Markets ── */}
      <ChartCard
        title="Regional Markets"
        icon={Globe}
        delay={0.2}
        id="region-chart"
        badge={
          <div className="group relative">
            {/* The Risk Badge Trigger */}
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl text-[11px] font-medium cursor-help transition-colors"
              style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
            >
              <AlertTriangle size={11} /> Europe Risk
            </div>

            {/* The Risk Reasoning Tooltip - matches AI Insight look */}
            <div
              className="absolute right-0 top-full mt-2 w-64 p-3 rounded-xl shadow-md z-50 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-auto"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle size={11} style={{ color: "var(--danger)" }} />
                <p
                  className="text-[11px] font-medium"
                  style={{ color: "var(--danger)" }}
                >
                  Risk Analysis
                </p>
              </div>

              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                External volatility and rising compliance costs are affecting
                Enterprise renewals in the EU region.
              </p>
            </div>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={regionWithColors}
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cx="38%"
              cy="50%"
              animationDuration={900}
              onMouseEnter={(_, i) => setActivePieIndex(i)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              {regionWithColors.map((entry, index) => {
                const isActive = activePieIndex === index;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isActive ? entry.fill : `${entry.fill}B0`}
                    style={
                      {
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        outline: "none",
                      } as React.CSSProperties
                    }
                    stroke={isActive ? entry.fill : "none"}
                    strokeWidth={isActive ? 1.5 : 0}
                  />
                );
              })}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const data = payload[0];
                const color = data.payload.fill || COLORS[0];
                const ai = data.payload.aiInsight;
                const isNeg = data.payload.sentiment === "negative";
                return (
                  <div
                    className="px-4 py-3 rounded-xl shadow-md max-w-[220px]"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: isNeg ? "var(--danger)" : color,
                        }}
                      />
                      <p
                        className="text-[12px] font-medium"
                        style={{ color: isNeg ? "var(--danger)" : color }}
                      >
                        {data.name}
                      </p>
                      {isNeg && (
                        <AlertTriangle
                          size={11}
                          style={{ color: "var(--danger)" }}
                        />
                      )}
                    </div>
                    <p
                      className="text-[13px] font-semibold mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {data.value}% share
                    </p>
                    <div
                      className="border-t pt-2"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <p
                        className="text-[11px] font-medium mb-1 flex items-center gap-1"
                        style={{ color: "var(--accent)" }}
                      >
                        <Zap size={10} /> AI Insight
                      </p>
                      <p
                        className="text-[12px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {ai?.insight}
                      </p>
                      <button
                        onClick={() =>
                          alert(`Opening ${data.name} strategy view...`)
                        }
                        className="w-full mt-3 py-1.5 rounded-xl text-[11px] font-medium text-white transition-colors"
                        style={{
                          background: isNeg ? "var(--danger)" : "var(--accent)",
                        }}
                      >
                        {isNeg
                          ? `View ${data.name} retention plan`
                          : `View ${data.name} growth plan`}
                      </button>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              content={({ payload }) => (
                <ul className="flex flex-col gap-3 pl-4">
                  {payload?.map((entry: any, index: number) => {
                    const isActive = activePieIndex === index;
                    const region = regionWithColors[index];
                    const isNeg = region?.sentiment === "negative";
                    return (
                      <li
                        key={index}
                        className="flex items-center gap-2 cursor-pointer transition-colors"
                        onMouseEnter={() => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 transition-transform"
                          style={{
                            backgroundColor: entry.color,
                            transform: isActive ? "scale(1.3)" : "scale(1)",
                          }}
                        />
                        <span
                          className="text-[12px] font-medium transition-colors flex items-center gap-1"
                          style={{
                            color: isActive
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                          }}
                        >
                          {entry.value}
                          {isNeg && (
                            <AlertTriangle
                              size={10}
                              style={{ color: "var(--danger)" }}
                            />
                          )}
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
