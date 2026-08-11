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
import { DashboardStats, getAggregateDashboardStats } from "@/lib/data";
import { Building2 } from "lucide-react";

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
interface BusinessEntity {
  id: string;
  name: string;
  type: string;
  sensitivity_score: number;
  metadata: Record<string, unknown>;
  base_value?: number; // ← add this
}
interface WhyFeedItem {
  headline: string;
  snippet: string;
  impact_type: "churn" | "revenue" | "opportunity" | "risk";
  impact_delta: number;
  source: string;
}
interface SimulationResult {
  mrr_delta_pct: number;
  burn_delta_pct: number;
  subscriber_delta_pct: number;
  runway_months: number;
  risk_level: string;
  recommended_action: string;
  summary: string;
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
  initialEntities: BusinessEntity[];
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
  "total-asset-value",
  "market-growth-yield",
  "active-nodes-count",
]);

// Slugs restricted to admin only
const ADMIN_ONLY_SLUGS = new Set([
  "total-orders",
  "active-users",
  "churn-rate",
]);

// Slugs available to users
const USER_KPI_SLUGS = [
  "total-revenue",
  "total-profit",
  "profit-margin",
  "total-asset-value",
  "market-growth-yield",
  "active-nodes-count",
];

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

const SHOCK_PRESETS = [
  { key: "nasdaq_drop", label: "NASDAQ −20%", value: -20, icon: "📉" },
  { key: "ai_regulation", label: "AI Regulation +1", value: 1, icon: "⚖️" },
  { key: "inflation", label: "Inflation +5%", value: 5, icon: "🔥" },
  { key: "vc_freeze", label: "VC Freeze", value: -15, icon: "🧊" },
  { key: "rate_hike", label: "Rate +0.75%", value: 0.75, icon: "🏦" },
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

// ── NODE VAULT DATA GENERATOR ─────────────────────────────────────────────────
function generateNodeVaultData(entities: BusinessEntity[], baseMrr: number) {
  const months = [
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
  ];
  return months.map((month, i) => {
    const totalCoeff = entities.reduce((sum, e) => {
      const coeff = 1 + (e.sensitivity_score ?? 30) / 200;
      return sum + Math.pow(coeff, i);
    }, 0);
    const base = entities.length > 0 ? baseMrr / entities.length : baseMrr;
    const fluctuation = 1 + Math.sin(i * 1.3) * 0.06;
    return {
      month,
      value: Math.round(base * totalCoeff * fluctuation),
    };
  });
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
  initialEntities,
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
    setEntityCount,
    setSnapshotCount,
    mrrTrend,
    setMrrTrend,
    setIsWorkspacePage,
  } = useWorkspace();

  const isAdmin = role === "admin";

  // ── LIVE METRICS ──
  const [mrr, setMrr] = useState(initialMrr);
  const [churn] = useState(initialChurn);
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

  // ── FORGE ──
  const [shocks, setShocks] = useState<Record<string, number>>({
    nasdaq_drop: 0,
    ai_regulation: 0,
    inflation: 0,
    vc_freeze: 0,
    rate_hike: 0,
  });
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // ── ENTITIES ──
  const [entities, setEntities] = useState<BusinessEntity[]>(initialEntities);
  const [newEntity, setNewEntity] = useState({ name: "", type: "product" });
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [addingEntity, setAddingEntity] = useState(false);
  const [forgeBaseValue, setForgeBaseValue] = useState<string>("");

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
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "why-feed",
          headlines: MOCK_HEADLINES,
          mrr: mrrRef.current,
          churn: churnRef.current,
          persona: personaRef.current,
          marketData: {
            SPY: tickersRef.current.find((t) => t.symbol === "SPY"),
            NVDA: tickersRef.current.find((t) => t.symbol === "NVDA"),
            BTC: tickersRef.current.find((t) => t.symbol === "BTC"),
          },
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
    setEntityCount(entities.length);
  }, [entities.length, setEntityCount]);
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

  // ── SIMULATION ────────────────────────────────────────────────────────────
  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate",
          shocks,
          mrr,
          burn: Math.round(mrr * 0.6),
          subscribers: Math.round(mrr / 49),
          persona,
        }),
      });
      const data = await res.json();
      if (data.simulation) setSimulation(data.simulation);
    } catch {
      /* silent */
    } finally {
      setSimLoading(false);
    }
  };

  // ── ENTITY MANAGEMENT ─────────────────────────────────────────────────────
  const addEntity = async () => {
    if (!newEntity.name.trim() || isReadOnly) return;
    setAddingEntity(true);
    try {
      const { data, error } = await supabase
        .from("business_entities")
        .insert({ user_id: userId, name: newEntity.name, type: newEntity.type })
        .select()
        .single();
      if (!error && data) {
        setEntities((prev) => [data, ...prev]);
        setNewEntity({ name: "", type: "product" });
        scoreEntity(data);
      }
    } catch {
      /* silent */
    } finally {
      setAddingEntity(false);
    }
  };

  const handleForgeNode = async () => {
    if (!newEntity.name.trim() || !forgeBaseValue || isReadOnly) return;
    setAddingEntity(true);
    try {
      const { data, error } = await supabase
        .from("business_entities")
        .insert({
          user_id: userId,
          name: newEntity.name,
          type: newEntity.type ?? "custom",
          base_value: parseFloat(forgeBaseValue),
        })
        .select()
        .single();

      if (!error && data) {
        setEntities((prev) => [data, ...prev]);
        setNewEntity({ name: "", type: "product" });
        setForgeBaseValue("");
        scoreEntity(data);
      }
    } catch {
      /* silent */
    } finally {
      setAddingEntity(false);
    }
  };

  const scoreEntity = async (entity: BusinessEntity) => {
    setScoringId(entity.id);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score-entities",
          entities: [entity],
          marketConditions: {
            spy_change: tickers.find((t) => t.symbol === "SPY")?.change ?? 0,
            volatility: 18.5,
            rate_environment: "rising",
          },
        }),
      });
      const data = await res.json();
      const score = data.scores?.[0];
      if (score) {
        await supabase
          .from("business_entities")
          .update({
            sensitivity_score: score.score,
            last_scored_at: new Date().toISOString(),
          })
          .eq("id", entity.id);
        setEntities((prev) =>
          prev.map((e) =>
            e.id === entity.id ? { ...e, sensitivity_score: score.score } : e,
          ),
        );
      }
    } catch {
      /* silent */
    } finally {
      setScoringId(null);
    }
  };

  const deleteEntity = async (id: string) => {
    if (isReadOnly) return;
    await supabase.from("business_entities").delete().eq("id", id);
    setEntities((prev) => prev.filter((e) => e.id !== id));
  };

  const deleteNode = async (id: string) => {
    await supabase.from("business_entities").delete().eq("id", id);
    setEntities((prev) => prev.filter((e) => e.id !== id));
  };
  // ── SAVE SETTINGS ─────────────────────────────────────────────────────────
  const saveSettings = async () => {
    if (isReadOnly) return;
    setSavingSettings(true);
    try {
      await supabase.from("briefing_settings").upsert({
        user_id: userId,
        persona,
        frequency,
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

  const riskLevelColor = (level: string) =>
    ({
      LOW: "var(--success)",
      MEDIUM: "var(--warning)",
      HIGH: "var(--warning)",
      CRITICAL: "var(--danger)",
    })[level] ?? "var(--text-muted)";

  const sensitivityColor = (score: number) => {
    if (score >= 75) return "var(--danger)";
    if (score >= 50) return "var(--warning)";
    if (score >= 25) return "var(--warning)";
    return "var(--success)";
  };

  // ── TAB DEFINITIONS ───────────────────────────────────────────────────────
  const workspaceTabs = [
    { id: "pulse", label: "Live Metrics", icon: "⚡" },
    { id: "archives", label: "Snapshot Archive", icon: "🔒" },
    { id: "forge", label: "Scenario Simulator", icon: "🔥" },
    { id: "entities", label: "Asset Registry", icon: "🗺️" },
    { id: "customizer", label: "CEO Briefing", icon: "🎯" },
  ] as const;

  // user-only tab — rendered separately in tab bar
  const userOnlyTabs = !isAdmin
    ? [{ id: "forge-node", label: "Add Entity", icon: "🔩" }]
    : [];

  // KPI slugs available to current role
  const availableKpiSlugs = isAdmin ? ALL_KPI_SLUGS : USER_KPI_SLUGS;

  // Shared stats object for KPIDetailClient
  const userHasNodes = !isAdmin && entities.length > 0;

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
  const isForgeNodeTab = activeTab === ("forge-node" as any);

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
              <span>{tab.icon}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
          {/* Forge Node button — user only, right side */}
          {!isAdmin && (
            <>
              <div className="flex-1" /> {/* pushes button to right */}
              <button
                onClick={() => setActiveTab("forge-node")}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background:
                    activeTab === "forge-node"
                      ? `${accent}20`
                      : `linear-gradient(135deg, ${accent}30, ${accent}15)`,
                  border: `1px solid ${activeTab === "forge-node" ? accent : accent + "60"}`,
                  color: accent,
                  boxShadow: `0 0 16px ${accent}20`,
                }}
              >
                <span>🔩</span>
                <span className="hidden sm:block">Add Entity</span>
              </button>
            </>
          )}

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
                    : [
                        "total-revenue",
                        "total-profit",
                        "profit-margin",
                        "total-asset-value",
                        "market-growth-yield",
                        "active-nodes-count",
                      ]
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
                      whyFeed.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="p-3 rounded-lg"
                          style={{
                            background: "rgba(0,0,0,0.025)",
                            border: `1px solid ${impactColor(item.impact_type, item.impact_delta)}25`,
                            borderLeft: `3px solid ${impactColor(item.impact_type, item.impact_delta)}`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                              {item.headline}
                            </p>
                            <span
                              className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                              style={{
                                background: `${impactColor(item.impact_type, item.impact_delta)}20`,
                                color: impactColor(
                                  item.impact_type,
                                  item.impact_delta,
                                ),
                              }}
                            >
                              {(item.impact_delta ?? 0) > 0 ? "+" : ""}
                              {(item.impact_delta ?? 0).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                            {item.snippet}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {item.source} · {item.impact_type.toUpperCase()}
                          </p>
                        </motion.div>
                      ))}
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
                  entities={entities} // â† add this
                  onDeleteNode={deleteNode}
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

          {/* ── INTELLIGENCE ARCHIVES ────────────────────────────────────── */}
          {activeTab === "archives" && (
            <motion.div
              key="archives"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {!isReadOnly && (
                <div
                  className="rounded-xl p-5 mb-6"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: `1px solid ${accent}30`,
                  }}
                >
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3">
                    🔒 Save Decision Snapshot
                  </p>
                  <div className="flex gap-3">
                    <input
                      value={sealLabel}
                      onChange={(e) => setSealLabel(e.target.value)}
                      placeholder="Decision label (e.g. 'Launched EU Campaign')"
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSeal()}
                    />
                    <button
                      onClick={handleSeal}
                      disabled={sealing || !sealLabel.trim()}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: sealSuccess
                          ? "var(--success)"
                          : sealing
                            ? `${accent}40`
                            : accent,
                        color: "#FFFFFF",
                        opacity: !sealLabel.trim() ? 0.4 : 1,
                      }}
                    >
                      {sealSuccess
                        ? "✓ Saved"
                        : sealing
                          ? "Saving..."
                          : "Save Snapshot"}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Captures: internal metrics + market conditions + AI advice →
                    SHA-256 hash
                  </p>
                </div>
              )}
              {snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <p className="text-4xl">🔒</p>
                  <p className="text-[var(--text-secondary)] text-sm">
                    No snapshots saved yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {snapshots.map((snap, i) => (
                    <motion.div
                      key={snap.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(0,0,0,0.025)",
                        border: "1px solid rgba(0,0,0,0.07)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {snap.label}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {new Date(snap.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-bold"
                          style={{ background: `${accent}20`, color: accent }}
                        >
                          {snap.persona}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          {
                            label: "MRR",
                            value: `$${snap.mrr.toLocaleString()}`,
                          },
                          { label: "Churn", value: `${snap.churn}%` },
                          { label: "Signups", value: snap.signups },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="text-center p-2 rounded"
                            style={{ background: "rgba(0,0,0,0.03)" }}
                          >
                            <p className="text-xs text-[var(--text-secondary)]">
                              {m.label}
                            </p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {m.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div
                        className="p-3 rounded-lg mb-3"
                        style={{ background: "rgba(0,0,0,0.03)" }}
                      >
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                          {snap.ai_advice}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 px-2 py-1 rounded font-mono text-xs text-[var(--text-muted)] truncate"
                          style={{ background: "rgba(0,0,0,0.3)" }}
                        >
                          #{snap.hash.slice(0, 20)}...
                        </div>
                        <span className="text-[var(--success)] text-xs">
                          ✓ SAVED
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── WHAT-IF FORGE ────────────────────────────────────────────── */}
          {activeTab === "forge" && (
            <motion.div
              key="forge"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div
                className="rounded-xl p-5"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: `1px solid ${accent}30`,
                }}
              >
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-5">
                  🔥 Macro Shock Simulator
                </p>
                <div className="space-y-5">
                  {SHOCK_PRESETS.map((preset) => (
                    <div key={preset.key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {preset.icon} {preset.label}
                        </span>
                        <span
                          className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                          style={{
                            background:
                              shocks[preset.key] !== 0
                                ? `${accent}20`
                                : "rgba(0,0,0,0.05)",
                            color:
                              shocks[preset.key] !== 0
                                ? accent
                                : "var(--text-muted)",
                          }}
                        >
                          {shocks[preset.key] > 0 ? "+" : ""}
                          {shocks[preset.key].toFixed(1)}
                          {preset.key === "rate_hike"
                            ? "%"
                            : preset.key === "ai_regulation"
                              ? " law"
                              : "%"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.abs(preset.value) * 2}
                        step={preset.key === "rate_hike" ? 0.25 : 1}
                        value={shocks[preset.key]}
                        onChange={(e) =>
                          setShocks((prev) => ({
                            ...prev,
                            [preset.key]: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 rounded appearance-none cursor-pointer"
                        style={{ accentColor: accent }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={runSimulation}
                  disabled={simLoading}
                  className="w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all"
                  style={{
                    background: simLoading
                      ? `${accent}40`
                      : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    color: "#FFFFFF",
                    boxShadow: simLoading ? "none" : `0 4px 20px ${accent}40`,
                  }}
                >
                  {simLoading ? "⟳ Running Simulation..." : "⚡ Run Simulation"}
                </button>
                <button
                  onClick={() => {
                    setShocks({
                      nasdaq_drop: 0,
                      ai_regulation: 0,
                      inflation: 0,
                      vc_freeze: 0,
                      rate_hike: 0,
                    });
                    setSimulation(null);
                  }}
                  className="w-full mt-2 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Reset All Shocks
                </button>
              </div>

              <div
                className="rounded-xl p-5"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-5">
                  📊 Projected Impact
                </p>
                {!simulation && !simLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <p className="text-4xl">🔮</p>
                    <p className="text-[var(--text-secondary)] text-sm text-center">
                      Apply shocks and run simulation
                    </p>
                  </div>
                )}
                {simLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: accent }}
                    />
                    <p className="text-[var(--text-secondary)] text-sm">
                      AI projecting scenario...
                    </p>
                  </div>
                )}
                {simulation && !simLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">
                        Risk Level
                      </span>
                      <span
                        className="text-sm font-bold px-3 py-1 rounded font-mono"
                        style={{
                          background: `${riskLevelColor(simulation.risk_level)}20`,
                          color: riskLevelColor(simulation.risk_level),
                          border: `1px solid ${riskLevelColor(simulation.risk_level)}40`,
                        }}
                      >
                        {simulation.risk_level}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "MRR Impact",
                          value: simulation.mrr_delta_pct,
                          suffix: "%",
                        },
                        {
                          label: "Burn Change",
                          value: simulation.burn_delta_pct,
                          suffix: "%",
                        },
                        {
                          label: "Sub Change",
                          value: simulation.subscriber_delta_pct,
                          suffix: "%",
                        },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className="p-3 rounded-lg text-center"
                          style={{ background: "rgba(0,0,0,0.03)" }}
                        >
                          <p className="text-xs text-[var(--text-secondary)] mb-1">
                            {m.label}
                          </p>
                          <p
                            className="text-xl font-bold"
                            style={{
                              color:
                                m.value >= 0
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            {m.value >= 0 ? "+" : ""}
                            {m.value.toFixed(1)}
                            {m.suffix}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: "rgba(0,0,0,0.03)" }}
                    >
                      <span className="text-sm text-[var(--text-secondary)]">
                        Projected Runway
                      </span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {simulation.runway_months} months
                      </span>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{
                        background: "rgba(0,0,0,0.03)",
                        border: `1px solid ${accent}20`,
                      }}
                    >
                      <p className="text-xs text-[var(--text-secondary)] mb-2 font-bold">
                        EXECUTIVE SUMMARY
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {simulation.summary}
                      </p>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{
                        background: `${accent}08`,
                        border: `1px solid ${accent}30`,
                      }}
                    >
                      <p
                        className="text-xs font-bold mb-2"
                        style={{ color: accent }}
                      >
                        RECOMMENDED ACTION
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {simulation.recommended_action}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ENTITY REGISTRY ──────────────────────────────────────────── */}
          {activeTab === "entities" && (
            <motion.div
              key="entities"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {!isReadOnly && (
                <div
                  className="rounded-xl p-5 mb-6"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: `1px solid ${accent}30`,
                  }}
                >
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3">
                    🗺️ Register Business Node
                  </p>
                  <div className="flex gap-3">
                    <input
                      value={newEntity.name}
                      onChange={(e) =>
                        setNewEntity((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Entity name (e.g. Product A, EU Region)"
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    />
                    <select
                      value={newEntity.type}
                      onChange={(e) =>
                        setNewEntity((p) => ({ ...p, type: e.target.value }))
                      }
                      className="px-3 py-2.5 rounded-lg text-sm text-[var(--text-primary)] outline-none"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      {["product", "region", "tier", "custom"].map((t) => (
                        <option
                          key={t}
                          value={t}
                          style={{ background: "var(--bg-surface)" }}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addEntity}
                      disabled={addingEntity || !newEntity.name.trim()}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{
                        background: addingEntity ? `${accent}40` : accent,
                        color: "#FFFFFF",
                        opacity: !newEntity.name.trim() ? 0.4 : 1,
                      }}
                    >
                      {addingEntity ? "Adding..." : "+ Add"}
                    </button>
                  </div>
                </div>
              )}

              {entities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <p className="text-4xl">🗺️</p>
                  <p className="text-[var(--text-secondary)] text-sm">
                    No business nodes registered.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {entities.map((entity, i) => {
                    const score = entity.sensitivity_score ?? 0;
                    return (
                      <motion.div
                        key={entity.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl p-4"
                        style={{
                          background: "rgba(0,0,0,0.025)",
                          border: "1px solid rgba(0,0,0,0.07)",
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {entity.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 capitalize">
                              {entity.type}
                            </p>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => deleteEntity(entity.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-[var(--text-secondary)]">
                              Market Sensitivity
                            </span>
                            {scoringId === entity.id ? (
                              <span className="text-xs text-[var(--text-muted)]">
                                Scoring...
                              </span>
                            ) : (
                              <span
                                className="text-sm font-bold"
                                style={{ color: sensitivityColor(score) }}
                              >
                                {score.toFixed(0)}
                              </span>
                            )}
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(0,0,0,0.06)" }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: sensitivityColor(score) }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>Resilient</span>
                            <span>Volatile</span>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => scoreEntity(entity)}
                            disabled={scoringId === entity.id}
                            className="w-full py-1.5 rounded text-xs font-bold transition-all"
                            style={{
                              background: "rgba(0,0,0,0.04)",
                              border: "1px solid rgba(0,0,0,0.08)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {scoringId === entity.id
                              ? "⟳ Scoring..."
                              : "↺ Rescore"}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* ── NODE VAULT — user only, shows when entities exist ── */}
              {!isAdmin && entities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 rounded-xl p-5"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: `1px solid ${accent}30`,
                    boxShadow: `0 0 40px ${accent}08`,
                  }}
                >
                  {/* Node Vault Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: accent }}
                        />
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">
                          ⚡ Portfolio Projection
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        Growth Projection
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Compounded growth · equity coefficient model
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="text-xs px-2 py-1 rounded font-bold"
                        style={{
                          background: `${accent}20`,
                          color: accent,
                          border: `1px solid ${accent}40`,
                        }}
                      >
                        PROJECTED MODEL
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {entities.length} node{entities.length !== 1 ? "s" : ""}{" "}
                        tracked
                      </span>
                    </div>
                  </div>

                  {/* Growth Chart */}
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart
                      data={generateNodeVaultData(entities, mrr)}
                      margin={{ left: -10, right: 8 }}
                    >
                      <defs>
                        <linearGradient
                          id="nodeVaultGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={accent}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={accent}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(0,0,0,0.04)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{
                          fontSize: 9,
                          fill: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 9,
                          fill: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--bg-surface)",
                          border: `1px solid ${accent}40`,
                          borderRadius: 8,
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: "var(--text-primary)",
                        }}
                        formatter={(v: number) => [
                          `$${v.toLocaleString()}`,
                          "Portfolio Value",
                        ]}
                      />
                      <ReferenceLine
                        y={mrr}
                        stroke="var(--success)"
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                        label={{
                          value: "BASE MRR",
                          position: "insideTopLeft",
                          fill: "var(--success)",
                          fontSize: 8,
                          fontFamily: "monospace",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={accent}
                        strokeWidth={2.5}
                        fill="url(#nodeVaultGrad)"
                        dot={{ r: 3, fill: accent, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: accent, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Per-node breakdown */}
                  <div className="mt-5">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-3">
                      6-Month Node Projections
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entities.slice(0, 4).map((entity, i) => {
                        const coeff =
                          1 + (entity.sensitivity_score ?? 30) / 200;
                        const nodeValue = Math.round(
                          (mrr / entities.length) * Math.pow(coeff, 6),
                        );
                        const growth = ((Math.pow(coeff, 6) - 1) * 100).toFixed(
                          1,
                        );
                        return (
                          <div
                            key={entity.id}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{
                              background: "rgba(0,0,0,0.03)",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <div>
                              <p className="text-xs font-bold text-[var(--text-primary)]">
                                {entity.name}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">
                                {entity.type} · coeff {coeff.toFixed(2)}x
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className="text-sm font-bold tabular-nums"
                                style={{
                                  color: accent,
                                  fontFamily: "monospace",
                                }}
                              >
                                ${nodeValue.toLocaleString()}
                              </p>
                              <p
                                className="text-xs font-bold mt-0.5"
                                style={{ color: "var(--success)" }}
                              >
                                +{growth}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {entities.length > 4 && (
                      <p className="text-xs text-[var(--text-muted)] text-center mt-3">
                        +{entities.length - 4} more nodes tracked
                      </p>
                    )}
                  </div>

                  {/* Total portfolio value */}
                  <div
                    className="mt-4 p-4 rounded-lg flex items-center justify-between"
                    style={{
                      background: `${accent}08`,
                      border: `1px solid ${accent}25`,
                    }}
                  >
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest">
                        Total Portfolio · 6mo
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Compounded across all {entities.length} nodes
                      </p>
                    </div>
                    <p
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: accent, fontFamily: "monospace" }}
                    >
                      $
                      {entities
                        .reduce((sum, entity) => {
                          const coeff =
                            1 + (entity.sensitivity_score ?? 30) / 200;
                          return (
                            sum +
                            Math.round(
                              (mrr / entities.length) * Math.pow(coeff, 6),
                            )
                          );
                        }, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              )}
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
              <div className="space-y-6">
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: `1px solid ${accent}30`,
                  }}
                >
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-4">
                    🎯 Consultant Persona
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "defensive",
                        label: "Risk Defensive",
                        icon: "🛡️",
                        desc: "Focus on threats & mitigation",
                      },
                      {
                        id: "balanced",
                        label: "Balanced",
                        icon: "⚖️",
                        desc: "Holistic strategic view",
                      },
                      {
                        id: "aggressive",
                        label: "Growth Aggressive",
                        icon: "🚀",
                        desc: "Maximize growth opportunities",
                      },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => !isReadOnly && setPersona(p.id)}
                        className="p-4 rounded-xl text-center transition-all"
                        style={{
                          background:
                            persona === p.id
                              ? `${accent}15`
                              : "rgba(0,0,0,0.03)",
                          border: `1px solid ${persona === p.id ? accent + "60" : "rgba(0,0,0,0.06)"}`,
                          boxShadow:
                            persona === p.id ? `0 0 20px ${accent}15` : "none",
                          cursor: isReadOnly ? "not-allowed" : "pointer",
                        }}
                      >
                        <p className="text-2xl mb-2">{p.icon}</p>
                        <p
                          className="text-xs font-bold mb-1"
                          style={{
                            color:
                              persona === p.id ? accent : "var(--text-muted)",
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

                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-4">
                    📅 Briefing Frequency
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "daily",
                        label: "Daily Summary",
                        icon: "📆",
                      },
                      {
                        id: "weekly",
                        label: "Weekly Summary",
                        icon: "📋",
                      },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => !isReadOnly && setFrequency(f.id)}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                          background:
                            frequency === f.id
                              ? `${accent}15`
                              : "rgba(0,0,0,0.03)",
                          border: `1px solid ${frequency === f.id ? accent + "60" : "rgba(0,0,0,0.06)"}`,
                          cursor: isReadOnly ? "not-allowed" : "pointer",
                        }}
                      >
                        <p className="text-xl mb-2">{f.icon}</p>
                        <p
                          className="text-sm font-bold"
                          style={{
                            color:
                              frequency === f.id ? accent : "var(--text-muted)",
                          }}
                        >
                          {f.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-xl p-5"
                  style={{
                    background: `${accent}08`,
                    border: `1px solid ${accent}25`,
                  }}
                >
                  <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mb-3">
                    Preview — Current Config
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Persona",
                        value:
                          persona.charAt(0).toUpperCase() + persona.slice(1),
                      },
                      {
                        label: "Delivery",
                        value:
                          frequency.charAt(0).toUpperCase() +
                          frequency.slice(1),
                      },
                      {
                        label: "MRR Tracked",
                        value: `$${mrr.toLocaleString()}`,
                      },
                      { label: "Entities Monitored", value: entities.length },
                      {
                        label: "Access Level",
                        value: isAdmin ? "Administrator" : "Member",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-[var(--text-secondary)]">
                          {row.label}
                        </span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

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

          {/* ── FORGE NODE — full page, user only ─────────────────── */}

          {isForgeNodeTab && !isAdmin && (
            <motion.div
              key="forge-node"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-2 h-8 rounded-full"
                  style={{
                    background: `linear-gradient(to bottom, ${accent}, transparent)`,
                  }}
                />
                <div>
                  <h2
                    className="text-xl font-bold tracking-tight"
                    style={{ color: accent }}
                  >
                    Add Entity
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Deploy a new asset node into your active registry.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Forge Form */}
                <div
                  className="rounded-xl p-6 space-y-5"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: `1px solid ${accent}40`,
                    boxShadow: `0 0 40px ${accent}08`,
                  }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                    ⚡ Asset Configuration
                  </p>

                  {/* Node Name */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await handleForgeNode();
                      setActiveTab("active-nodes-count");
                    }}
                  >
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                        Node Identifier
                      </label>
                      <input
                        value={newEntity.name}
                        onChange={(e) =>
                          setNewEntity((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g., Alpha-Node-01"
                        className="w-full px-4 py-3 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                        style={{
                          background: "rgba(0,0,0,0.04)",
                          border: `1px solid ${newEntity.name ? accent + "40" : "rgba(0,0,0,0.08)"}`,
                        }}
                      />
                    </div>

                    {/* Base Valuation */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                        Base Valuation Capital
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={forgeBaseValue}
                          onChange={(e) => setForgeBaseValue(e.target.value)}
                          placeholder="Enter allocation capital..."
                          className="w-full pl-8 pr-4 py-3 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all"
                          style={{
                            background: "rgba(0,0,0,0.04)",
                            border: `1px solid ${forgeBaseValue ? accent + "40" : "rgba(0,0,0,0.08)"}`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Node Type */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                        Node Type
                      </label>
                      <select
                        value={newEntity.type}
                        onChange={(e) =>
                          setNewEntity((p) => ({ ...p, type: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-lg text-sm text-[var(--text-primary)] outline-none transition-all"
                        style={{
                          background: "rgba(0,0,0,0.04)",
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        {["product", "region", "tier", "custom"].map((t) => (
                          <option
                            key={t}
                            value={t}
                            style={{ background: "var(--bg-surface)" }}
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Forge Button */}
                    <button
                      type="submit"
                      disabled={
                        addingEntity ||
                        !newEntity.name.trim() ||
                        !forgeBaseValue
                      }
                      className="w-full py-4 rounded-lg text-sm font-bold tracking-widest uppercase transition-all"
                      style={{
                        background: addingEntity
                          ? `${accent}30`
                          : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        color: "#FFFFFF",
                        boxShadow: addingEntity
                          ? "none"
                          : `0 4px 24px ${accent}40`,
                        opacity:
                          !newEntity.name.trim() || !forgeBaseValue ? 0.4 : 1,
                        letterSpacing: "0.15em",
                      }}
                    >
                      {addingEntity ? "Adding..." : "Add Entity"}
                    </button>
                  </form>
                </div>

                {/* Live Registry Preview */}
                <div
                  className="rounded-xl p-6 space-y-4"
                  style={{
                    background: "rgba(0,0,0,0.02)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                    📡 Active Node Registry
                  </p>
                  {entities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <p className="text-3xl">🔩</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        No entities added yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
                      {entities.map((e, i) => (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{
                            background: "rgba(0,0,0,0.03)",
                            border: `1px solid ${accent}20`,
                          }}
                        >
                          <div>
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                              {e.name}
                            </p>
                            <p className="text-[9px] text-[var(--text-secondary)] capitalize mt-0.5">
                              {e.type}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-sm font-bold tabular-nums"
                              style={{ color: accent }}
                            >
                              ${(e.base_value ?? 0).toLocaleString()}
                            </p>
                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                              score {e.sensitivity_score ?? "—"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Portfolio total */}
                  {entities.length > 0 && (
                    <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                      <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest">
                        Total Portfolio
                      </span>
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ color: accent }}
                      >
                        $
                        {entities
                          .reduce((s, e) => s + (e.base_value ?? 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
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
