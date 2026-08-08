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
  Legend,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BarChart2,
  Activity,
  Zap,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import {
  getBucketedRevenue,
  getCategoryData,
  getStatusBreakdown,
} from "@/lib/data";

const COLORS = ["#003366", "#4C7A9E", "#94A3B8", "#C9A66B"];

// ─── Tooltips ─────────────────────────────────────────────────────────────
const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p: any) => p.name === "Revenue")?.value ?? 0;
  const profit =
    payload.find((p: any) => p.name === "Profit (Est.)")?.value ?? 0;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";

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
        {label}
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
      <div className="flex items-center justify-between">
        <span
          className="text-[12px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Est. Margin
        </span>
        <span
          className="text-[12px] font-semibold"
          style={{ color: "var(--success)" }}
        >
          {margin}%
        </span>
      </div>
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
          ${payload[0].value.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

// ─── Chart Card wrapper ─────────────────────────────────────────────────────
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

// ─── Main Component ─────────────────────────────────────────────────────────
interface ChartsSectionProps {
  revenueData: any[]; // initial server-fetched monthly data (first paint)
  categoryData: any[]; // initial server-fetched category data
  range?: string;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  revenueData: initialRevenueData,
  categoryData: initialCategoryData,
  range: rangeProp = "monthly",
}) => {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || rangeProp || "monthly";
  const categoryFilter = searchParams.get("category") || "";

  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [revenueChartData, setRevenueChartData] = useState<any[]>(
    initialRevenueData || [],
  );
  const [categoryChartData, setCategoryChartData] = useState<any[]>(
    initialCategoryData || [],
  );
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [categoryInsight, setCategoryInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Real, granularity-aware fetch whenever range changes
  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, cat, status] = await Promise.all([
        getBucketedRevenue(range),
        getCategoryData(range),
        getStatusBreakdown(range),
      ]);
      setRevenueChartData(rev);
      setCategoryChartData(cat);
      setStatusChartData(status);

      // Real AI insight — Groq call on the top real category, not hardcoded text
      if (cat.length > 0) {
        const top = [...cat].sort((a: any, b: any) => b.value - a.value)[0];
        try {
          const res = await fetch("/api/briefing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              range,
              category: top.name,
              efficiency: 0,
              newsHeadline: `${top.name} leads category revenue this period`,
            }),
          });
          const json = await res.json();
          setCategoryInsight(json.briefing || "");
        } catch {
          setCategoryInsight("");
        }
      } else {
        setCategoryInsight("");
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Real-time: new transaction inserted → refetch real data (no fake in-place math)
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
          refetch();
          setTimeout(() => setIsLive(false), 3000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const rangeLabel: Record<string, string> = {
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
    quarterly: "This Quarter",
    annually: "This Year",
  };

  // Revenue is real. Profit is still a flat 0.4 margin multiplier — no real
  // cost tracking exists yet (logged debt). Labeled "Estimated" in the UI,
  // not presented as a precise figure.
  const totalRevenue = revenueChartData.reduce(
    (acc: number, d: any) => acc + (d.revenue || 0),
    0,
  );
  const totalProfit = revenueChartData.reduce(
    (acc: number, d: any) => acc + (d.profit || 0),
    0,
  );
  const efficiency = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Real filter — matches an actual category name, no fake tiers
  const filteredCategoryData = categoryFilter
    ? categoryChartData.filter(
        (d: any) => d.name.toLowerCase() === categoryFilter.toLowerCase(),
      )
    : categoryChartData;

  // Real average — replaces old hardcoded "33% Benchmark"
  const categoryAverage =
    categoryChartData.length > 0
      ? categoryChartData.reduce((acc: number, d: any) => acc + d.value, 0) /
        categoryChartData.length
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {/* ── Revenue Trend ── */}
      <ChartCard
        title="Revenue Trend"
        icon={TrendingUp}
        delay={0}
        className="col-span-1 lg:col-span-2"
        badge={
          <div className="flex flex-wrap items-center gap-4">
            {revenueChartData.length > 0 && (
              <div
                className="hidden md:flex items-center gap-4 pr-4 border-r"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Est. Efficiency
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
                    Est. Profit
                  </p>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${(totalProfit / 1000).toFixed(1)}k
                  </p>
                </div>
              </div>
            )}
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
              {rangeLabel[range] || "This Month"}
            </span>
            <div className="flex gap-3">
              {[
                { label: "Revenue", color: COLORS[0] },
                { label: "Profit (Est.)", color: "var(--success)" },
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

        {revenueChartData.length === 0 && !loading ? (
          <div
            className="flex items-center justify-center h-[280px] text-[13px]"
            style={{ color: "var(--text-muted)" }}
          >
            No transaction data yet for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={revenueChartData}
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
                name="Revenue"
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
                name="Profit (Est.)"
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
        )}
      </ChartCard>

      {/* ── Revenue by Category ── */}
      <ChartCard
        title="Revenue by Category"
        icon={BarChart2}
        delay={0.1}
        id="category-chart"
        badge={
          categoryInsight ? (
            <div className="group relative">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium cursor-help transition-opacity group-hover:opacity-0"
                style={{
                  background: "var(--accent-subtle)",
                  color: "var(--accent)",
                }}
              >
                <Zap size={11} /> AI Insight
              </div>
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
                    {categoryInsight}
                  </p>
                </div>
              </div>
            </div>
          ) : null
        }
      >
        {filteredCategoryData.length === 0 && !loading ? (
          <div
            className="flex items-center justify-center h-[240px] text-[13px]"
            style={{ color: "var(--text-muted)" }}
          >
            No category data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={filteredCategoryData}
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
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--bg-primary)" }}
                content={<CustomBarTooltip />}
              />
              {categoryAverage > 0 && (
                <ReferenceLine
                  y={categoryAverage}
                  stroke="#D97706"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Avg",
                    position: "insideTopRight",
                    fill: "#D97706",
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                />
              )}
              <Bar
                dataKey="value"
                fill={COLORS[0]}
                radius={[6, 6, 0, 0]}
                barSize={48}
                animationDuration={900}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Transaction Status Breakdown — real data, replaces old fake region pie ── */}
      <ChartCard
        title="Transaction Status Breakdown"
        icon={Activity}
        delay={0.2}
        id="status-chart"
      >
        {statusChartData.length === 0 && !loading ? (
          <div
            className="flex items-center justify-center h-[240px] text-[13px]"
            style={{ color: "var(--text-muted)" }}
          >
            No transaction data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusChartData}
                innerRadius={58}
                outerRadius={82}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                cx="38%"
                cy="50%"
                animationDuration={900}
              >
                {statusChartData.map((_: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
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
                        {d.name}
                      </p>
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {d.value}% of transactions
                      </span>
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
                    {payload?.map((entry: any, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {entry.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
};
