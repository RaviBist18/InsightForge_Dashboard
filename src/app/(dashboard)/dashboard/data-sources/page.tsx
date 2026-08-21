"use client";
import NextLink from "next/link";

import { useState, useEffect, useCallback, type ElementType } from "react";
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
} from "lucide-react";
import { RoleGuard } from "@/components/common/RoleGuard";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ActivityEvent {
  timestamp: string;
  message: string;
  severity: "success" | "warning" | "critical";
}

interface DataSourceConnector {
  id: string;
  name: string;
  type: "database" | "market" | "news" | "ai";
  status: "connected" | "error" | "syncing";
  configured: boolean;
  healthScore: number; // derived from status+latency, not a native API metric
  latencyMs: number;
  lastSync: string;
  aiContextEnabled: boolean;
  apiKeyMasked: string;
  recordCount: number | null;
  frozen: boolean;
  frozenAt: string | null;
  events: ActivityEvent[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const nowStr = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const SOURCE_META: Record<
  string,
  { name: string; type: DataSourceConnector["type"]; apiKeyMasked: string }
> = {
  supabase: {
    name: "Supabase DB",
    type: "database",
    apiKeyMasked: "sbp_••••••••••••••••",
  },
  groq: { name: "Groq AI", type: "ai", apiKeyMasked: "gsk_••••••••••••••••" },
  alphavantage: {
    name: "Alpha Vantage",
    type: "market",
    apiKeyMasked: "AV••••••••••••••••",
  },
  newsapi: {
    name: "NewsAPI",
    type: "news",
    apiKeyMasked: "nap_••••••••••••••••",
  },
};

const TYPE_META: Record<
  DataSourceConnector["type"],
  { icon: ElementType; label: string }
> = {
  database: { icon: Database, label: "Database" },
  market: { icon: TrendingUp, label: "Market Data" },
  news: { icon: Globe, label: "News" },
  ai: { icon: Brain, label: "AI Engine" },
};

// derived health score — real APIs don't return a 0-100 score, so this is
// computed from status + latency, same "Est." pattern used elsewhere in the app
function deriveHealthScore(
  status: DataSourceConnector["status"],
  latencyMs: number,
): number {
  if (status === "error") return 10;
  if (status === "syncing") return 70;
  if (latencyMs < 300) return 95;
  if (latencyMs < 800) return 75;
  return 55;
}

function buildEmptySource(
  id: string,
  meta: (typeof SOURCE_META)[string],
): DataSourceConnector {
  return {
    id,
    name: meta.name,
    type: meta.type,
    apiKeyMasked: meta.apiKeyMasked,
    status: "error",
    configured: false,
    healthScore: 0,
    latencyMs: 0,
    lastSync: "never",
    recordCount: null,
    frozen: false,
    frozenAt: null,
    aiContextEnabled: true,
    events: [],
  };
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthRing({
  score,
  status,
}: {
  score: number;
  status: DataSourceConnector["status"];
}) {
  const r = 22,
    circ = 2 * Math.PI * r,
    fill = (score / 100) * circ;
  const isError = status === "error";
  const isOptimal = score > 80;
  const color = isError
    ? "var(--danger)"
    : isOptimal
      ? "var(--success)"
      : "var(--warning)";
  const label = isError ? "Error" : isOptimal ? "Healthy" : "Warning";

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

function ApiKeyDisplay({
  masked,
  configured,
}: {
  masked: string;
  configured: boolean;
}) {
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
        {configured
          ? revealed
            ? masked.replace(/•/g, "*")
            : masked
          : "Not configured"}
      </span>
      {configured && (
        <button
          onClick={() => setRevealed((p) => !p)}
          style={{ color: "var(--text-muted)" }}
          className="transition-colors"
        >
          {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      )}
    </div>
  );
}

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
        border: "1px solid var(--border)",
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
              {source.recordCount !== null && (
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
        <HealthRing score={source.healthScore} status={source.status} />
      </div>

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
        <ApiKeyDisplay
          masked={source.apiKeyMasked}
          configured={source.configured}
        />
      </div>

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

      <ActivityLog events={source.events} />
    </motion.div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SourcesSummary({ sources }: { sources: DataSourceConnector[] }) {
  const linked = sources.filter((s) => s.aiContextEnabled).length;
  const frozen = sources.filter((s) => s.frozen).length;
  const avgHealth = sources.length
    ? Math.round(
        sources.reduce((a, s) => a + s.healthScore, 0) / sources.length,
      )
    : 0;
  const avgLatency = sources.length
    ? Math.round(sources.reduce((a, s) => a + s.latencyMs, 0) / sources.length)
    : 0;
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

// ─── API response type ─────────────────────────────────────────────────────────

interface PingResult {
  id: string;
  status: "connected" | "error";
  latencyMs: number;
  recordCount: number | null;
  message: string;
  checkedAt: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function DataSourcesContent() {
  const [sources, setSources] = useState<DataSourceConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPolled, setLastPolled] = useState<Date | null>(null);

  const mergePings = useCallback(
    (pings: PingResult[], syncingIds: Set<string> = new Set()) => {
      setSources((prev) => {
        const aiLinks: Record<string, boolean> = loadLS(
          "insightforge_forge_links",
          {},
        );
        const frozenMap: Record<string, string | null> = loadLS(
          "insightforge_frozen",
          {},
        );

        return Object.keys(SOURCE_META).map((id) => {
          const meta = SOURCE_META[id];
          const prior = prev.find((s) => s.id === id);
          const isFrozen = frozenMap[id] != null;

          // frozen sources keep their last known values, skip the new ping
          if (isFrozen && prior) {
            return { ...prior, frozen: true, frozenAt: frozenMap[id] };
          }

          const ping = pings.find((p) => p.id === id);
          if (!ping) return prior ?? buildEmptySource(id, meta);

          const status: DataSourceConnector["status"] = syncingIds.has(id)
            ? "syncing"
            : ping.status;
          const ev: ActivityEvent = {
            timestamp: nowStr(),
            message: ping.message,
            severity: ping.status === "connected" ? "success" : "critical",
          };

          return {
            id,
            name: meta.name,
            type: meta.type,
            apiKeyMasked: meta.apiKeyMasked,
            status,
            configured:
              ping.status !== "error" || !ping.message.includes("not set"),
            healthScore: deriveHealthScore(ping.status, ping.latencyMs),
            latencyMs: ping.latencyMs,
            lastSync: "just now",
            recordCount: ping.recordCount,
            frozen: false,
            frozenAt: null,
            aiContextEnabled: aiLinks[id] ?? true,
            events: [ev, ...(prior?.events ?? [])].slice(0, 5),
          };
        });
      });
    },
    [],
  );

  const fetchHealth = useCallback(
    async (force: boolean, syncingIds?: Set<string>) => {
      const res = await fetch(
        `/api/data-sources-health${force ? "?force=1" : ""}`,
      );
      const json = await res.json();
      mergePings(json.sources as PingResult[], syncingIds);
      setLastPolled(new Date());
    },
    [mergePings],
  );

  // initial load only — no auto-poll interval, see route.ts comment on quota limits
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchHealth(false);
      setLoading(false);
    })();
  }, [fetchHealth]);

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
        return {
          ...s,
          aiContextEnabled: linked,
          events: [ev, ...s.events].slice(0, 5),
        };
      });
      saveLS(
        "insightforge_forge_links",
        Object.fromEntries(updated.map((s) => [s.id, s.aiContextEnabled])),
      );
      return updated;
    });
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
            : "Snapshot released — live data resumes on next sync",
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

  const handleSync = async (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "syncing" } : s)),
    );
    await fetchHealth(true, new Set([id]));
  };

  const handleSyncAll = async () => {
    const activeIds = new Set(
      sources.filter((s) => !s.frozen).map((s) => s.id),
    );
    setSources((prev) =>
      prev.map((s) => (activeIds.has(s.id) ? { ...s, status: "syncing" } : s)),
    );
    await fetchHealth(true, activeIds);
  };

  return (
    <div className="space-y-6">
      <div>
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <NextLink
            href="/dashboard"
            className="hover:underline cursor-pointer"
          >
            Dashboard
          </NextLink>
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
                {lastPolled
                  ? `Last polled ${lastPolled.toLocaleTimeString()}`
                  : "Loading..."}
              </span>
            </div>
            <button
              onClick={() => fetchHealth(true)}
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

      {!loading && <SourcesSummary sources={sources} />}

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
    <RoleGuard allowedRoles={["admin", "co-admin"]}>
      <DataSourcesContent />
    </RoleGuard>
  );
}
