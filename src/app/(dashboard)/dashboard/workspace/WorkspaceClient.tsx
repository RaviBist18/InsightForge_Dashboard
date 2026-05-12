"use client";
// src/app/(dashboard)/dashboard/workspace/WorkspaceClient.tsx

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AreaChart, Area, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    ReferenceLine, CartesianGrid,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Profile { full_name: string | null; role: string | null }
interface BriefingSettings { persona: string; frequency: string }
interface ForensicSnapshot {
    id: string; created_at: string; label: string; hash: string;
    mrr: number; churn: number; signups: number;
    market_conditions: Record<string, unknown>; ai_advice: string; persona: string;
}
interface BusinessEntity {
    id: string; name: string; type: string;
    sensitivity_score: number; metadata: Record<string, unknown>;
}
interface WhyFeedItem {
    headline: string; snippet: string;
    impact_type: "churn" | "revenue" | "opportunity" | "risk";
    impact_delta: number; source: string;
}
interface SimulationResult {
    mrr_delta_pct: number; burn_delta_pct: number;
    subscriber_delta_pct: number; runway_months: number;
    risk_level: string; counter_forge: string; summary: string;
}
interface Ticker { symbol: string; price: number | null; change: number | null }

interface Props {
    userId: string; userEmail: string;
    profile: Profile | null; briefingSettings: BriefingSettings | null;
    initialSnapshots: ForensicSnapshot[]; initialEntities: BusinessEntity[];
    mrr: number; churn: number; signups: number; isReadOnly: boolean;
}

