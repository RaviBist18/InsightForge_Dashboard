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
  getMyDatasetStats,
  getDatasetMovers,
} from "@/lib/data";
import Link from "next/link";
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
  Plus,
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
  const [totalProfit, setTotalProfit] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [latestNews, setLatestNews] = useState("Market stable");
  const [sectionALabel, setSectionALabel] = useState("Risks");
  const [sectionAItems, setSectionAItems] = useState<string[]>([]);
  const [sectionBLabel, setSectionBLabel] = useState("Opportunities");
  const [sectionBItems, setSectionBItems] = useState<string[]>([]);
  const [signups, setSignups] = useState(initialSignups);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(
    null,
  );
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
        const stats = await getMyDatasetStats();

        if (stats.datasetCount === 0) {
          setMrrSparkline(generateMockSparkline(initialMrr));
          setMetricsLoading(false);
          return;
        }

        const sparkline = stats.mrrSparkline || [];
        setMrrSparkline(sparkline);
        setMrr(stats.totalRevenue);
        setTotalProfit(stats.totalProfit);
        setProfitMargin(stats.profitMargin);
        setCurrentMonthOrders(stats.totalOrders);
        setCurrentMonthUsers(stats.activeUsers);
        setChurn(stats.churnRate);
        setSignups(stats.signups);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteSnapshots = async (ids: string[]) => {
    if (ids.length === 0 || isReadOnly) return;
    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "delete-snapshots", ids }),
      });
      const data = await res.json();
      if (data.deletedIds) {
        setSnapshots((prev) =>
          prev.filter((s) => !data.deletedIds.includes(s.id)),
        );
        setSelectedIds(new Set());
      }
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
    }
  };

  const deleteOne = (id: string) => setPendingDeleteIds([id]);
  const deleteSelected = () => setPendingDeleteIds(Array.from(selectedIds));
  const deleteAll = () => setPendingDeleteIds(snapshots.map((s) => s.id));

  const confirmDelete = async () => {
    if (!pendingDeleteIds) return;
    await deleteSnapshots(pendingDeleteIds);
    setPendingDeleteIds(null);
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
    totalProfit,
    profitMargin,
    totalOrders: currentMonthOrders,
    activeUsers: currentMonthUsers,
    churnRate: churn,
    signups,
    churned: 0,
    efficiency,
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
                  My Workspace
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
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    {isAdmin ? "ADMIN VIEW" : "MEMBER VIEW"}
                  </span>
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/datasets"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-colors"
              style={{ background: accent }}
            >
              <Plus size={14} /> Upload Dataset
            </Link>
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
                revenueChangePct={mrrTrend}
                metricsLoading={metricsLoading}
                estimatedSlugs={["total-profit", "profit-margin"]}
                allowedSlugs={[
                  "total-revenue",
                  "total-profit",
                  "profit-margin",
                ]}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Why Feed Panel */}
                <div
                  className="rounded-xl p-5 flex flex-col lg:col-span-2"
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
        {/* ── SNAPSHOT ARCHIVE ─────────────────────────────────────────── */}
        {activeTab === "archives" && (
          <motion.div
            key="archives"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {/* Seal form */}
            <div
              className="rounded-lg p-5 mb-6"
              style={{
                background: "rgba(0,0,0,0.02)",
                border: `1px solid ${accent}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Archive size={16} style={{ color: accent }} />
                <span className="text-sm font-bold">
                  Seal a Decision Snapshot
                </span>
              </div>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Save today's numbers so you can look back later.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sealLabel}
                  onChange={(e) => setSealLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSeal()}
                  placeholder="Preserve today's numbers for future comparison"
                  disabled={isReadOnly || sealing}
                  className="flex-1 px-3 py-2.5 rounded text-sm outline-none transition-all"
                  style={{
                    background: "var(--card-bg, #fff)",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
                <button
                  onClick={handleSeal}
                  disabled={!sealLabel.trim() || isReadOnly || sealing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold whitespace-nowrap transition-all"
                  style={{
                    background: accent,
                    color: "#fff",
                    opacity:
                      !sealLabel.trim() || isReadOnly || sealing ? 0.4 : 1,
                  }}
                >
                  {sealing ? (
                    "Sealing..."
                  ) : sealSuccess ? (
                    <>✓ Sealed</>
                  ) : (
                    <>
                      <Archive size={13} /> Seal Snapshot
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bulk actions */}
            {snapshots.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-secondary)]">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : `${snapshots.length} snapshot${snapshots.length > 1 ? "s" : ""}`}
                </span>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={deleteSelected}
                      disabled={deleting || isReadOnly}
                      className="px-3 py-1.5 rounded text-xs font-bold"
                      style={{
                        background: "rgba(220,38,38,0.1)",
                        color: "#dc2626",
                        opacity: deleting ? 0.5 : 1,
                      }}
                    >
                      Delete Selected ({selectedIds.size})
                    </button>
                  )}
                  <button
                    onClick={deleteAll}
                    disabled={deleting || isReadOnly}
                    className="px-3 py-1.5 rounded text-xs font-bold"
                    style={{
                      background: "rgba(220,38,38,0.1)",
                      color: "#dc2626",
                      opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    Delete All
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            {snapshots.length === 0 ? (
              <div
                className="text-xs font-bold text-center py-16"
                style={{ color: "var(--text-secondary)" }}
              >
                No snapshots sealed yet — your decision history will appear
                here.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="rounded-lg p-4 transition-all hover:shadow-sm"
                    style={{
                      background: "var(--card-bg, #fff)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(snap.id)}
                          onChange={() => toggleSelect(snap.id)}
                          className="mr-1"
                        />
                        <div
                          className="flex items-center justify-center rounded"
                          style={{
                            width: 28,
                            height: 28,
                            background: `${accent}15`,
                            color: accent,
                          }}
                        >
                          <Archive size={14} />
                        </div>
                        <span className="text-sm font-bold">{snap.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-medium whitespace-nowrap"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {new Date(snap.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}{" "}
                          ·{" "}
                          {new Date(snap.created_at).toLocaleTimeString(
                            undefined,
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <button
                          onClick={() => deleteOne(snap.id)}
                          disabled={deleting || isReadOnly}
                          className="text-[11px] font-bold px-2 py-1 rounded"
                          style={{ color: "#dc2626" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div
                        className="rounded p-2.5"
                        style={{ background: "rgba(0,0,0,0.025)" }}
                      >
                        <div
                          className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          MRR
                        </div>
                        <div className="text-sm font-bold">
                          ${snap.mrr.toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="rounded p-2.5"
                        style={{ background: "rgba(0,0,0,0.025)" }}
                      >
                        <div
                          className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Churn
                        </div>
                        <div className="text-sm font-bold">{snap.churn}%</div>
                      </div>
                      <div
                        className="rounded p-2.5"
                        style={{ background: "rgba(0,0,0,0.025)" }}
                      >
                        <div
                          className="text-[10px] font-bold uppercase tracking-wide mb-0.5"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Signups
                        </div>
                        <div className="text-sm font-bold">{snap.signups}</div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1.5 text-[10px] font-mono"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(0,0,0,0.04)" }}
                      >
                        SEALED
                      </span>
                      <span className="truncate">{snap.hash}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* Delete confirm modal */}
        <AnimatePresence>
          {pendingDeleteIds && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => !deleting && setPendingDeleteIds(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl p-6 max-w-sm w-full"
                style={{
                  background: "#fff",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                }}
              >
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                  {pendingDeleteIds.length === snapshots.length
                    ? "Delete all snapshots?"
                    : pendingDeleteIds.length === 1
                      ? "Delete snapshot?"
                      : `Delete ${pendingDeleteIds.length} snapshots?`}
                </h3>
                <p
                  className="text-sm mb-5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  This can't be undone. The sealed record
                  {pendingDeleteIds.length > 1 ? "s" : ""} will be permanently
                  removed.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setPendingDeleteIds(null)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      background: "rgba(0,0,0,0.06)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                    style={{
                      background: "#dc2626",
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
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
