"use client";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";
import { getAggregateDashboardStats } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  Filter,
  X,
  Check,
  Snowflake,
  Shield,
  Brain,
  GitCompare,
  Lock,
  Hash,
  Share2,
  Copy,
  CheckCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getSavedAlerts,
  createSavedAlert,
  updateSavedAlert,
  deleteSavedAlert,
  type SavedAlertRow,
} from "@/lib/data";

function rowToAlert(r: SavedAlertRow): SavedAlert {
  return {
    id: r.id,
    name: r.name,
    metric: r.metric,
    datasetFilter: r.dataset_filter,
    operator: r.operator,
    threshold: r.threshold,
    createdAt: new Date(r.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    color: r.color,
    active: r.active,
    lastChecked: r.last_checked
      ? new Date(r.last_checked).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    lastStatus: r.last_status,
    triggeredValue: r.triggered_value,
    triggeredSource: r.triggered_source,
    aiInsight: r.ai_insight,
    selectedForCompare: false,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertMetric = "dataset_delta" | "mrr_delta";
type AlertOperator = "above" | "below";
type AlertStatus = "triggered" | "safe" | "unchecked";

interface SavedAlert {
  id: string;
  name: string;
  metric: AlertMetric;
  datasetFilter: string; // "" = any dataset (only used when metric === "dataset_delta")
  operator: AlertOperator;
  threshold: number; // percent
  createdAt: string;
  color: string;
  active: boolean;
  lastChecked: string | null;
  lastStatus: AlertStatus;
  triggeredValue: number | null;
  triggeredSource: string | null; // e.g. filename that triggered it
  aiInsight: string | null;
  selectedForCompare: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#003366",
  "#059669",
  "#7c3aed",
  "#d97706",
  "#db2777",
  "#0891b2",
];
const STORAGE_KEY = "insightforge_saved_alerts_v1";

const RANGE_LABEL: Record<string, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

const DEFAULT_ALERTS: SavedAlert[] = [];

const METRIC_LABEL: Record<AlertMetric, string> = {
  dataset_delta: "Dataset Revenue Change",
  mrr_delta: "Total MRR Change",
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
    /**/
  }
}

import { getDatasetMovers } from "@/lib/data";

async function checkAlert(alert: SavedAlert): Promise<{
  status: AlertStatus;
  value: number | null;
  source: string | null;
}> {
  try {
    if (alert.metric === "dataset_delta") {
      const movers = await getDatasetMovers();
      const pool = alert.datasetFilter
        ? movers.filter((m) => m.filename === alert.datasetFilter)
        : movers;
      const hit = pool.find((m) =>
        alert.operator === "above"
          ? m.deltaPct > alert.threshold
          : m.deltaPct < -alert.threshold,
      );
      if (hit) {
        return {
          status: "triggered",
          value: hit.deltaPct,
          source: hit.filename,
        };
      }
      const worst = pool.sort(
        (a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct),
      )[0];
      return {
        status: "safe",
        value: worst?.deltaPct ?? null,
        source: worst?.filename ?? null,
      };
    }

    // mrr_delta — computed from real sparkline, no fake field
    const stats = await getAggregateDashboardStats();
    const points = stats.mrrSparkline ?? [];
    if (points.length < 2) {
      return { status: "unchecked", value: null, source: null };
    }
    const last = points[points.length - 1].mrr;
    const prev = points[points.length - 2].mrr;
    const deltaPct = prev !== 0 ? ((last - prev) / prev) * 100 : 0;
    const triggered =
      alert.operator === "above"
        ? deltaPct > alert.threshold
        : deltaPct < -alert.threshold;
    return {
      status: triggered ? "triggered" : "safe",
      value: Math.round(deltaPct * 10) / 10,
      source: null,
    };
  } catch {
    return { status: "unchecked", value: null, source: null };
  }
}

// Real call — adjust query params / method if your /api/briefing route differs
async function fetchInsight(
  metricLabel: string,
  context: string,
  efficiency: number,
): Promise<string> {
  const res = await fetch("/api/briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      range: metricLabel,
      category: "all",
      efficiency,
      newsHeadline: context,
    }),
  });
  if (!res.ok) throw new Error("briefing fetch failed");
  const data = await res.json();
  return data.briefing as string;
}

