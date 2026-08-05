"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Globe,
  Brain,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Link,
  Link2Off,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Shield,
  Clock,
  ChevronDown,
  Snowflake,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { RoleGuard } from "@/components/common/RoleGuard";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ActivityEvent {
  timestamp: string;
  message: string;
  severity: "success" | "warning" | "critical";
}

interface ConflictReport {
  sourceA: string;
  sourceB: string;
  delta: number;
  detectedAt: string;
}

interface UsageTracker {
  tokensUsed: number;
  tokenLimit: number;
  costUSD: number;
  resetDate: string;
}

interface DataSourceConnector {
  id: string;
  name: string;
  type: "database" | "market" | "news" | "ai";
  status: "connected" | "error" | "syncing" | "disconnected";
  healthScore: number;
  latencyMs: number;
  lastSync: string;
  aiContextEnabled: boolean;
  apiKeyMasked: string;
  recordCount: number;
  frozen: boolean;
  frozenAt: string | null;
  events: ActivityEvent[];
  conflicted: boolean;
  usage?: UsageTracker;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const nowStr = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const DEFAULT_USAGE: Record<string, UsageTracker> = {
  groq: {
    tokensUsed: 2847,
    tokenLimit: 10000,
    costUSD: 0.0043,
    resetDate: "2026-06-01",
  },
  alphavantage: {
    tokensUsed: 312,
    tokenLimit: 500,
    costUSD: 0.0,
    resetDate: "2026-06-01",
  },
};

const INITIAL_SOURCES: DataSourceConnector[] = [
  {
    id: "supabase",
    name: "Supabase DB",
    type: "database",
    status: "connected",
    healthScore: 94,
    latencyMs: 42,
    lastSync: "12s ago",
    aiContextEnabled: true,
    apiKeyMasked: "sbp_••••••••••••••••••••••••••••••••",
    recordCount: 1240,
    frozen: false,
    frozenAt: null,
    conflicted: false,
    events: [
      {
        timestamp: nowStr(),
        message: "Sync completed — 1,240 records verified",
        severity: "success",
      },
      {
        timestamp: nowStr(),
        message: "Latency spike detected: 210ms peak",
        severity: "warning",
      },
      {
        timestamp: nowStr(),
        message: "AI context enabled for this source",
        severity: "success",
      },
    ],
  },
  {
    id: "alphavantage",
    name: "Alpha Vantage",
    type: "market",
    status: "connected",
    healthScore: 78,
    latencyMs: 310,
    lastSync: "4m ago",
    aiContextEnabled: true,
    apiKeyMasked: "AV••••••••••••••••",
    recordCount: 0,
    frozen: false,
    frozenAt: null,
    conflicted: false,
    usage: DEFAULT_USAGE.alphavantage,
    events: [
      {
        timestamp: nowStr(),
        message: "Market quote fetched successfully",
        severity: "success",
      },
      {
        timestamp: nowStr(),
        message: "Rate limit warning — 4/5 calls used",
        severity: "warning",
      },
    ],
  },
  {
    id: "newsapi",
    name: "NewsAPI",
    type: "news",
    status: "connected",
    healthScore: 85,
    latencyMs: 190,
    lastSync: "2m ago",
    aiContextEnabled: false,
    apiKeyMasked: "nap_••••••••••••••••••••••••••",
    recordCount: 0,
    frozen: false,
    frozenAt: null,
    conflicted: false,
    events: [
      {
        timestamp: nowStr(),
        message: "12 business headlines ingested",
        severity: "success",
      },
      {
        timestamp: nowStr(),
        message: "AI context disabled for this source",
        severity: "warning",
      },
    ],
  },
  {
    id: "groq",
    name: "Groq AI",
    type: "ai",
    status: "connected",
    healthScore: 91,
    latencyMs: 88,
    lastSync: "31s ago",
    aiContextEnabled: true,
    apiKeyMasked: "gsk_••••••••••••••••••••••••••••••••••••",
    recordCount: 0,
    frozen: false,
    frozenAt: null,
    conflicted: false,
    usage: DEFAULT_USAGE.groq,
    events: [
      {
        timestamp: nowStr(),
        message: "Chat response generated — 847 tokens used",
        severity: "success",
      },
      {
        timestamp: nowStr(),
        message: "Llama 3.1-8b response time: 88ms",
        severity: "success",
      },
      {
        timestamp: nowStr(),
        message: "Context window 72% utilized",
        severity: "warning",
      },
    ],
  },
];

const TYPE_META: Record<
  DataSourceConnector["type"],
  { icon: React.ElementType; label: string }
> = {
  database: { icon: Database, label: "Database" },
  market: { icon: TrendingUp, label: "Market Data" },
  news: { icon: Globe, label: "News" },
  ai: { icon: Brain, label: "AI Engine" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

const statusColor = (v: number) =>
  v > 85 ? "var(--danger)" : v > 60 ? "var(--warning)" : "var(--success)";
const statusLabel = (v: number) =>
  v > 85 ? "Critical" : v > 60 ? "Warning" : "Healthy";

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthRing({
  score,
  latencyMs,
  status,
}: {
  score: number;
  latencyMs: number;
  status: DataSourceConnector["status"];
}) {
  const r = 22,
    circ = 2 * Math.PI * r,
    fill = (score / 100) * circ;

  const isError = status === "error";
  const isHighLatency = latencyMs > 300;
  const isOptimal = score > 80;

  const color = isError
    ? "var(--danger)"
    : isHighLatency
      ? "var(--warning)"
      : isOptimal
        ? "var(--success)"
        : "var(--warning)";
  const label = isError
    ? "Error"
    : isHighLatency
      ? "High Latency"
      : isOptimal
        ? "Healthy"
        : "Warning";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="4"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - fill }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[12px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function PulseWaveform({
  status,
  frozen,
}: {
  status: DataSourceConnector["status"];
  frozen: boolean;
}) {
  const bars = [0.4, 0.7, 1.0, 0.6, 0.85];
  const active = status === "connected" && !frozen;
  const errored = status === "error";
  const color = errored
    ? "var(--danger)"
    : frozen
      ? "var(--warning)"
      : "var(--success)";

  if (frozen) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-xl"
        style={{ background: "var(--warning-bg)" }}
      >
        <Snowflake size={9} style={{ color: "var(--warning)" }} />
        <span
          className="text-[10px] font-medium"
          style={{ color: "var(--warning)" }}
        >
          Frozen
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-[3px] h-6">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ backgroundColor: color, height: `${h * 24}px` }}
          animate={
            active
              ? { scaleY: [1, h * 1.5, 0.3, 1], opacity: [0.7, 1, 0.5, 0.7] }
              : { scaleY: 0.1, opacity: 0.2 }
          }
          transition={
            active
              ? {
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
}

function ApiKeyDisplay({ masked }: { masked: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl w-full"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
      }}
    >
      <Lock size={11} style={{ color: "var(--text-muted)" }} />
      <span
        className="text-[12px] flex-1 truncate"
        style={{ color: "var(--text-secondary)" }}
      >
        {revealed ? masked.replace(/•/g, "*") : masked}
      </span>
      <button
        onClick={() => setRevealed((p) => !p)}
        style={{ color: "var(--text-muted)" }}
        className="transition-colors"
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

// ── Activity Log ──────────────────────────────────────────────────────────────

function ActivityLog({ events }: { events: ActivityEvent[] }) {
  const [open, setOpen] = useState(false);
  const sevColor = (s: ActivityEvent["severity"]) =>
    s === "success"
      ? "var(--success)"
      : s === "warning"
        ? "var(--warning)"
        : "var(--danger)";
  const sevBg = (s: ActivityEvent["severity"]) =>
    s === "success"
      ? "var(--success-bg)"
      : s === "warning"
        ? "var(--warning-bg)"
        : "var(--danger-bg)";

  return (
    <div
      className="mt-3 border-t pt-3"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between w-full text-left"
      >
        <span
          className="text-[11px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Activity Log · {events.length} entries
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {events.slice(0, 5).map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 px-2.5 py-1.5 rounded-xl text-[11px]"
                  style={{
                    background: sevBg(ev.severity),
                    color: sevColor(ev.severity),
                  }}
                >
                  <span className="opacity-60 shrink-0">{ev.timestamp}</span>
                  <span className="font-medium leading-snug">{ev.message}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Usage / Metric Bar (shared for API usage + operational metrics) ─────────

function MetricBar({
  icon,
  label,
  value,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div
      className="mt-3 pt-3 border-t"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span
            className="text-[11px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-xl"
          style={{
            color: statusColor(pct),
            background:
              pct > 85
                ? "var(--danger-bg)"
                : pct > 60
                  ? "var(--warning-bg)"
                  : "var(--success-bg)",
          }}
        >
          {statusLabel(pct)}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden mb-1.5"
        style={{ background: "var(--border)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: statusColor(pct) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-[11px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {value}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {pct}% utilized
        </span>
      </div>
    </div>
  );
}

// ─── Connector Card ───────────────────────────────────────────────────────────

function ConnectorCard({
  source,
  onToggleForge,
  onSync,
  onToggleFreeze,
}: {
  source: DataSourceConnector;
  onToggleForge: (id: string) => void;
  onSync: (id: string) => void;
  onToggleFreeze: (id: string) => void;
}) {
  const meta = TYPE_META[source.type];
  const Icon = meta.icon;
  const syncing = source.status === "syncing";

  return (
    <motion.div
      className="relative rounded-xl p-5 h-full"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${source.conflicted ? "var(--danger)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: "var(--accent-subtle)" }}
          >
            <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {source.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {meta.label}
              </span>
              {source.recordCount > 0 && (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  · {source.recordCount.toLocaleString()} records
                </span>
              )}
              {source.frozen && source.frozenAt && (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--warning)" }}
                >
                  · Snapshot {source.frozenAt}
                </span>
              )}
            </div>
          </div>
        </div>
        <HealthRing
          score={source.healthScore}
          latencyMs={source.latencyMs}
          status={source.status}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          {
            icon: <Zap size={11} style={{ color: "var(--text-muted)" }} />,
            label: "Latency",
            value: `${source.latencyMs}ms`,
          },
          {
            icon: <Clock size={11} style={{ color: "var(--text-muted)" }} />,
            label: "Last Sync",
            value: source.lastSync,
          },
          {
            icon: <Activity size={11} style={{ color: "var(--text-muted)" }} />,
            label: "Activity",
            value: null,
          },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl p-2.5 text-center"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              {icon}
              <span
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
            {value ? (
              <span
                className="text-[12px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {value}
              </span>
            ) : (
              <div className="flex justify-center">
                <PulseWaveform status={source.status} frozen={source.frozen} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* API Key */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Shield size={11} style={{ color: "var(--text-muted)" }} />
          <span
            className="text-[11px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            API Key
          </span>
        </div>
        <ApiKeyDisplay masked={source.apiKeyMasked} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => onToggleForge(source.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors"
          style={
            source.aiContextEnabled
              ? { background: "var(--accent-subtle)", color: "var(--accent)" }
              : {
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }
          }
        >
          {source.aiContextEnabled ? (
            <Link size={12} />
          ) : (
            <Link2Off size={12} />
          )}
          {source.aiContextEnabled
            ? "Included in AI Context"
            : "Add to AI Context"}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFreeze(source.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors"
            style={
              source.frozen
                ? { background: "var(--warning-bg)", color: "var(--warning)" }
                : {
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }
            }
          >
            <Snowflake size={12} />
            {source.frozen ? "Unfreeze" : "Freeze"}
          </button>
          <button
            onClick={() => onSync(source.id)}
            disabled={syncing || source.frozen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing" : "Resync"}
          </button>
        </div>
      </div>

      {/* Usage */}
      {source.usage && (
        <MetricBar
          icon={<DollarSign size={11} style={{ color: "var(--text-muted)" }} />}
          label="API Usage"
          value={`${source.usage.tokensUsed.toLocaleString()} / ${source.usage.tokenLimit.toLocaleString()} tokens · $${source.usage.costUSD.toFixed(4)}`}
          pct={Math.min(
            100,
            (source.usage.tokensUsed / source.usage.tokenLimit) * 100,
          )}
        />
      )}

      {/* Operational metrics */}
      {source.id === "supabase" && (
        <MetricBar
          icon={<Activity size={11} style={{ color: "var(--text-muted)" }} />}
          label="Storage Usage"
          value="1,240 / 10,000 Records"
          pct={85}
        />
      )}
      {source.id === "newsapi" && (
        <MetricBar
          icon={<Activity size={11} style={{ color: "var(--text-muted)" }} />}
          label="Article Relevance"
          value="14 / 40 Articles Filtered"
          pct={65}
        />
      )}

      <ActivityLog events={source.events} />
    </motion.div>
  );
}

// ─── Conflict Banner ──────────────────────────────────────────────────────────

function ConflictBanner({ report }: { report: ConflictReport }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-5 py-3 rounded-xl mb-2"
      style={{
        background: "var(--danger-bg)",
        border: "1px solid var(--danger)",
      }}
    >
      <AlertTriangle
        size={14}
        style={{ color: "var(--danger)" }}
        className="shrink-0"
      />
      <span
        className="text-[12px] font-medium"
        style={{ color: "var(--danger)" }}
      >
        Data mismatch detected — {report.sourceA} vs {report.sourceB}: $
        {report.delta.toFixed(2)} difference
      </span>
      <span
        className="ml-auto text-[11px] shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        {report.detectedAt}
      </span>
    </motion.div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SourcesSummary({ sources }: { sources: DataSourceConnector[] }) {
  const linked = sources.filter((s) => s.aiContextEnabled).length;
  const frozen = sources.filter((s) => s.frozen).length;
  const avgHealth = Math.round(
    sources.reduce((a, s) => a + s.healthScore, 0) / sources.length,
  );
  const avgLatency = Math.round(
    sources.reduce((a, s) => a + s.latencyMs, 0) / sources.length,
  );
  const allOk = sources.every((s) => s.status === "connected");

  const stats = [
    {
      label: "AI Context",
      value: `${linked}/${sources.length}`,
      sub: "sources linked",
    },
    {
      label: "Avg Health",
      value: `${avgHealth}`,
      sub: "score",
      color:
        avgHealth >= 80
          ? "var(--success)"
          : avgHealth >= 60
            ? "var(--warning)"
            : "var(--danger)",
    },
    { label: "Avg Latency", value: `${avgLatency}ms`, sub: "pipeline speed" },
    {
      label: "Frozen",
      value: `${frozen}`,
      sub: "static sources",
      color: frozen > 0 ? "var(--warning)" : undefined,
    },
    {
      label: "Status",
      value: allOk ? "Healthy" : "Degraded",
      sub: "overall",
      color: allOk ? "var(--success)" : "var(--danger)",
    },
  ];

  return (
    <div
      id="sources-summary"
      className="rounded-xl px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {stats.map(({ label, value, sub, color }) => (
        <div key={label} className="text-center">
          <div
            className="text-[11px] font-medium mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </div>
          <div
            className="text-[20px] font-semibold"
            style={{ color: color ?? "var(--text-primary)" }}
          >
            {value}
          </div>
          <div
            className="text-[11px] mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function DataSourcesContent() {
  const [sources, setSources] =
    useState<DataSourceConnector[]>(INITIAL_SOURCES);
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [lastPolled, setLastPolled] = useState<Date>(new Date());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const aiLinks: Record<string, boolean> = loadLS(
      "insightforge_forge_links",
      {},
    );
    const frozenMap: Record<string, string | null> = loadLS(
      "insightforge_frozen",
      {},
    );
    const savedUsage: Record<string, UsageTracker> = loadLS(
      "insightforge_costs",
      {},
    );
    setSources((prev) =>
      prev.map((s) => ({
        ...s,
        aiContextEnabled: aiLinks[s.id] ?? s.aiContextEnabled,
        frozen: frozenMap[s.id] != null,
        frozenAt: frozenMap[s.id] ?? null,
        usage: savedUsage[s.id] ?? s.usage,
      })),
    );
  }, []);

  const poll = useCallback(() => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.frozen) return s;
        const hd = Math.round((Math.random() - 0.4) * 4);
        const newH = Math.min(100, Math.max(0, s.healthScore + hd));
        const newL = Math.max(
          20,
          s.latencyMs + Math.round((Math.random() - 0.5) * 40),
        );
        const ev: ActivityEvent = {
          timestamp: nowStr(),
          message:
            hd < -2
              ? "Health degradation detected"
              : newL > 400
                ? `Latency spike: ${newL}ms`
                : "Sync completed — all signals normal",
          severity: hd < -2 || newL > 400 ? "warning" : "success",
        };
        return {
          ...s,
          healthScore: newH,
          latencyMs: newL,
          lastSync: "just now",
          events: [ev, ...s.events].slice(0, 5),
        };
      }),
    );
    setLastPolled(new Date());
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(poll, 30_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [poll]);

  // Conflict detection
  useEffect(() => {
    const byType: Record<string, DataSourceConnector[]> = {};
    sources.forEach((s) => {
      byType[s.type] = [...(byType[s.type] ?? []), s];
    });
    const newConflicts: ConflictReport[] = [];
    Object.values(byType).forEach((group) => {
      if (group.length < 2) return;
      for (let i = 0; i < group.length - 1; i++) {
        const delta = Math.abs(group[i].latencyMs - group[i + 1].latencyMs);
        if (delta / Math.max(group[i].latencyMs, 1) > 0.005) {
          newConflicts.push({
            sourceA: group[i].name,
            sourceB: group[i + 1].name,
            delta: parseFloat((delta * 0.01).toFixed(2)),
            detectedAt: nowStr(),
          });
        }
      }
    });
    setSources((prev) =>
      prev.map((s) => {
        const inConflict = newConflicts.some(
          (c) => c.sourceA === s.name || c.sourceB === s.name,
        );
        return {
          ...s,
          conflicted: inConflict,
          healthScore: inConflict
            ? Math.max(0, s.healthScore - 15)
            : s.healthScore,
        };
      }),
    );
    setConflicts(newConflicts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.length]);

  const handleToggleForge = (id: string) => {
    setSources((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const linked = !s.aiContextEnabled;
        const ev: ActivityEvent = {
          timestamp: nowStr(),
          message: linked
            ? "AI context enabled for this source"
            : "AI context disabled for this source",
          severity: linked ? "success" : "warning",
        };
        const newUsage =
          linked && s.usage
            ? {
                ...s.usage,
                tokensUsed: s.usage.tokensUsed + 120,
                costUSD: parseFloat((s.usage.costUSD + 0.0002).toFixed(4)),
              }
            : s.usage;
        return {
          ...s,
          aiContextEnabled: linked,
          events: [ev, ...s.events].slice(0, 5),
          usage: newUsage,
        };
      });
      saveLS(
        "insightforge_forge_links",
        Object.fromEntries(updated.map((s) => [s.id, s.aiContextEnabled])),
      );
      const usageToSave = Object.fromEntries(
        updated.filter((s) => s.usage).map((s) => [s.id, s.usage]),
      );
      saveLS("insightforge_costs", usageToSave);
      return updated;
    });
  };

  const handleSync = async (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "syncing" } : s)),
    );
    await new Promise((r) => setTimeout(r, 1800));
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const ev: ActivityEvent = {
          timestamp: nowStr(),
          message: "Manual resync completed",
          severity: "success",
        };
        return {
          ...s,
          status: "connected",
          lastSync: "just now",
          latencyMs: Math.round(50 + Math.random() * 200),
          events: [ev, ...s.events].slice(0, 5),
        };
      }),
    );
  };

  const handleToggleFreeze = (id: string) => {
    setSources((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const nowFrozen = !s.frozen;
        const frozenAt = nowFrozen ? nowStr() : null;
        const ev: ActivityEvent = {
          timestamp: nowStr(),
          message: nowFrozen
            ? `Snapshot taken at ${frozenAt}`
            : "Snapshot released — live data resumed",
          severity: nowFrozen ? "warning" : "success",
        };
        return {
          ...s,
          frozen: nowFrozen,
          frozenAt,
          events: [ev, ...s.events].slice(0, 5),
        };
      });
      saveLS(
        "insightforge_frozen",
        Object.fromEntries(updated.map((s) => [s.id, s.frozenAt])),
      );
      return updated;
    });
  };

  const handleSyncAll = async () => {
    const ids = sources.filter((s) => !s.frozen).map((s) => s.id);
    await Promise.all(ids.map((id) => handleSync(id)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span>Dashboard</span>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>Data Sources</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1
              className="text-[22px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Data Sources
            </h1>
            <p
              className="text-[13px] mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Manage connectors, AI context linking, and snapshot freezing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--success)" }}
              />
              <span
                className="text-[11px]"
                style={{ color: "var(--text-secondary)" }}
              >
                Last polled {lastPolled.toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={poll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <RefreshCw size={12} /> Refresh All
            </button>
            <button
              onClick={handleSyncAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium text-white transition-colors"
              style={{ background: "var(--accent)" }}
            >
              <Zap size={12} /> Sync All Sources
            </button>
          </div>
        </div>
      </div>

      <SourcesSummary sources={sources} />

      <AnimatePresence>
        {conflicts.map((c, i) => (
          <ConflictBanner key={i} report={c} />
        ))}
      </AnimatePresence>

      <div
        id="connector-grid"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {sources.map((source, i) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <ConnectorCard
              source={source}
              onToggleForge={handleToggleForge}
              onSync={handleSync}
              onToggleFreeze={handleToggleFreeze}
            />
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div
        className="rounded-xl px-5 py-4 flex flex-wrap items-center gap-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {[
          {
            icon: <Link size={12} style={{ color: "var(--accent)" }} />,
            text: "Included in AI context — used by the chat assistant",
          },
          {
            icon: <Snowflake size={12} style={{ color: "var(--warning)" }} />,
            text: "Frozen — snapshot mode, static data",
          },
          {
            icon: (
              <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
            ),
            text: "80+ health = healthy connection",
          },
          {
            icon: <AlertCircle size={12} style={{ color: "var(--danger)" }} />,
            text: "Below 60 health = degraded connection",
          },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2">
            {icon}
            <span
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataSourcesPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <DataSourcesContent />
    </RoleGuard>
  );
}
