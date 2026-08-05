"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  DollarSign,
  Zap,
  BarChart2,
  Crosshair,
  ShieldCheck,
  X,
  Maximize2,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricData {
  current: number;
  previous: number;
  trendPercent: number;
  sparkline: number[];
  alert: {
    triggered: boolean;
    message: string;
    severity: "low" | "medium" | "high";
  } | null;
  aiInsight: string;
  lastUpdated: string;
  source: "live" | "cache" | "mock";
  alphaBadge?: string;
  transactions?: { label: string; value: string; type: "plus" | "minus" }[];
}

interface RealTimeData {
  revenue: MetricData;
  operationalEfficiency: MetricData;
  marketTrends: MetricData & { symbol: string; newsHeadline: string };
  timestamp: string;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

const MetricCard = ({
  title,
  icon: Icon,
  data,
  prefix = "",
  suffix = "",
  accentColor,
  delay = 0,
}: {
  title: string;
  icon: React.ElementType;
  data: MetricData;
  prefix?: string;
  suffix?: string;
  accentColor: string;
  delay?: number;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isUp = data.trendPercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-xl p-5 overflow-hidden group transition-all duration-300"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${data.alert?.severity === "high" ? "var(--danger)" : "var(--border)"}`,
      }}
    >
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 p-6 flex flex-col justify-center"
            style={{ background: "var(--bg-surface)" }}
          >
            <button
              onClick={() => setIsFocused(false)}
              className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <X size={14} />
            </button>
            <div
              className="flex items-center gap-2 mb-4 pb-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Crosshair size={12} style={{ color: "var(--accent)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-primary)" }}
              >
                Detail Breakdown
              </span>
            </div>
            <div className="space-y-2">
              {data.transactions?.map((t, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="text-[12px] font-semibold"
                    style={{
                      color:
                        t.type === "plus" ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl"
            style={{ background: "var(--accent-subtle)" }}
          >
            <Icon size={14} style={{ color: accentColor }} />
          </div>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {title}
            </p>
            {data.alphaBadge && (
              <span
                className="text-[11px] font-medium block mt-0.5"
                style={{ color: "var(--accent)" }}
              >
                {data.alphaBadge}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFocused(true)}
            className="p-1 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <Maximize2 size={10} />
          </button>
          <div
            className="px-2 py-0.5 rounded-xl text-[11px] font-medium"
            style={{
              background: isUp ? "var(--success-bg)" : "var(--danger-bg)",
              color: isUp ? "var(--success)" : "var(--danger)",
            }}
          >
            {isUp ? "+" : ""}
            {data.trendPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="mb-5 relative z-10">
        <h3
          className="text-2xl font-semibold tracking-tight tabular-nums mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          {prefix}
          {typeof data.current === "number" && data.current > 1000
            ? `${(data.current / 1000).toFixed(1)}k`
            : data.current.toLocaleString()}
          {suffix}
        </h3>
        <p
          className="text-[11px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          vs {prefix}
          {data.previous.toLocaleString()} last period
        </p>
      </div>

      {/* AI Insight */}
      <div
        className="p-4 rounded-xl relative z-10"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap size={12} style={{ color: "var(--accent)" }} />
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            AI Insight
          </span>
        </div>
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {data.aiInsight}
        </p>
      </div>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RealTimeDashboard() {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [volatility, setVolatility] = useState(0);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(52);

  // ── THE FIX: volatility in a ref so fetchData deps stay stable ──
  const volRef = useRef(volatility);
  useEffect(() => {
    volRef.current = volatility;
  }, [volatility]);

  // Empty dep array — fetchData identity never changes → no re-render loop
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime-data");
      const json = await res.json();
      const vol = volRef.current;
      const marketTrend = json.marketTrends.trendPercent + vol;
      const alpha = (
        json.revenue.trendPercent / Math.abs(marketTrend || 1)
      ).toFixed(1);

      setData({
        ...json,
        revenue: {
          ...json.revenue,
          alphaBadge: `${alpha}x sector outperformance`,
          aiInsight: `Revenue is outpacing the market by ${alpha}x this period.`,
          transactions: [
            {
              label: "Enterprise Subscription",
              value: "+$2,450",
              type: "plus",
            },
            { label: "Pro Tier Upgrade", value: "+$890", type: "plus" },
          ],
        },
        operationalEfficiency: {
          ...json.operationalEfficiency,
          aiInsight: `Operational efficiency holding at ${json.operationalEfficiency.current}%.`,
          transactions: [
            { label: "Automation Savings", value: "+$1,200", type: "plus" },
            { label: "AI Token Cost", value: "-$244", type: "minus" },
          ],
        },
        marketTrends: {
          ...json.marketTrends,
          trendPercent: marketTrend,
          aiInsight:
            "Tech sector showing resilience relative to the broader index.",
          transactions: [
            {
              label: "Market Index",
              value: `$${(184.99 + vol).toFixed(2)}`,
              type: "plus",
            },
          ],
        },
      });
      setLoading(false);
      setCountdown(60);
    } catch (err) {
      console.error(err);
    }
  }, []); // ← stable: no deps

  // Mount: initial fetch + 60s auto-refresh + 1s countdown tick
  useEffect(() => {
    fetchData();
    const refresh = setInterval(fetchData, 60_000);
    const tick = setInterval(
      () => setCountdown((c) => (c > 0 ? c - 1 : 60)),
      1000,
    );
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div
        className="h-64 animate-pulse rounded-xl mt-8"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: "var(--accent-subtle)" }}
          >
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2
              className="text-[15px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Live Metrics
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--success)" }}
              />
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Updating automatically
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-6 p-3 rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="hidden lg:block min-w-[140px]">
            <p
              className="text-[11px] font-medium mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Market Volatility Simulator
            </p>
            <p
              className="text-[12px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {volatility}%
            </p>
          </div>
          <input
            type="range"
            min="-20"
            max="15"
            value={volatility}
            onChange={(e) => setVolatility(parseInt(e.target.value))}
            className="w-32 lg:w-48 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: "var(--border)",
              accentColor: "var(--accent)",
            }}
          />
          <div className="h-8 w-px" style={{ background: "var(--border)" }} />
          <div className="flex items-center gap-4 px-2">
            <div className="text-right">
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Next refresh
              </p>
              <p
                className="text-[12px] font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {countdown}s
              </p>
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-xl transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard
          title="Revenue"
          icon={DollarSign}
          data={data.revenue}
          prefix="$"
          accentColor="#003366"
          delay={0}
        />
        <MetricCard
          title="Operational Efficiency"
          icon={ShieldCheck}
          data={data.operationalEfficiency}
          suffix="%"
          accentColor="#4C7A9E"
          delay={0.1}
        />
        <MetricCard
          title="Market Trends"
          icon={BarChart2}
          data={data.marketTrends}
          prefix="$"
          accentColor="#C9A66B"
          delay={0.2}
        />
      </div>
    </div>
  );
}