// ─── Share Module ───────────────────────────────────────────────────────────

function ShareModule({
  view,
  onClose,
}: {
  view: SavedAlert;
  onClose: () => void;
}) {
  const [token] = useState(() => crypto.randomUUID());
  const shareUrl = `https://insight-forge-dashboard.vercel.app/snapshot/${token}`;
  const [copied, setCopied] = useState(false);
  const [expiry] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl overflow-hidden shadow-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Share2 size={14} style={{ color: "var(--accent)" }} />
            <h3
              className="font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Share Snapshot
            </h3>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            className="rounded-lg p-3"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-primary)",
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {view.name}
            </p>
          </div>
          <div>
            <div
              className="text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Share URL
            </div>
            <div className="flex gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-lg overflow-hidden"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                }}
              >
                <p
                  className="text-xs font-mono truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {shareUrl}
                </p>
              </div>
              <button
                onClick={copy}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors",
                  copied ? "text-white" : "",
                )}
                style={
                  copied
                    ? {
                        background: "var(--success)",
                        borderColor: "var(--success)",
                      }
                    : {
                        borderColor: "var(--border)",
                        color: "var(--text-secondary)",
                      }
                }
              >
                {copied ? (
                  <>
                    <CheckCheck size={12} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-lg p-2.5 text-center"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wide mb-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                Expires
              </div>
              <div
                className="text-xs font-mono"
                style={{ color: "var(--warning)" }}
              >
                {expiry}
              </div>
            </div>
            <div
              className="rounded-lg p-2.5 text-center"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wide mb-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                Access
              </div>
              <div
                className="text-xs font-mono"
                style={{ color: "var(--success)" }}
              >
                Read-only
              </div>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "var(--warning-bg)" }}
          >
            <AlertTriangle
              size={12}
              style={{ color: "var(--warning)" }}
              className="shrink-0"
            />
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Link isn&apos;t validated server-side yet — anyone with the URL
              sees this locally, no real access control is enforced.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Comparison Panel ─────────────────────────────────────────────────────────

