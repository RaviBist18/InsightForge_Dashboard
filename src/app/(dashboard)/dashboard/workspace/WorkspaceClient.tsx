"use client";
// src/app/(dashboard)/dashboard/workspace/WorkspaceClient.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  DashboardStats,
  getAggregateDashboardStats,
  getDatasetMovers,
} from "@/lib/data";
import {
  Building2,
  Target,
  Shield,
  Scale,
  Rocket,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Activity,
  Archive,
  Flame,
} from "lucide-react";
import { CEOBriefing } from "@/components/CEOBriefing";

// ── IMPORT FORENSIC COMPONENTS ──────────────────────────────────────────────
import { KPIDetailClient } from "@/components/dashboard/KPIDetailClient";
import { KPISection } from "@/components/dashboard/KPISection";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Profile {
  full_name: string | null;
  role: string | null;
}
interface BriefingSettings {
  persona: string;
  frequency: string;
}
interface DecisionSnapshot {
  id: string;
  created_at: string;
  label: string;
  hash: string;
  mrr: number;
  churn: number;
  signups: number;
  market_conditions: Record<string, unknown>;
  ai_advice: string;
  persona: string;
}

interface WhyFeedItem {
  headline: string;
  snippet: string;
  impact_type: "churn" | "revenue" | "opportunity" | "risk";
  impact_delta: number;
  source: string;
}

interface Ticker {
  symbol: string;
  price: number | null;
  change: number | null;
}

interface Props {
  userId: string;
  userEmail: string;
  companyId: string | null;
  companyName: string | null;
  profile: Profile | null;
  briefingSettings: BriefingSettings | null;
  initialSnapshots: DecisionSnapshot[];
  mrr: number;
  churn: number;
  signups: number;
  isReadOnly: boolean;
  role?: "admin" | "user";
}

// ── KPI slug sets ─────────────────────────────────────────────────────────────
const KPI_SLUGS = new Set([
  "total-revenue",
  "total-profit",
  "profit-margin",
  "total-orders",
  "active-users",
  "churn-rate",
]);

// Slugs restricted to admin only
const ADMIN_ONLY_SLUGS = new Set([
  "total-orders",
  "active-users",
  "churn-rate",
]);

// Slugs available to users
const USER_KPI_SLUGS = ["total-revenue", "total-profit", "profit-margin"];

// All KPI slugs as array for admin tab rendering
const ALL_KPI_SLUGS = [
  "total-revenue",
  "total-profit",
  "profit-margin",
  "total-orders",
  "active-users",
  "churn-rate",
];

// KPI display labels
const KPI_LABELS: Record<string, string> = {
  "total-revenue": "Revenue",
  "total-profit": "Profit",
  "profit-margin": "Margin",
  "total-orders": "Orders",
  "active-users": "Users",
  "churn-rate": "Churn",
};

const MOCK_HEADLINES = [
  "Federal Reserve signals further rate hikes amid persistent inflation",
  "NASDAQ drops 3.2% as tech earnings disappoint analysts",
  "EU announces sweeping AI regulation framework for enterprise software",
  "Venture capital funding for SaaS drops 40% YoY in Q3",
  "Enterprise software spending rebounds as cloud adoption accelerates",
  "New data privacy laws in California impact third-party integrations",
  "SMB sector facing credit tightening as banks raise lending standards",
  "Global economic slowdown fears mount; IMF revises growth forecasts down",
];

// ── SKELETON LOADER ───────────────────────────────────────────────────────────
function FeedSkeleton({ accent }: { accent: string }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          className="p-3 rounded-lg"
          style={{
            background: "rgba(0,0,0,0.025)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              className="h-2 rounded flex-1"
              style={{ background: "rgba(0,0,0,0.06)" }}
            />
            <div
              className="h-4 w-12 rounded"
              style={{ background: `${accent}20` }}
            />
          </div>
          <div
            className="h-2 rounded w-full mb-1.5"
            style={{ background: "rgba(0,0,0,0.04)" }}
          />
          <div
            className="h-2 rounded w-3/4"
            style={{ background: "rgba(0,0,0,0.04)" }}
          />
          <motion.div
            className="h-px w-full mt-2 rounded"
            animate={{ scaleX: [0, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            style={{
              background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
              transformOrigin: "left",
            }}
          />
        </motion.div>
      ))}
      <div className="flex items-center justify-center gap-2 py-3">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity, delay }}
            style={{ background: accent }}
          />
        ))}
        <span className="text-xs ml-1" style={{ color: accent }}>
          Analyzing...
        </span>
      </div>
    </div>
  );
}

