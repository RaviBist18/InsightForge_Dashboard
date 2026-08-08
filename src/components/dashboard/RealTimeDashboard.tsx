"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, DollarSign, ShieldCheck, BarChart2, RefreshCw } from "lucide-react";

interface MetricData {
  current: number;
  previous: number;
  trendPercent: number;
  alert: { triggered: boolean; message: string; severity: "low" | "medium" | "high" } | null;
  aiInsight: string;
  lastUpdated: string;
  source: "live" | "unavailable";
}

interface RealTimeData {
  revenue: MetricData;
  operationalEfficiency: MetricData;
  marketTrends: MetricData & { symbol: string; newsHeadline: string };
  timestamp: string;
}

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
  const isUp = data.trendPercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-xl p-5 overflow-hidden transition-all duration-300"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${data.alert?.severity === "high" ? "var(--danger)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl" style={{ background: "var(--accent-subtle)" }}>
            <Icon size={14} style={{ color: accentColor }} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            {title}
          </p>
        </div>
        {data.source === "live" ? (
          <div
            className="px-2 py-0.5 rounded-xl text-[11px] font-medium"
            style={{ background: isUp ? "var(--success-bg)" : "var(--danger-bg)", color: isUp ? "var(--success)" : "var(--danger)" }}
          >
            {isUp ? "+" : ""}
            {data.trendPercent.toFixed(1)}%
          </div>
        ) : (
          <div className="px-2 py-0.5 rounded-xl text-[11px] font-medium" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            Unavailable
          </div>
        )}
      </div>

      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight tabular-nums mb-1.5" style={{ color: "var(--text-primary)" }}>
          {prefix}
          {data.current > 1000 ? `${(data.current / 1000).toFixed(1)}k` : data.current.toLocaleString()}
          {suffix}
        </h3>
        <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
          vs {prefix}
          {data.previous.toLocaleString()} last period
        </p>
      </div>

      <div className="p-4 rounded-xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={12} style={{ color: "var(--accent)" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            AI Insight
          </span>
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {data.aiInsight}
        </p>
      </div>
    </motion.div>
  );
};

export function RealTimeDashboard() {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime-data");
      const json = await res.json();
      setData(json);
      setLoading(false);
      setCountdown(60);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const refresh = setInterval(fetchData, 60_000);
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 60)), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [fetchData]);

  if (loading || !data) {
    return <div className="h-64 animate-pulse rounded-xl mt-8" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />;
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl" style={{ background: "var(--accent-subtle)" }}>
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Live Metrics
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Updating automatically
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-right">
            <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
              Next refresh
            </p>
            <p className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {countdown}s
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard title="Revenue" icon={DollarSign} data={data.revenue} prefix="$" accentColor="#003366" delay={0} />
        <MetricCard title="Operational Efficiency (Est.)" icon={ShieldCheck} data={data.operationalEfficiency} suffix="%" accentColor="#4C7A9E" delay={0.1} />
        <MetricCard title="Market Trends" icon={BarChart2} data={data.marketTrends} prefix="$" accentColor="#C9A66B" delay={0.2} />
      </div>
    </div>
  );
}