function ComparePanel({
  views,
  onClose,
}: {
  views: SavedAlert[];
  onClose: () => void;
}) {
  const [a, b] = views;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl overflow-hidden shadow-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <GitCompare size={14} style={{ color: "var(--accent)" }} />
            <h3
              className="font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              Compare Snapshots
            </h3>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[a, b].map((v, i) => (
            <div
              key={v.id}
              className="rounded-lg p-4"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="text-[10px] uppercase tracking-wide mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                View {String.fromCharCode(65 + i)}
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {v.name}
              </p>
              <p
                className="text-xs font-mono mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                {v.createdAt} · {METRIC_LABEL[v.metric]} {v.operator}{" "}
                {v.threshold}%{v.datasetFilter ? ` · ${v.datasetFilter}` : ""}
              </p>
              {v.aiInsight ? (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {v.aiInsight}
                </p>
              ) : (
                <p
                  className="text-xs italic"
                  style={{ color: "var(--text-muted)" }}
                >
                  No AI insight generated for this snapshot yet.
                </p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── View Card ────────────────────────────────────────────────────────────────

function ViewCard({
  view,
  savedId,
  onCheck,
  onDelete,
  onTogglePause,
  onToggleCompare,
  onShare,
  onGenerateInsight,
}: {
  view: SavedAlert;
  savedId: string | null;
  onCheck: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePause: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onShare: (v: SavedAlert) => void;
  onGenerateInsight: (id: string) => void;
}) {
  const [genLoading, setGenLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);

  const handleGenerate = async () => {
    setGenLoading(true);
    await Promise.resolve(onGenerateInsight(view.id));
    setGenLoading(false);
  };

  const handleCheck = async () => {
    setCheckLoading(true);
    await Promise.resolve(onCheck(view.id));
    setCheckLoading(false);
  };

  const isTriggered = view.lastStatus === "triggered";
  const isPaused = !view.active;

  const cardBorder = isTriggered
    ? "var(--danger)"
    : view.selectedForCompare
      ? "var(--accent)"
      : "var(--border)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl overflow-hidden group"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${cardBorder}`,
        opacity: isPaused ? 0.6 : 1,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: isTriggered ? "var(--danger)" : view.color }}
      />

      <AnimatePresence>
        {isTriggered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 z-10"
          >
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "var(--danger-bg)",
                color: "var(--danger)",
              }}
            >
              <AlertTriangle size={9} /> Triggered
            </span>
          </motion.div>
        )}
        {savedId === view.id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: "var(--success-bg)", color: "var(--success)" }}
          >
            <Check size={9} /> Saved
          </motion.div>
        )}
        {view.selectedForCompare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
            }}
          >
            <Check size={9} /> Selected
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-lg"
              style={{ background: `${view.color}15` }}
            >
              <Bookmark className="w-3.5 h-3.5" style={{ color: view.color }} />
            </div>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {view.name}
              </h3>
              <p
                className="text-xs mt-0.5 flex items-center gap-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock size={10} /> {view.createdAt}
                {view.lastChecked && <span>· checked {view.lastChecked}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDelete(view.id)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--danger)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {METRIC_LABEL[view.metric]}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {view.operator === "above" ? "Above" : "Below"} {view.threshold}%
          </span>
          {view.datasetFilter && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {view.datasetFilter}
            </span>
          )}
        </div>

        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          {view.lastStatus === "unchecked"
            ? "Not checked yet."
            : view.triggeredValue != null
              ? `Latest: ${view.triggeredValue > 0 ? "+" : ""}${view.triggeredValue}%${
                  view.triggeredSource ? ` (${view.triggeredSource})` : ""
                }`
              : "No data available for this metric yet."}
        </p>

        {/* AI Insight — real, on-demand */}
        <div
          className="rounded-lg px-3 py-2.5 mb-3"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-primary)",
          }}
        >
          <div className="flex items-start gap-2">
            <Brain
              size={12}
              style={{ color: "var(--accent)" }}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide block mb-1"
                style={{ color: "var(--accent)" }}
              >
                AI Insight
              </span>
              {view.aiInsight ? (
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {view.aiInsight}
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={genLoading}
                    title="Regenerate insight"
                    className="shrink-0 p-1 rounded-md disabled:opacity-50"
                    style={{ color: "var(--accent)" }}
                  >
                    {genLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={genLoading}
                  className="text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                  style={{ color: "var(--accent)" }}
                >
                  {genLoading ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />{" "}
                      Generating...
                    </>
                  ) : (
                    "Generate insight"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-between gap-2 pt-3 flex-wrap"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTogglePause(view.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors"
              style={
                isPaused
                  ? {
                      background: "var(--warning-bg)",
                      borderColor: "var(--warning)",
                      color: "var(--warning)",
                    }
                  : {
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }
              }
            >
              {isPaused ? (
                <>
                  <Lock size={10} /> Paused
                </>
              ) : (
                <>
                  <Shield size={10} /> Active
                </>
              )}
            </button>
            <button
              onClick={() => onToggleCompare(view.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors"
              style={
                view.selectedForCompare
                  ? {
                      background: "var(--accent-subtle)",
                      borderColor: "var(--accent)",
                      color: "var(--accent)",
                    }
                  : {
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }
              }
            >
              <GitCompare size={10} />{" "}
              {view.selectedForCompare ? "Selected" : "Compare"}
            </button>
            <button
              onClick={() => onShare(view)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <Share2 size={10} /> Share
            </button>
          </div>
          <button
            onClick={handleCheck}
            disabled={checkLoading}
            className="flex items-center gap-1.5 text-xs font-semibold shrink-0 disabled:opacity-50"
            style={{ color: view.color }}
          >
            {checkLoading ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <RefreshCw size={10} />
            )}
            Check Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SavedViewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [views, setViews] = useState<SavedAlert[]>(DEFAULT_ALERTS);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMetric, setNewMetric] = useState<AlertMetric>("dataset_delta");
  const [newDatasetFilter, setNewDatasetFilter] = useState("");
  const [newOperator, setNewOperator] = useState<AlertOperator>("above");
  const [newThreshold, setNewThreshold] = useState("10");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [shareTarget, setShareTarget] = useState<SavedAlert | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [cardFilter, setCardFilter] = useState<"all" | "triggered" | "insight">(
    "all",
  );
  const [showTriggerBar, setShowTriggerBar] = useState(true);
  const prevTriggeredRef = useRef(0);

  const [efficiency, setEfficiency] = useState(0);

  useEffect(() => {
    getAggregateDashboardStats()
      .then((stats) => setEfficiency(stats.efficiency ?? 0))
      .catch(() => setEfficiency(0));
  }, []);

  useEffect(() => {
    getSavedAlerts().then((rows) => {
      const mapped = rows.map(rowToAlert);
      if (mapped.length) {
        setViews(mapped);
        runCheckAll(mapped);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (updated: SavedAlert[]) => {
    setViews(updated);
  };

  const runCheckAll = async (list: SavedAlert[]) => {
    setCheckingAll(true);
    const results = await Promise.all(
      list.map(async (a) => {
        if (!a.active) return a;
        const { status, value, source } = await checkAlert(a);
        const updated = {
          ...a,
          lastStatus: status,
          triggeredValue: value,
          triggeredSource: source,
          lastChecked:
            status === "unchecked"
              ? a.lastChecked
              : new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
        };
        updateSavedAlert(a.id, {
          last_status: status,
          triggered_value: value,
          triggered_source: source,
          ...(status !== "unchecked" && {
            last_checked: new Date().toISOString(),
          }),
        });
        return updated;
      }),
    );
    persist(results);
    setCheckingAll(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const threshold = parseFloat(newThreshold);
    if (isNaN(threshold) || threshold <= 0) return;
    const alert: SavedAlert = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      metric: newMetric,
      datasetFilter: newDatasetFilter.trim(),
      operator: newOperator,
      threshold,
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      color: newColor,
      active: true,
      lastChecked: null,
      lastStatus: "unchecked",
      triggeredValue: null,
      triggeredSource: null,
      aiInsight: null,
      selectedForCompare: false,
    };
    const checked = await checkAlert(alert);
    const row = await createSavedAlert({
      name: alert.name,
      metric: alert.metric,
      dataset_filter: alert.datasetFilter,
      operator: alert.operator,
      threshold: alert.threshold,
      color: alert.color,
      active: true,
      last_checked:
        checked.status === "unchecked" ? null : new Date().toISOString(),
      last_status: checked.status,
      triggered_value: checked.value,
      triggered_source: checked.source,
      ai_insight: null,
    });
    if (!row) return;
    const finalAlert = rowToAlert(row);
    persist([finalAlert, ...views]);
    setSavedId(finalAlert.id);
    setTimeout(() => setSavedId(null), 2000);
    setShowCreate(false);
    setNewName("");
    setNewDatasetFilter("");
    setNewThreshold("10");
  };

  const handleGenerateInsight = async (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    if (efficiency === 0) {
      persist(
        views.map((x) =>
          x.id === id
            ? {
                ...x,
                aiInsight:
                  "Still loading dashboard data — try again in a moment.",
              }
            : x,
        ),
      );
      return;
    }
    try {
      const context = `Alert "${v.name}": ${METRIC_LABEL[v.metric]} ${v.operator} ${v.threshold}%. Current status: ${v.lastStatus}${v.triggeredValue != null ? `, latest value ${v.triggeredValue}%` : ""}${v.triggeredSource ? ` (${v.triggeredSource})` : ""}.`;
      const briefing = await fetchInsight(
        METRIC_LABEL[v.metric],
        context,
        efficiency,
      );
      await updateSavedAlert(id, { ai_insight: briefing });
      persist(
        views.map((x) => (x.id === id ? { ...x, aiInsight: briefing } : x)),
      );
    } catch {
      persist(
        views.map((x) =>
          x.id === id
            ? {
                ...x,
                aiInsight: "Could not generate insight right now — try again.",
              }
            : x,
        ),
      );
    }
  };
  const handleDelete = async (id: string) => {
    await deleteSavedAlert(id);
    persist(views.filter((v) => v.id !== id));
  };
  const handleTogglePause = async (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    await updateSavedAlert(id, { active: !v.active });
    persist(views.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
  };
  const handleCheckOne = async (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    const { status, value, source } = await checkAlert(v);
    const lastChecked =
      status === "unchecked"
        ? v.lastChecked
        : new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
    await updateSavedAlert(id, {
      last_status: status,
      triggered_value: value,
      triggered_source: source,
      ...(status !== "unchecked" && { last_checked: new Date().toISOString() }),
    });
    persist(
      views.map((x) =>
        x.id === id
          ? {
              ...x,
              lastStatus: status,
              triggeredValue: value,
              triggeredSource: source,
              lastChecked,
            }
          : x,
      ),
    );
  };
  const handleToggleCompare = (id: string) => {
    const sel = views.filter((v) => v.selectedForCompare);
    const tgt = views.find((v) => v.id === id);
    if (!tgt) return;
    if (tgt.selectedForCompare) {
      persist(
        views.map((v) =>
          v.id === id ? { ...v, selectedForCompare: false } : v,
        ),
      );
    } else if (sel.length < 2) {
      persist(
        views.map((v) =>
          v.id === id ? { ...v, selectedForCompare: true } : v,
        ),
      );
    }
  };
  const clearCompare = () =>
    persist(views.map((v) => ({ ...v, selectedForCompare: false })));

  const compareViews = views.filter((v) => v.selectedForCompare);
  const canCompare = compareViews.length === 2;

  const stats = {
    total: views.length,
    triggered: views.filter((v) => v.lastStatus === "triggered").length,
    withInsight: views.filter((v) => v.aiInsight).length,
  };

  useEffect(() => {
    if (stats.triggered > prevTriggeredRef.current) {
      setShowTriggerBar(true);
    }
    prevTriggeredRef.current = stats.triggered;
  }, [stats.triggered]);

  return (
    <div className="space-y-6 relative pb-24">
      <div>
        <div
          className="flex items-center gap-2 text-xs font-medium mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          <Link href="/" className="hover:underline cursor-pointer">
            Dashboard
          </Link>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>Saved Views</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Saved Views
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Saved filter snapshots with on-demand AI insight
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={14} /> New Alert
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: "View All", value: stats.total, filterKey: "all" },
            {
              label: "Triggered",
              value: stats.triggered,
              filterKey: "triggered",
            },
            {
              label: "With Insight",
              value: stats.withInsight,
              filterKey: "insight",
            },
          ] as const
        ).map(({ label, value, filterKey }) => {
          const active = cardFilter === filterKey;
          const clickable = filterKey === "all" || value > 0;
          return (
            <div
              key={label}
              onClick={() =>
                clickable &&
                setCardFilter((f) => (f === filterKey ? "all" : filterKey))
              }
              className="rounded-lg px-4 py-3 text-center"
              style={{
                border: active
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
                background: "var(--bg-surface)",
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wide mb-1"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {label}
              </div>
              <div
                className="text-xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>

      {showTriggerBar && (
        <div
          onClick={() => {
            if (stats.triggered === 0) return;
            if (cardFilter === "triggered") {
              setCardFilter("all");
              setShowTriggerBar(false);
            } else {
              setCardFilter("triggered");
            }
          }}
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{
            border:
              cardFilter === "triggered"
                ? "1px solid var(--danger)"
                : "1px solid var(--border)",
            background: "var(--bg-surface)",
            cursor: stats.triggered > 0 ? "pointer" : "default",
          }}
        >
          <Filter
            size={13}
            style={{
              color:
                cardFilter === "triggered"
                  ? "var(--danger)"
                  : "var(--text-muted)",
            }}
          />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {stats.triggered > 0 ? (
              <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                {stats.triggered} alert{stats.triggered > 1 ? "s" : ""}{" "}
                triggered
                {cardFilter === "triggered"
                  ? " (filtered)"
                  : " — click to filter"}
              </span>
            ) : (
              <span style={{ color: "var(--success)", fontWeight: 600 }}>
                All clear
              </span>
            )}
          </p>
          {compareViews.length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
              }}
            >
              {compareViews.length}/2 selected
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              runCheckAll(views);
            }}
            disabled={checkingAll}
            className="ml-auto text-xs font-semibold disabled:opacity-50"
            style={{ color: "var(--accent)" }}
          >
            {checkingAll ? "Checking..." : "Check All"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {(cardFilter === "triggered"
            ? views.filter((v) => v.lastStatus === "triggered")
            : cardFilter === "insight"
              ? views.filter((v) => v.aiInsight)
              : views
          ).map((view) => (
            <ViewCard
              key={view.id}
              view={view}
              savedId={savedId}
              onCheck={handleCheckOne}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
              onToggleCompare={handleToggleCompare}
              onShare={setShareTarget}
              onGenerateInsight={handleGenerateInsight}
            />
          ))}
        </AnimatePresence>
        {views.length === 0 && (
          <div
            className="col-span-3 py-16 text-center rounded-xl"
            style={{ border: "1px solid var(--border)" }}
          >
            <Bookmark
              className="w-7 h-7 mx-auto mb-3"
              style={{ color: "var(--text-muted)" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              No saved views yet
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {compareViews.length > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {compareViews.length} selected
            </span>
            <div className="w-px h-5" style={{ background: "var(--border)" }} />
            <button
              onClick={() => {
                if (canCompare) setShowCompare(true);
              }}
              disabled={!canCompare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              <GitCompare size={12} /> Compare
            </button>
            <button
              onClick={clearCompare}
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && canCompare && (
          <ComparePanel
            views={compareViews}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareTarget && (
          <ShareModule
            view={shareTarget}
            onClose={() => setShareTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.97, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl overflow-hidden shadow-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <Shield size={13} style={{ color: "var(--accent)" }} />
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    New Alert
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label
                    className="text-xs font-medium block mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Name
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Q2 Revenue Inflection"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      background: "var(--bg-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium block mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Metric
                  </label>
                  <select
                    value={newMetric}
                    onChange={(e) =>
                      setNewMetric(e.target.value as AlertMetric)
                    }
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      background: "var(--bg-primary)",
                    }}
                  >
                    {Object.entries(METRIC_LABEL).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {newMetric === "dataset_delta" && (
                  <div>
                    <label
                      className="text-xs font-medium block mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Dataset filename (optional)
                    </label>
                    <input
                      value={newDatasetFilter}
                      onChange={(e) => setNewDatasetFilter(e.target.value)}
                      placeholder="Leave blank for any dataset"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        background: "var(--bg-primary)",
                      }}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label
                      className="text-xs font-medium block mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Condition
                    </label>
                    <select
                      value={newOperator}
                      onChange={(e) =>
                        setNewOperator(e.target.value as AlertOperator)
                      }
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        background: "var(--bg-primary)",
                      }}
                    >
                      <option value="above">Rises above</option>
                      <option value="below">Drops below</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label
                      className="text-xs font-medium block mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        background: "var(--bg-primary)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="text-xs font-medium block mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Color
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all",
                          newColor === c ? "scale-110" : "",
                        )}
                        style={{
                          background: c,
                          borderColor:
                            newColor === c
                              ? "var(--text-primary)"
                              : "transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newThreshold.trim()}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                    style={{ background: "var(--accent)" }}
                  >
                    Create Alert
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