function generateMockSparkline(baseMrr: number) {
  return Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    mrr: Math.round(
      baseMrr * (0.7 + (i / 12) * 0.35) + (Math.random() - 0.5) * baseMrr * 0.1,
    ),
  }));
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function WorkspaceClient({
  userId,
  userEmail,
  companyId,
  companyName,
  profile,
  briefingSettings,
  initialSnapshots,
  mrr: initialMrr,
  churn: initialChurn,
  signups: initialSignups,
  isReadOnly,
  role = "admin",
}: Props) {
  const accent = "#003366";

  const {
    activeTab,
    setActiveTab,
    setMrr: setCtxMrr,
    setChurn: setCtxChurn,
    setSnapshotCount,
    mrrTrend,
    setMrrTrend,
    setIsWorkspacePage,
  } = useWorkspace();

  const isAdmin = role === "admin";

  // ── LIVE METRICS ──
  const [mrr, setMrr] = useState(initialMrr);
  const [churn, setChurn] = useState(initialChurn);
  const [efficiency, setEfficiency] = useState(0);
  const [latestNews, setLatestNews] = useState("Market stable");
  const [sectionALabel, setSectionALabel] = useState("Risks");
  const [sectionAItems, setSectionAItems] = useState<string[]>([]);
  const [sectionBLabel, setSectionBLabel] = useState("Opportunities");
  const [sectionBItems, setSectionBItems] = useState<string[]>([]);
  const [signups] = useState(initialSignups);
  const [mrrSparkline, setMrrSparkline] = useState<
    { month: string; mrr: number }[]
  >([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [currentMonthOrders, setCurrentMonthOrders] = useState(0);
  const [currentMonthUsers, setCurrentMonthUsers] = useState(0);

  // ── WHY FEED ──
  const [whyFeed, setWhyFeed] = useState<WhyFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(false);

  // ── TICKERS ──
  const [tickers, setTickers] = useState<Ticker[]>([
    { symbol: "SPY", price: null, change: null },
    { symbol: "NVDA", price: null, change: null },
    { symbol: "BTC", price: null, change: null },
  ]);

  // ── ARCHIVES ──
  const [snapshots, setSnapshots] =
    useState<DecisionSnapshot[]>(initialSnapshots);
  const [sealLabel, setSealLabel] = useState("");
  const [sealing, setSealing] = useState(false);
  const [sealSuccess, setSealSuccess] = useState(false);

  const [simLoading, setSimLoading] = useState(false);

  // ── CUSTOMIZER ──
  const [persona, setPersona] = useState<string>(
    briefingSettings?.persona ?? "balanced",
  );
  const [frequency, setFrequency] = useState<string>(
    briefingSettings?.frequency ?? "daily",
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── STABLE REFS ──
  const tickersRef = useRef(tickers);
  const mrrRef = useRef(mrr);
  const churnRef = useRef(churn);
  const personaRef = useRef(persona);

  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickers]);
  useEffect(() => {
    mrrRef.current = mrr;
  }, [mrr]);
  useEffect(() => {
    churnRef.current = churn;
  }, [churn]);
  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  // ── FETCH REAL MRR — now dataset-aggregated, not transactions table ───────
  useEffect(() => {
    async function fetchMetrics() {
      setMetricsLoading(true);
      try {
        const stats = await getAggregateDashboardStats();

        if (stats.datasetCount === 0) {
          setMrrSparkline(generateMockSparkline(initialMrr));
          setMetricsLoading(false);
          return;
        }

        const sparkline = stats.mrrSparkline || [];
        setMrrSparkline(sparkline);
        setMrr(stats.totalRevenue);
        setCurrentMonthOrders(stats.totalOrders);
        setCurrentMonthUsers(stats.activeUsers);
        setChurn(stats.churnRate);
        setEfficiency(stats.efficiency);
        setLatestNews(stats.latestNews);

        if (sparkline.length >= 2) {
          const prev = sparkline[sparkline.length - 2].mrr;
          const curr = sparkline[sparkline.length - 1].mrr;
          const trend = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
          setMrrTrend(parseFloat(trend.toFixed(1)));
        }
      } catch {
        setMrrSparkline(generateMockSparkline(initialMrr));
      } finally {
        setMetricsLoading(false);
      }
    }
    fetchMetrics();
  }, [initialMrr, setMrrTrend]);

  // ── FETCH TICKERS ─────────────────────────────────────────────────────────
  const fetchTickers = useCallback(async () => {
    const AV_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
    const symbols = ["SPY", "NVDA", "BTC"];
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const endpoint =
          symbol === "BTC"
            ? `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${AV_KEY}`
            : `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        if (symbol === "BTC") {
          const rate = data["Realtime Currency Exchange Rate"];
          return {
            symbol,
            price: parseFloat(rate?.["5. Exchange Rate"] ?? "0"),
            change: 0,
          };
        } else {
          const quote = data["Global Quote"];
          return {
            symbol,
            price: parseFloat(quote?.["05. price"] ?? "0"),
            change: parseFloat(
              quote?.["10. change percent"]?.replace("%", "") ?? "0",
            ),
          };
        }
      }),
    );
    const updated = results.map((r, i) =>
      r.status === "fulfilled" && (r.value as { price: number }).price > 0
        ? r.value
        : tickersRef.current[i],
    );
    setTickers(updated as Ticker[]);
  }, []);

  // ── FETCH WHY FEED ────────────────────────────────────────────────────────
  const fetchWhyFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(false);
    try {
      const movers = await getDatasetMovers();
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "why-feed",
          movers,
          mrr: mrrRef.current,
          churn: churnRef.current,
          persona: personaRef.current,
        }),
      });
      const data = await res.json();
      if (data.feed?.length) {
        const hasError = data.feed.some((f: WhyFeedItem) =>
          f.snippet?.toLowerCase().includes("ai unavailable"),
        );
        if (hasError) {
          setFeedError(true);
          setWhyFeed([]);
        } else setWhyFeed(data.feed);
      } else {
        setFeedError(true);
      }
    } catch {
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    fetchWhyFeed();
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, [fetchTickers, fetchWhyFeed]);

  useEffect(() => {
    setIsWorkspacePage(true);
    return () => setIsWorkspacePage(false);
  }, [setIsWorkspacePage]);

  useEffect(() => {
    setCtxMrr(mrr);
  }, [mrr, setCtxMrr]);
  useEffect(() => {
    setCtxChurn(churn);
  }, [churn, setCtxChurn]);
  useEffect(() => {
    setSnapshotCount(snapshots.length);
  }, [snapshots.length, setSnapshotCount]);

  // ── SEAL SNAPSHOT ─────────────────────────────────────────────────────────
  const handleSeal = async () => {
    if (!sealLabel.trim() || isReadOnly) return;
    setSealing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSealing(false);
        return;
      }
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "seal-snapshot",
          label: sealLabel,
          mrr,
          churn,
          signups,
          marketConditions: {
            spy: tickers.find((t) => t.symbol === "SPY")?.price ?? 0,
            nvda: tickers.find((t) => t.symbol === "NVDA")?.price ?? 0,
            btc: tickers.find((t) => t.symbol === "BTC")?.price ?? 0,
          },
          persona,
        }),
      });
      const data = await res.json();
      if (data.snapshot) {
        setSnapshots((prev) => [data.snapshot, ...prev]);
        setSealLabel("");
        setSealSuccess(true);
        setTimeout(() => setSealSuccess(false), 3000);
      }
    } catch {
      /* silent */
    } finally {
      setSealing(false);
    }
  };

  // ── SAVE SETTINGS ─────────────────────────────────────────────────────────
  const saveSettings = async () => {
    if (isReadOnly) return;
    setSavingSettings(true);
    try {
      await supabase.from("briefing_settings").upsert({
        user_id: userId,
        persona,
        frequency: "daily",
        updated_at: new Date().toISOString(),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      /* silent */
    } finally {
      setSavingSettings(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const impactColor = (type: string, delta: number) => {
    if (type === "opportunity" || delta > 0) return "var(--success)";
    if (type === "risk" || type === "churn") return "var(--danger)";
    return "var(--warning)";
  };

  // ── TAB DEFINITIONS ───────────────────────────────────────────────────────
  const workspaceTabs = [
    { id: "pulse", label: "Live Metrics", icon: Activity },
    { id: "archives", label: "Snapshot Archive", icon: Archive },
    { id: "customizer", label: "CEO Briefing", icon: Target },
  ] as const;

  const liveStats: DashboardStats = {
    totalRevenue: mrr,
    totalProfit: Math.round(mrr * 0.4),
    profitMargin: 40,
    totalOrders: currentMonthOrders,
    activeUsers: currentMonthUsers,
    churnRate: churn,
    efficiency: 78.5,
    latestNews: "Telemetry integrated.",
    mrrSparkline: mrrSparkline,
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Read-Only Banner */}
      <AnimatePresence>
        {isReadOnly && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-2 px-4"
            style={{
              background: "var(--warning-bg)",
              borderBottom: "1px solid var(--warning)",
            }}
          >
            <span className="text-[var(--warning)] text-xs font-bold tracking-[0.1em] uppercase">
              🔒 Read-only access — viewing archived data
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`max-w-7xl mx-auto px-4 py-6 ${isReadOnly ? "pt-14" : ""}`}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-8 rounded-full"
                style={{
                  background: `linear-gradient(to bottom, ${accent}, transparent)`,
                }}
              />
              <div>
                <h1
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: accent }}
                >
                  {isAdmin ? "Workspace" : "My Workspace"}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center flex-wrap gap-1.5">
                  <span>
                    {profile?.full_name ?? userEmail} · {persona.toUpperCase()}{" "}
                    MODE
                  </span>
                  {companyName && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{ background: `${accent}20`, color: accent }}
                    >
                      <Building2 size={9} />
                      {companyName}
                    </span>
                  )}
                  {!isAdmin && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{ background: `${accent}20`, color: accent }}
                    >
                      MEMBER VIEW
                    </span>
                  )}
                </p>
              </div>
            </div>
            {/* Live Tickers — admin only */}
            {isAdmin && (
              <div className="hidden md:flex items-center gap-4">
                {tickers.map((t) => (
                  <div
                    key={t.symbol}
                    className="flex items-center gap-2 px-3 py-1.5 rounded"
                    style={{
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <span className="text-xs text-[var(--text-secondary)] font-bold">
                      {t.symbol}
                    </span>
                    <span className="text-xs text-[var(--text-primary)] font-mono">
                      {t.price != null ? `$${t.price.toFixed(2)}` : "—"}
                    </span>
                    {t.change != null && (
                      <span
                        className="text-xs font-bold"
                        style={{
                          color:
                            t.change >= 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {t.change >= 0 ? "+" : ""}
                        {t.change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className="h-px w-full mt-4"
            style={{
              background: `linear-gradient(to right, transparent, ${accent}40, transparent)`,
            }}
          />
        </motion.div>

        {/* ── TAB BAR ── */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2 flex-wrap">
          {/* Workspace tabs */}
          {workspaceTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold whitespace-nowrap transition-all"
              style={{
                background:
                  activeTab === tab.id ? `${accent}20` : "rgba(0,0,0,0.03)",
                border: `1px solid ${activeTab === tab.id ? accent + "60" : "rgba(0,0,0,0.06)"}`,
                color: activeTab === tab.id ? accent : "var(--text-secondary)",
              }}
            >
              <tab.icon size={14} />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}

          {/* Divider */}
        </div>

        <AnimatePresence mode="wait">
          {/* ── STRATEGIC PULSE ──────────────────────────────────────────── */}
          {activeTab === "pulse" && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <KPISection
                stats={liveStats}
                activeSlug={activeTab as string}
                onCardClick={(slug) =>
                  setActiveTab(
                    activeTab === slug ? ("pulse" as any) : (slug as any),
                  )
                }
                revenueChangePct={isAdmin ? mrrTrend : undefined}
                metricsLoading={isAdmin ? metricsLoading : false}
                estimatedSlugs={
                  isAdmin ? ["total-profit", "profit-margin"] : undefined
                }
                allowedSlugs={
                  isAdmin
                    ? [
                        "total-revenue",
                        "total-profit",
                        "profit-margin",
                        "total-orders",
                        "active-users",
                        "churn-rate",
                      ]
                    : ["total-revenue", "total-profit", "profit-margin"]
                }
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Internal Revenue Panel */}
                {isAdmin && (
                  <div
                    className="rounded-xl p-5"
                    style={{
                      background: "rgba(0,0,0,0.02)",
                      border: `1px solid ${accent}30`,
                      boxShadow: `0 0 30px ${accent}08`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                          {isAdmin
                            ? "Internal Revenue"
                            : "Your Revenue Contribution"}
                        </p>
                        {metricsLoading ? (
                          <motion.div
                            className="h-9 w-40 rounded"
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={{ background: "rgba(0,0,0,0.06)" }}
                          />
                        ) : (
                          <p className="text-3xl font-bold text-[var(--text-primary)]">
                            ${mrr.toLocaleString()}
                            <span className="text-sm text-[var(--text-secondary)] ml-2 font-normal">
                              /mo
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--text-secondary)]">
                          Churn
                        </p>
                        <p
                          className="text-lg font-bold"
                          style={{
                            color:
                              churn < 3 ? "var(--success)" : "var(--danger)",
                          }}
                        >
                          {churn}%
                        </p>
                      </div>
                    </div>

                    <div className="h-40">
                      {metricsLoading ? (
                        <div className="h-full flex items-end gap-1 px-2">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <motion.div
                              key={i}
                              className="flex-1 rounded-t"
                              animate={{ opacity: [0.2, 0.5, 0.2] }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.1,
                              }}
                              style={{
                                height: `${30 + ((i * 37) % 60)}%`,
                                background: `${accent}30`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={mrrSparkline}>
                            <defs>
                              <linearGradient
                                id="colorRevenue"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="var(--accent)"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="var(--accent)"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="var(--border)"
                            />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                              contentStyle={{
                                background: "var(--bg-surface)",
                                border: `1px solid ${accent}40`,
                                borderRadius: 6,
                                fontSize: 11,
                                color: "var(--text-primary)",
                              }}
                              formatter={(v: number) => [
                                `$${v.toLocaleString()}`,
                                "Revenue",
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="mrr"
                              stroke="var(--accent)"
                              strokeWidth={3}
                              fill="url(#colorRevenue)"
                              dot={{
                                r: 3,
                                fill: "var(--accent)",
                                strokeWidth: 0,
                              }}
                              activeDot={{
                                r: 6,
                                strokeWidth: 0,
                                fill: "var(--accent)",
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {[
                        {
                          label: isAdmin ? "New Signups" : "Your Signups",
                          value: isAdmin ? signups : 1,
                          color: "var(--success)",
                        },
                        {
                          label: "Subscribers",
                          value: isAdmin ? Math.round(mrr / 49) : 1,
                          color: accent,
                        },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className="p-3 rounded-lg"
                          style={{ background: "rgba(0,0,0,0.03)" }}
                        >
                          <p className="text-xs text-[var(--text-secondary)] mb-1">
                            {m.label}
                          </p>
                          <p
                            className="text-xl font-bold"
                            style={{ color: m.color }}
                          >
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Why Feed Panel */}
                <div
                  className={`rounded-xl p-5 flex flex-col ${!isAdmin ? "lg:col-span-2" : ""}`}
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-1">
                        Intelligence Feed
                      </p>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        Why Your Numbers Are Moving
                      </p>
                    </div>
                    <button
                      onClick={fetchWhyFeed}
                      disabled={feedLoading}
                      className="px-3 py-1.5 rounded text-xs font-bold transition-all"
                      style={{
                        background: feedLoading
                          ? "rgba(0,0,0,0.05)"
                          : `${accent}20`,
                        border: `1px solid ${accent}40`,
                        color: accent,
                      }}
                    >
                      {feedLoading ? "⟳ Analyzing..." : "↺ Refresh"}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1 custom-scroll">
                    {feedLoading && <FeedSkeleton accent={accent} />}
                    {!feedLoading && feedError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4"
                      >
                        <p className="text-2xl">⚠️</p>
                        <p className="text-xs text-[var(--warning)] font-bold">
                          AI Insights Unavailable
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          Market signals detected, but AI analysis is offline.
                          Check API keys.
                        </p>
                        <button
                          onClick={fetchWhyFeed}
                          className="mt-2 px-4 py-1.5 rounded text-xs font-bold transition-all"
                          style={{
                            background: `${accent}20`,
                            border: `1px solid ${accent}40`,
                            color: accent,
                          }}
                        >
                          Retry
                        </button>
                      </motion.div>
                    )}
                    {!feedLoading &&
                      !feedError &&
                      whyFeed.map((item, i) => {
                        const color = impactColor(
                          item.impact_type,
                          item.impact_delta,
                        );
                        const Icon =
                          item.impact_type === "risk"
                            ? ShieldAlert
                            : item.impact_type === "opportunity"
                              ? Lightbulb
                              : item.impact_type === "churn"
                                ? TrendingDown
                                : TrendingUp;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="p-4 rounded-lg"
                            style={{
                              background: "rgba(0,0,0,0.025)",
                              border: `1px solid ${color}25`,
                              borderLeft: `3px solid ${color}`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <Icon
                                  size={14}
                                  strokeWidth={2}
                                  className="shrink-0 mt-0.5"
                                  style={{ color }}
                                />
                                <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                                  {item.headline}
                                </p>
                              </div>
                              <span
                                className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{
                                  background: `${color}20`,
                                  color,
                                }}
                              >
                                {Number(item.impact_delta ?? 0) > 0 ? "+" : ""}
                                {Number(item.impact_delta ?? 0).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-6">
                              {item.snippet}
                            </p>
                            <div className="flex items-center gap-2 mt-2 pl-6">
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded"
                                style={{
                                  background: "rgba(0,0,0,0.05)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {item.source}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                                {item.impact_type}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    {!feedLoading && !feedError && whyFeed.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <p className="text-[var(--text-muted)] text-sm">
                          No intelligence yet.
                        </p>
                        <button
                          onClick={fetchWhyFeed}
                          className="text-xs underline"
                          style={{ color: accent }}
                        >
                          Generate Feed
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── KPI FORENSIC DETAIL — role-gated ────────────────────────── */}
          {KPI_SLUGS.has(activeTab as string) &&
            !(role === "user" && ADMIN_ONLY_SLUGS.has(activeTab as string)) && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <KPIDetailClient
                  slug={activeTab as string}
                  stats={liveStats}
                  analytics={{}}
                  role={role}
                  persona={persona as any}
                  viewMode="full"
                  onBack={() => setActiveTab("pulse")}
                  userId={userId}
                />
              </motion.div>
            )}

          {/* ── ACCESS DENIED — user tried restricted KPI ────────────────── */}
          {KPI_SLUGS.has(activeTab as string) &&
            role === "user" &&
            ADMIN_ONLY_SLUGS.has(activeTab as string) && (
              <motion.div
                key="access-denied"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-4"
              >
                <p className="text-4xl">🔒</p>
                <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  Admin Access Required
                </p>
                <p className="text-xs text-[var(--text-muted)] text-center max-w-xs">
                  This KPI is restricted to administrator accounts. Contact your
                  admin for access.
                </p>
                <button
                  onClick={() => setActiveTab("pulse")}
                  className="mt-2 px-4 py-2 rounded text-xs font-bold transition-all"
                  style={{
                    background: `${accent}20`,
                    border: `1px solid ${accent}40`,
                    color: accent,
                  }}
                >
                  Back to Pulse
                </button>
              </motion.div>
            )}

          {/* ── CEO BRIEFING CUSTOMIZER ──────────────────────────────────── */}
          {activeTab === "customizer" && (
            <motion.div
              key="customizer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
            >
              <div className="lg:col-span-2">
                <CEOBriefing
                  efficiency={efficiency}
                  newsHeadline={latestNews}
                  persona={persona}
                  personaFocus={
                    {
                      defensive: "Focus on threats & mitigation",
                      balanced: "Holistic strategic view",
                      aggressive: "Maximize growth opportunities",
                    }[persona] ?? "Holistic strategic view"
                  }
                  onInsights={(aLabel, aItems, bLabel, bItems) => {
                    setSectionALabel(aLabel);
                    setSectionAItems(aItems);
                    setSectionBLabel(bLabel);
                    setSectionBItems(bItems);
                  }}
                />
              </div>
              <div className="space-y-6">
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: `linear-gradient(135deg, ${accent}06, transparent)`,
                    border: `1px solid ${accent}25`,
                    boxShadow: `0 1px 3px rgba(0,0,0,0.04)`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-md"
                      style={{ background: `${accent}15` }}
                    >
                      <Target size={13} style={{ color: accent }} />
                    </div>
                    <p
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: accent }}
                    >
                      Briefing Focus
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "defensive",
                        label: "Risk Defensive",
                        icon: Shield,
                        desc: "Focus on threats & mitigation",
                        color: "#dc2626",
                      },
                      {
                        id: "balanced",
                        label: "Balanced",
                        icon: Scale,
                        desc: "Holistic strategic view",
                        color: accent,
                      },
                      {
                        id: "aggressive",
                        label: "Growth Aggressive",
                        icon: Rocket,
                        desc: "Maximize growth opportunities",
                        color: "#16a34a",
                      },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => !isReadOnly && setPersona(p.id)}
                        className="p-4 rounded-xl text-center transition-all"
                        style={{
                          background:
                            persona === p.id
                              ? `${p.color}12`
                              : "rgba(0,0,0,0.03)",
                          border: `1px solid ${persona === p.id ? p.color + "50" : "rgba(0,0,0,0.06)"}`,
                          boxShadow:
                            persona === p.id ? `0 0 20px ${p.color}18` : "none",
                          cursor: isReadOnly ? "not-allowed" : "pointer",
                        }}
                      >
                        <div
                          className="flex items-center justify-center w-9 h-9 rounded-lg mb-2 mx-auto"
                          style={{
                            background:
                              persona === p.id
                                ? `${p.color}18`
                                : "rgba(0,0,0,0.04)",
                          }}
                        >
                          <p.icon
                            size={18}
                            style={{
                              color:
                                persona === p.id
                                  ? p.color
                                  : "var(--text-muted)",
                            }}
                          />
                        </div>
                        <p
                          className="text-xs font-bold mb-1"
                          style={{
                            color:
                              persona === p.id ? p.color : "var(--text-muted)",
                          }}
                        >
                          {p.label}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {p.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {(sectionAItems.length > 0 || sectionBItems.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sectionAItems.length > 0 && (
                      <div
                        className="rounded-xl p-4"
                        style={{
                          background: "rgba(220,38,38,0.05)",
                          borderLeft: "3px solid #dc2626",
                          border: "1px solid rgba(220,38,38,0.15)",
                          borderLeftWidth: "3px",
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <ShieldAlert size={14} style={{ color: "#dc2626" }} />
                          <span
                            className="text-[11px] font-semibold uppercase tracking-wide"
                            style={{ color: "#dc2626" }}
                          >
                            {sectionALabel}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {sectionAItems.map((item, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed pl-3 relative"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <span
                                className="absolute left-0 top-1.5 w-1 h-1 rounded-full"
                                style={{ background: "#dc2626" }}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sectionBItems.length > 0 && (
                      <div
                        className="rounded-xl p-4"
                        style={{
                          background: "rgba(22,163,74,0.05)",
                          border: "1px solid rgba(22,163,74,0.15)",
                          borderLeftWidth: "3px",
                          borderLeftColor: "#16a34a",
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <TrendingUp size={14} style={{ color: "#16a34a" }} />
                          <span
                            className="text-[11px] font-semibold uppercase tracking-wide"
                            style={{ color: "#16a34a" }}
                          >
                            {sectionBLabel}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {sectionBItems.map((item, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed pl-3 relative"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <span
                                className="absolute left-0 top-1.5 w-1 h-1 rounded-full"
                                style={{ background: "#16a34a" }}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {!isReadOnly && (
                  <button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                    style={{
                      background: settingsSaved
                        ? "var(--success)"
                        : savingSettings
                          ? `${accent}40`
                          : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                      color: "#FFFFFF",
                      boxShadow:
                        settingsSaved || savingSettings
                          ? "none"
                          : `0 4px 20px ${accent}40`,
                    }}
                  >
                    {settingsSaved
                      ? "✓ Settings Saved"
                      : savingSettings
                        ? "Saving..."
                        : "Save Briefing Settings"}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }
        input[type="range"]::-webkit-slider-thumb {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