// ── ACCENT MAP ────────────────────────────────────────────────────────────────
const ACCENT_COLORS: Record<string, string> = {
    sky: "#0ea5e9", emerald: "#10b981", violet: "#8b5cf6",
    amber: "#f59e0b", rose: "#f43f5e", cyan: "#06b6d4",
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
            {[1, 2, 3, 4].map(i => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="p-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                    <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="h-2 rounded flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
                        <div className="h-4 w-12 rounded" style={{ background: `${accent}20` }} />
                    </div>
                    <div className="h-2 rounded w-full mb-1.5" style={{ background: "rgba(255,255,255,0.04)" }} />
                    <div className="h-2 rounded w-3/4" style={{ background: "rgba(255,255,255,0.04)" }} />
                    {/* Scanning line */}
                    <motion.div
                        className="h-px w-full mt-2 rounded"
                        animate={{ scaleX: [0, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                        style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)`, transformOrigin: "left" }}
                    />
                </motion.div>
            ))}
            <div className="flex items-center justify-center gap-2 py-3">
                <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                    style={{ background: accent }}
                />
                <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                    style={{ background: accent }}
                />
                <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                    style={{ background: accent }}
                />
                <span className="text-xs ml-1" style={{ color: accent }}>Forging intelligence...</span>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function WorkspaceClient({
    userId, userEmail, profile, briefingSettings,
    initialSnapshots, initialEntities,
    mrr: initialMrr, churn: initialChurn, signups: initialSignups, isReadOnly,
}: Props) {
    const { accentColor } = useTheme();
    const accent = ACCENT_COLORS[accentColor] ?? "#0ea5e9";

    // ── ACTIVE TAB ──
    const [activeTab, setActiveTab] = useState<
        "pulse" | "archives" | "forge" | "entities" | "customizer"
    >("pulse");

    // ── LIVE METRICS (real from Supabase) ──
    const [mrr, setMrr] = useState(initialMrr);
    const [churn] = useState(initialChurn);
    const [signups] = useState(initialSignups);
    const [mrrSparkline, setMrrSparkline] = useState<{ month: string; mrr: number }[]>([]);
    const [metricsLoading, setMetricsLoading] = useState(true);

    // ── WHY FEED STATE ──
    const [whyFeed, setWhyFeed] = useState<WhyFeedItem[]>([]);
    const [feedLoading, setFeedLoading] = useState(false);
    const [feedError, setFeedError] = useState(false);

    // ── TICKERS ──
    const [tickers, setTickers] = useState<Ticker[]>([
        { symbol: "SPY", price: null, change: null },
        { symbol: "NVDA", price: null, change: null },
        { symbol: "BTC", price: null, change: null },
    ]);

    // ── ARCHIVES STATE ──
    const [snapshots, setSnapshots] = useState<ForensicSnapshot[]>(initialSnapshots);
    const [sealLabel, setSealLabel] = useState("");
    const [sealing, setSealing] = useState(false);
    const [sealSuccess, setSealSuccess] = useState(false);

    // ── FORGE STATE ──
    const [shocks, setShocks] = useState<Record<string, number>>({
        nasdaq_drop: 0, ai_regulation: 0, inflation: 0, vc_freeze: 0, rate_hike: 0,
    });
    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [simLoading, setSimLoading] = useState(false);

    // ── ENTITIES STATE ──
    const [entities, setEntities] = useState<BusinessEntity[]>(initialEntities);
    const [newEntity, setNewEntity] = useState({ name: "", type: "product" });
    const [scoringId, setScoringId] = useState<string | null>(null);
    const [addingEntity, setAddingEntity] = useState(false);

    // ── CUSTOMIZER STATE ──
    const [persona, setPersona] = useState<string>(briefingSettings?.persona ?? "balanced");
    const [frequency, setFrequency] = useState<string>(briefingSettings?.frequency ?? "daily");
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    // ── FETCH REAL MRR FROM SUPABASE ─────────────────────────────────────────
    useEffect(() => {
        async function fetchMetrics() {
            setMetricsLoading(true);
            try {
                const { data } = await supabase
                    .from("transactions")
                    .select("amount, status, created_at")
                    .order("created_at", { ascending: true });

                if (data && data.length > 0) {
                    const completed = data; // use all rows regardless of status

                    // Group by month chronologically
                    const monthMap: Record<string, { total: number; date: Date }> = {};
                    completed.forEach(t => {
                        const d = new Date(t.created_at);
                        const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                        if (!monthMap[key]) monthMap[key] = { total: 0, date: d };
                        monthMap[key].total += t.amount ?? 0;
                    });

                    // Sort chronologically
                    const sparkline = Object.entries(monthMap)
                        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
                        .map(([key, val]) => ({
                            month: key.split(" ")[0], // "Mar", "Apr", "May"
                            mrr: Math.round(val.total),
                        }));

                    setMrrSparkline(sparkline);

                    // Current month only for the big number
                    const now = new Date();
                    const currentMonthKey = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                    const currentMrr = monthMap[currentMonthKey]?.total ?? 0;
                    setMrr(Math.round(currentMrr));

                } else {
                    setMrrSparkline(generateMockSparkline(initialMrr));
                }
            } catch {
                setMrrSparkline(generateMockSparkline(initialMrr));
            } finally {
                setMetricsLoading(false);
            }
        }
        fetchMetrics();
    }, [initialMrr]);

    function generateMockSparkline(baseMrr: number) {
        return Array.from({ length: 12 }, (_, i) => ({
            month: `M${i + 1}`,
            mrr: Math.round(baseMrr * (0.7 + (i / 12) * 0.35) + (Math.random() - 0.5) * baseMrr * 0.1),
        }));
    }

    // ── FETCH TICKERS ─────────────────────────────────────────────────────────
    const fetchTickers = useCallback(async () => {
        const AV_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
        const symbols = ["SPY", "NVDA", "BTC"];

        const results = await Promise.allSettled(
            symbols.map(async (symbol) => {
                const ticker = symbol === "BTC" ? "BTC" : symbol;
                const endpoint = symbol === "BTC"
                    ? `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=BTC&to_currency=USD&apikey=${AV_KEY}`
                    : `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`;

                const res = await fetch(endpoint);
                const data = await res.json();
                console.log(symbol, JSON.stringify(data));

                if (symbol === "BTC") {
                    const rate = data["Realtime Currency Exchange Rate"];
                    const price = parseFloat(rate?.["5. Exchange Rate"] ?? "0");
                    return { symbol, price, change: 0 };
                } else {
                    const quote = data["Global Quote"];
                    const price = parseFloat(quote?.["05. price"] ?? "0");
                    const change = parseFloat(quote?.["10. change percent"]?.replace("%", "") ?? "0");
                    return { symbol, price, change };
                }
            })
        );

        const updated = results.map((r, i) =>
            r.status === "fulfilled" && r.value.price > 0
                ? r.value
                : tickers[i]
        );
        setTickers(updated);
    }, []);

    // ── FETCH WHY FEED ─────────────────────────────────────────────────────────
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
                    mrr, churn, persona,
                    marketData: {
                        SPY: tickers.find(t => t.symbol === "SPY"),
                        NVDA: tickers.find(t => t.symbol === "NVDA"),
                        BTC: tickers.find(t => t.symbol === "BTC"),
                    },
                }),
            });
            const data = await res.json();
            if (data.feed?.length) {
                // Check for AI unavailable
                const hasError = data.feed.some((f: WhyFeedItem) =>
                    f.snippet?.toLowerCase().includes("ai unavailable")
                );
                if (hasError) { setFeedError(true); setWhyFeed([]); }
                else setWhyFeed(data.feed);
            } else {
                setFeedError(true);
            }
        } catch {
            setFeedError(true);
        } finally {
            setFeedLoading(false);
        }
    }, [mrr, churn, persona]);

    useEffect(() => {
        fetchTickers();
        fetchWhyFeed();
        const interval = setInterval(fetchTickers, 300000);
        return () => clearInterval(interval);
    }, [fetchTickers, fetchWhyFeed]);

    // ── SEAL SNAPSHOT ─────────────────────────────────────────────────────────
    const handleSeal = async () => {
        if (!sealLabel.trim() || isReadOnly) return;
        setSealing(true);
        try {
            const res = await fetch("/api/workspace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "seal-snapshot",
                    label: sealLabel, mrr, churn, signups,
                    userId,
                    marketConditions: {
                        spy: tickers.find(t => t.symbol === "SPY")?.price ?? 0,
                        nvda: tickers.find(t => t.symbol === "NVDA")?.price ?? 0,
                        btc: tickers.find(t => t.symbol === "BTC")?.price ?? 0,
                    },
                    persona,
                }),
            });
            const data = await res.json();
            if (data.snapshot) {
                setSnapshots(prev => [data.snapshot, ...prev]);
                setSealLabel("");
                setSealSuccess(true);
                setTimeout(() => setSealSuccess(false), 3000);
            }
        } catch { /* silent */ } finally {
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
                    action: "simulate", shocks, mrr,
                    burn: Math.round(mrr * 0.6),
                    subscribers: Math.round(mrr / 49),
                    persona,
                }),
            });
            const data = await res.json();
            if (data.simulation) setSimulation(data.simulation);
        } catch { /* silent */ } finally {
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
                .select().single();
            if (!error && data) {
                setEntities(prev => [data, ...prev]);
                setNewEntity({ name: "", type: "product" });
                scoreEntity(data);
            }
        } catch { /* silent */ } finally {
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
                        spy_change: tickers.find(t => t.symbol === "SPY")?.change ?? 0,
                        volatility: 18.5, rate_environment: "rising",
                    },
                }),
            });
            const data = await res.json();
            const score = data.scores?.[0];
            if (score) {
                await supabase.from("business_entities")
                    .update({ sensitivity_score: score.score, last_scored_at: new Date().toISOString() })
                    .eq("id", entity.id);
                setEntities(prev =>
                    prev.map(e => e.id === entity.id ? { ...e, sensitivity_score: score.score } : e)
                );
            }
        } catch { /* silent */ } finally {
            setScoringId(null);
        }
    };

    const deleteEntity = async (id: string) => {
        if (isReadOnly) return;
        await supabase.from("business_entities").delete().eq("id", id);
        setEntities(prev => prev.filter(e => e.id !== id));
    };

    // ── SAVE SETTINGS ─────────────────────────────────────────────────────────
    const saveSettings = async () => {
        if (isReadOnly) return;
        setSavingSettings(true);
        try {
            await supabase.from("briefing_settings").upsert({
                user_id: userId, persona, frequency, updated_at: new Date().toISOString(),
            });
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 3000);
        } catch { /* silent */ } finally {
            setSavingSettings(false);
        }
    };

    // ── HELPERS ───────────────────────────────────────────────────────────────
    const impactColor = (type: string, delta: number) => {
        if (type === "opportunity" || delta > 0) return "#10b981";
        if (type === "risk" || type === "churn") return "#f43f5e";
        return "#f59e0b";
    };

    const riskLevelColor = (level: string) => ({
        LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#f43f5e",
    }[level] ?? "#94a3b8");

    const sensitivityColor = (score: number) => {
        if (score >= 75) return "#f43f5e";
        if (score >= 50) return "#f97316";
        if (score >= 25) return "#f59e0b";
        return "#10b981";
    };

    const tabs = [
        { id: "pulse", label: "Strategic Pulse", icon: "⚡" },
        { id: "archives", label: "Intelligence Archives", icon: "🔒" },
        { id: "forge", label: "What-If Forge", icon: "🔥" },
        { id: "entities", label: "Asset Registry", icon: "🗺️" },
        { id: "customizer", label: "CEO Briefing", icon: "🎯" },
    ] as const;

    // ── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(135deg, #050a15 0%, #080f1e 50%, #060c18 100%)",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
        >
            {/* Read-Only Banner */}
            <AnimatePresence>
                {isReadOnly && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-2 px-4"
                        style={{ background: "#78350f", borderBottom: "1px solid #f59e0b" }}
                    >
                        <span className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">
                            🔒 READ-ONLY FORENSIC ACCESS — ARCHIVE INTEGRITY ACTIVE
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`max-w-7xl mx-auto px-4 py-6 ${isReadOnly ? "pt-14" : ""}`}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full"
                                style={{ background: `linear-gradient(to bottom, ${accent}, transparent)` }} />
                            <div>
                                <h1 className="text-2xl font-black tracking-tight" style={{ color: accent }}>
                                    STRATEGIC WAR ROOM
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {profile?.full_name ?? userEmail} · {persona.toUpperCase()} MODE
                                </p>
                            </div>
                        </div>
                        {/* Live Tickers */}
                        <div className="hidden md:flex items-center gap-4">
                            {tickers.map(t => (
                                <div key={t.symbol} className="flex items-center gap-2 px-3 py-1.5 rounded"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <span className="text-xs text-slate-400 font-bold">{t.symbol}</span>
                                    <span className="text-xs text-white font-mono">
                                        {t.price != null ? `$${t.price.toFixed(2)}` : "—"}
                                    </span>
                                    {t.change != null && (
                                        <span className="text-xs font-bold"
                                            style={{ color: t.change >= 0 ? "#10b981" : "#f43f5e" }}>
                                            {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-px w-full mt-4"
                        style={{ background: `linear-gradient(to right, transparent, ${accent}40, transparent)` }} />
                </motion.div>

                {/* Tab Bar */}
                <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold whitespace-nowrap transition-all"
                            style={{
                                background: activeTab === tab.id ? `${accent}20` : "rgba(255,255,255,0.03)",
                                border: `1px solid ${activeTab === tab.id ? accent + "60" : "rgba(255,255,255,0.06)"}`,
                                color: activeTab === tab.id ? accent : "#64748b",
                            }}>
                            <span>{tab.icon}</span>
                            <span className="hidden sm:block">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">

                    {/* ── STRATEGIC PULSE ──────────────────────────────────────────── */}
                    {activeTab === "pulse" && (
                        <motion.div key="pulse"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            {/* Internal Revenue Panel */}
                            <div className="rounded-xl p-5"
                                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}30`, boxShadow: `0 0 30px ${accent}08` }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Internal Revenue</p>
                                        {metricsLoading ? (
                                            <motion.div className="h-9 w-40 rounded"
                                                animate={{ opacity: [0.3, 0.7, 0.3] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                style={{ background: "rgba(255,255,255,0.06)" }} />
                                        ) : (
                                            <p className="text-3xl font-black text-white">
                                                ${mrr.toLocaleString()}
                                                <span className="text-sm text-slate-500 ml-2 font-normal">/mo</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Churn</p>
                                        <p className="text-lg font-bold" style={{ color: churn < 3 ? "#10b981" : "#f43f5e" }}>
                                            {churn}%
                                        </p>
                                    </div>
                                </div>

                                <div className="h-40">
                                    {metricsLoading ? (
                                        <div className="h-full flex items-end gap-1 px-2">
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <motion.div key={i} className="flex-1 rounded-t"
                                                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                                                    style={{
                                                        height: `${30 + Math.random() * 60}%`,
                                                        background: `${accent}30`,
                                                    }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={mrrSparkline}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ background: "#080f1e", border: `1px solid ${accent}40`, borderRadius: 6, fontSize: 11, color: "#e2e8f0" }}
                                                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="mrr"
                                                    stroke="#38bdf8"
                                                    strokeWidth={3}
                                                    fill="url(#colorRevenue)"
                                                    dot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
                                                    activeDot={{ r: 6, strokeWidth: 0, fill: "#38bdf8" }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    {[
                                        { label: "New Signups", value: signups, color: "#10b981" },
                                        { label: "Subscribers", value: Math.round(mrr / 49), color: accent },
                                    ].map(m => (
                                        <div key={m.label} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                                            <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                                            <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Why Feed Panel */}
                            <div className="rounded-xl p-5 flex flex-col"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Intelligence Feed</p>
                                        <p className="text-sm font-bold text-white">Why Your Numbers Are Moving</p>
                                    </div>
                                    <button onClick={fetchWhyFeed} disabled={feedLoading}
                                        className="px-3 py-1.5 rounded text-xs font-bold transition-all"
                                        style={{
                                            background: feedLoading ? "rgba(255,255,255,0.05)" : `${accent}20`,
                                            border: `1px solid ${accent}40`, color: accent,
                                        }}>
                                        {feedLoading ? "⟳ Analyzing..." : "↺ Refresh"}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1 custom-scroll">
                                    {/* Loading skeleton */}
                                    {feedLoading && <FeedSkeleton accent={accent} />}

                                    {/* Error state */}
                                    {!feedLoading && feedError && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                                            <p className="text-2xl">⚠️</p>
                                            <p className="text-xs text-amber-400 font-bold">Intelligence Forge Offline</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                Market signals detected, but intelligence forge is offline. Check API keys.
                                            </p>
                                            <button onClick={fetchWhyFeed}
                                                className="mt-2 px-4 py-1.5 rounded text-xs font-bold transition-all"
                                                style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent }}>
                                                Retry
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Feed items */}
                                    {!feedLoading && !feedError && whyFeed.map((item, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            className="p-3 rounded-lg"
                                            style={{
                                                background: "rgba(255,255,255,0.025)",
                                                border: `1px solid ${impactColor(item.impact_type, item.impact_delta)}25`,
                                                borderLeft: `3px solid ${impactColor(item.impact_type, item.impact_delta)}`,
                                            }}>
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="text-xs text-slate-400 line-clamp-1">{item.headline}</p>
                                                <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                                                    style={{
                                                        background: `${impactColor(item.impact_type, item.impact_delta)}20`,
                                                        color: impactColor(item.impact_type, item.impact_delta),
                                                    }}>
                                                    {(item.impact_delta ?? 0) > 0 ? "+" : ""}{(item.impact_delta ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-200 leading-relaxed">{item.snippet}</p>
                                            <p className="text-xs text-slate-600 mt-1">{item.source} · {item.impact_type.toUpperCase()}</p>
                                        </motion.div>
                                    ))}

                                    {/* Empty state */}
                                    {!feedLoading && !feedError && whyFeed.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                                            <p className="text-slate-600 text-sm">No intelligence yet.</p>
                                            <button onClick={fetchWhyFeed} className="text-xs underline" style={{ color: accent }}>
                                                Generate Feed
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── INTELLIGENCE ARCHIVES ────────────────────────────────────── */}
                    {activeTab === "archives" && (
                        <motion.div key="archives"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            {!isReadOnly && (
                                <div className="rounded-xl p-5 mb-6"
                                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}30` }}>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">🔒 Seal Forensic Snapshot</p>
                                    <div className="flex gap-3">
                                        <input value={sealLabel} onChange={e => setSealLabel(e.target.value)}
                                            placeholder="Decision label (e.g. 'Launched EU Campaign')"
                                            className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                                            onKeyDown={e => e.key === "Enter" && handleSeal()} />
                                        <button onClick={handleSeal} disabled={sealing || !sealLabel.trim()}
                                            className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                                            style={{
                                                background: sealSuccess ? "#10b981" : sealing ? `${accent}40` : accent,
                                                color: "#000", opacity: !sealLabel.trim() ? 0.4 : 1,
                                            }}>
                                            {sealSuccess ? "✓ Sealed" : sealing ? "Sealing..." : "Seal Snapshot"}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2">
                                        Captures: internal metrics + market conditions + AI advice → SHA-256 hash
                                    </p>
                                </div>
                            )}

                            {snapshots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <p className="text-4xl">🔒</p>
                                    <p className="text-slate-500 text-sm">No forensic snapshots sealed yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {snapshots.map((snap, i) => (
                                        <motion.div key={snap.id}
                                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="rounded-xl p-4"
                                            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{snap.label}</p>
                                                    <p className="text-xs text-slate-600 mt-0.5">
                                                        {new Date(snap.created_at).toLocaleDateString("en-US", {
                                                            month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                                <span className="text-xs px-2 py-0.5 rounded font-bold"
                                                    style={{ background: `${accent}20`, color: accent }}>{snap.persona}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {[
                                                    { label: "MRR", value: `$${snap.mrr.toLocaleString()}` },
                                                    { label: "Churn", value: `${snap.churn}%` },
                                                    { label: "Signups", value: snap.signups },
                                                ].map(m => (
                                                    <div key={m.label} className="text-center p-2 rounded"
                                                        style={{ background: "rgba(255,255,255,0.03)" }}>
                                                        <p className="text-xs text-slate-500">{m.label}</p>
                                                        <p className="text-sm font-bold text-white">{m.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 rounded-lg mb-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{snap.ai_advice}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 px-2 py-1 rounded font-mono text-xs text-slate-600 truncate"
                                                    style={{ background: "rgba(0,0,0,0.3)" }}>
                                                    #{snap.hash.slice(0, 20)}...
                                                </div>
                                                <span className="text-green-500 text-xs">✓ SEALED</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── WHAT-IF FORGE ────────────────────────────────────────────── */}
                    {activeTab === "forge" && (
                        <motion.div key="forge"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="rounded-xl p-5"
                                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}30` }}>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-5">🔥 Macro Shock Simulator</p>
                                <div className="space-y-5">
                                    {SHOCK_PRESETS.map(preset => (
                                        <div key={preset.key}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-slate-300">{preset.icon} {preset.label}</span>
                                                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                                                    style={{
                                                        background: shocks[preset.key] !== 0 ? `${accent}20` : "rgba(255,255,255,0.05)",
                                                        color: shocks[preset.key] !== 0 ? accent : "#475569",
                                                    }}>
                                                    {shocks[preset.key] > 0 ? "+" : ""}{shocks[preset.key].toFixed(1)}
                                                    {preset.key === "rate_hike" ? "%" : preset.key === "ai_regulation" ? " law" : "%"}
                                                </span>
                                            </div>
                                            <input type="range" min={0} max={Math.abs(preset.value) * 2}
                                                step={preset.key === "rate_hike" ? 0.25 : 1}
                                                value={shocks[preset.key]}
                                                onChange={e => setShocks(prev => ({ ...prev, [preset.key]: parseFloat(e.target.value) }))}
                                                className="w-full h-1.5 rounded appearance-none cursor-pointer"
                                                style={{ accentColor: accent }} />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={runSimulation} disabled={simLoading}
                                    className="w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all"
                                    style={{
                                        background: simLoading ? `${accent}40` : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                        color: "#000", boxShadow: simLoading ? "none" : `0 4px 20px ${accent}40`,
                                    }}>
                                    {simLoading ? "⟳ Forging Scenario..." : "⚡ Run Simulation"}
                                </button>
                                <button onClick={() => { setShocks({ nasdaq_drop: 0, ai_regulation: 0, inflation: 0, vc_freeze: 0, rate_hike: 0 }); setSimulation(null); }}
                                    className="w-full mt-2 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                                    Reset All Shocks
                                </button>
                            </div>

                            <div className="rounded-xl p-5"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-5">📊 Projected Impact</p>
                                {!simulation && !simLoading && (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <p className="text-4xl">🔮</p>
                                        <p className="text-slate-500 text-sm text-center">Apply shocks and run simulation</p>
                                    </div>
                                )}
                                {simLoading && (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                                            style={{ borderColor: accent }} />
                                        <p className="text-slate-500 text-sm">AI projecting scenario...</p>
                                    </div>
                                )}
                                {simulation && !simLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Risk Level</span>
                                            <span className="text-sm font-black px-3 py-1 rounded font-mono"
                                                style={{
                                                    background: `${riskLevelColor(simulation.risk_level)}20`,
                                                    color: riskLevelColor(simulation.risk_level),
                                                    border: `1px solid ${riskLevelColor(simulation.risk_level)}40`,
                                                }}>
                                                {simulation.risk_level}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: "MRR Impact", value: simulation.mrr_delta_pct, suffix: "%" },
                                                { label: "Burn Change", value: simulation.burn_delta_pct, suffix: "%" },
                                                { label: "Sub Change", value: simulation.subscriber_delta_pct, suffix: "%" },
                                            ].map(m => (
                                                <div key={m.label} className="p-3 rounded-lg text-center"
                                                    style={{ background: "rgba(255,255,255,0.03)" }}>
                                                    <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                                                    <p className="text-xl font-black"
                                                        style={{ color: m.value >= 0 ? "#10b981" : "#f43f5e" }}>
                                                        {m.value >= 0 ? "+" : ""}{m.value.toFixed(1)}{m.suffix}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg"
                                            style={{ background: "rgba(255,255,255,0.03)" }}>
                                            <span className="text-sm text-slate-400">Projected Runway</span>
                                            <span className="text-sm font-bold text-white">{simulation.runway_months} months</span>
                                        </div>
                                        <div className="p-4 rounded-lg"
                                            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}20` }}>
                                            <p className="text-xs text-slate-500 mb-2 font-bold">EXECUTIVE SUMMARY</p>
                                            <p className="text-xs text-slate-300 leading-relaxed">{simulation.summary}</p>
                                        </div>
                                        <div className="p-4 rounded-lg"
                                            style={{ background: `${accent}08`, border: `1px solid ${accent}30` }}>
                                            <p className="text-xs font-black mb-2" style={{ color: accent }}>⚔️ COUNTER-FORGE STRATEGY</p>
                                            <p className="text-xs text-slate-300 leading-relaxed">{simulation.counter_forge}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── ENTITY REGISTRY ──────────────────────────────────────────── */}
                    {activeTab === "entities" && (
                        <motion.div key="entities"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            {!isReadOnly && (
                                <div className="rounded-xl p-5 mb-6"
                                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}30` }}>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">🗺️ Register Business Node</p>
                                    <div className="flex gap-3">
                                        <input value={newEntity.name} onChange={e => setNewEntity(p => ({ ...p, name: e.target.value }))}
                                            placeholder="Entity name (e.g. Product A, EU Region)"
                                            className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
                                        <select value={newEntity.type} onChange={e => setNewEntity(p => ({ ...p, type: e.target.value }))}
                                            className="px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                            {["product", "region", "tier", "custom"].map(t => (
                                                <option key={t} value={t} style={{ background: "#080f1e" }}>
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                        <button onClick={addEntity} disabled={addingEntity || !newEntity.name.trim()}
                                            className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                                            style={{ background: addingEntity ? `${accent}40` : accent, color: "#000", opacity: !newEntity.name.trim() ? 0.4 : 1 }}>
                                            {addingEntity ? "Adding..." : "+ Add"}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {entities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <p className="text-4xl">🗺️</p>
                                    <p className="text-slate-500 text-sm">No business nodes registered.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {entities.map((entity, i) => {
                                        const score = entity.sensitivity_score ?? 0;
                                        return (
                                            <motion.div key={entity.id}
                                                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="rounded-xl p-4"
                                                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{entity.name}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5 capitalize">{entity.type}</p>
                                                    </div>
                                                    {!isReadOnly && (
                                                        <button onClick={() => deleteEntity(entity.id)}
                                                            className="text-slate-700 hover:text-rose-500 text-xs transition-colors">✕</button>
                                                    )}
                                                </div>
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs text-slate-500">Market Sensitivity</span>
                                                        {scoringId === entity.id ? (
                                                            <span className="text-xs text-slate-600">Scoring...</span>
                                                        ) : (
                                                            <span className="text-sm font-black" style={{ color: sensitivityColor(score) }}>
                                                                {score.toFixed(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
                                                            transition={{ duration: 0.8, delay: i * 0.1 }}
                                                            className="h-full rounded-full" style={{ background: sensitivityColor(score) }} />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-slate-700 mt-1">
                                                        <span>Resilient</span><span>Volatile</span>
                                                    </div>
                                                </div>
                                                {!isReadOnly && (
                                                    <button onClick={() => scoreEntity(entity)} disabled={scoringId === entity.id}
                                                        className="w-full py-1.5 rounded text-xs font-bold transition-all"
                                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                                                        {scoringId === entity.id ? "⟳ Scoring..." : "↺ Rescore"}
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── CEO BRIEFING CUSTOMIZER ──────────────────────────────────── */}
                    {activeTab === "customizer" && (
                        <motion.div key="customizer"
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="max-w-2xl mx-auto space-y-6">
                            <div className="rounded-xl p-5"
                                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}30` }}>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">🎯 Consultant Persona</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: "defensive", label: "Risk Defensive", icon: "🛡️", desc: "Focus on threats & mitigation" },
                                        { id: "balanced", label: "Balanced", icon: "⚖️", desc: "Holistic strategic view" },
                                        { id: "aggressive", label: "Growth Aggressive", icon: "🚀", desc: "Maximize growth opportunities" },
                                    ].map(p => (
                                        <button key={p.id} onClick={() => !isReadOnly && setPersona(p.id)}
                                            className="p-4 rounded-xl text-center transition-all"
                                            style={{
                                                background: persona === p.id ? `${accent}15` : "rgba(255,255,255,0.03)",
                                                border: `1px solid ${persona === p.id ? accent + "60" : "rgba(255,255,255,0.06)"}`,
                                                boxShadow: persona === p.id ? `0 0 20px ${accent}15` : "none",
                                                cursor: isReadOnly ? "not-allowed" : "pointer",
                                            }}>
                                            <p className="text-2xl mb-2">{p.icon}</p>
                                            <p className="text-xs font-bold mb-1" style={{ color: persona === p.id ? accent : "#94a3b8" }}>{p.label}</p>
                                            <p className="text-xs text-slate-600">{p.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl p-5"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">📅 Briefing Frequency</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: "daily", label: "Daily Forensic Summary", icon: "📆" },
                                        { id: "weekly", label: "Weekly Intelligence Report", icon: "📋" },
                                    ].map(f => (
                                        <button key={f.id} onClick={() => !isReadOnly && setFrequency(f.id)}
                                            className="p-4 rounded-xl text-left transition-all"
                                            style={{
                                                background: frequency === f.id ? `${accent}15` : "rgba(255,255,255,0.03)",
                                                border: `1px solid ${frequency === f.id ? accent + "60" : "rgba(255,255,255,0.06)"}`,
                                                cursor: isReadOnly ? "not-allowed" : "pointer",
                                            }}>
                                            <p className="text-xl mb-2">{f.icon}</p>
                                            <p className="text-sm font-bold" style={{ color: frequency === f.id ? accent : "#94a3b8" }}>{f.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl p-5" style={{ background: `${accent}08`, border: `1px solid ${accent}25` }}>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Preview — Current Config</p>
                                <div className="space-y-2">
                                    {[
                                        { label: "Persona", value: persona.charAt(0).toUpperCase() + persona.slice(1) },
                                        { label: "Delivery", value: frequency.charAt(0).toUpperCase() + frequency.slice(1) },
                                        { label: "MRR Tracked", value: `$${mrr.toLocaleString()}` },
                                        { label: "Entities Monitored", value: entities.length },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">{row.label}</span>
                                            <span className="text-xs font-bold text-white">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!isReadOnly && (
                                <button onClick={saveSettings} disabled={savingSettings}
                                    className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                                    style={{
                                        background: settingsSaved ? "#10b981" : savingSettings ? `${accent}40` : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                        color: "#000",
                                        boxShadow: settingsSaved || savingSettings ? "none" : `0 4px 20px ${accent}40`,
                                    }}>
                                    {settingsSaved ? "✓ Settings Saved" : savingSettings ? "Saving..." : "Save Briefing Settings"}
                                </button>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        input[type="range"]::-webkit-slider-thumb { cursor: pointer; }
      `}</style>
        </div>
    );
}