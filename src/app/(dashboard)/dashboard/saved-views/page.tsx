"use client";
import Link from "next/link";

import { useState, useEffect, useRef } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedView {
  id: string;
  name: string;
  description: string;
  range: string;
  category: string;
  createdAt: string;
  color: string;
  frozen: boolean;
  frozenAt: string | null;
  verificationId: string;
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
const STORAGE_KEY = "insightforge_saved_views_v4";

const RANGE_LABEL: Record<string, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

const DEFAULT_VIEWS: SavedView[] = [
  {
    id: "seed-monthly-overview",
    name: "Monthly Overview",
    description: "30-day all categories performance",
    range: "30d",
    category: "",
    createdAt: "May 1, 2026",
    color: "#003366",
    frozen: false,
    frozenAt: null,
    verificationId: "seed-vid-0001-0000-0000-000000000001",
    aiInsight: null,
    selectedForCompare: false,
  },
  {
    id: "seed-revenue-focus",
    name: "Revenue Focus",
    description: "90-day revenue deep dive",
    range: "90d",
    category: "revenue",
    createdAt: "Apr 28, 2026",
    color: "#059669",
    frozen: true,
    frozenAt: "10:15 AM",
    verificationId: "seed-vid-0002-0000-0000-000000000002",
    aiInsight: null,
    selectedForCompare: false,
  },
  {
    id: "seed-weekly-pulse",
    name: "Weekly Pulse",
    description: "Quick 7-day snapshot",
    range: "7d",
    category: "",
    createdAt: "Apr 25, 2026",
    color: "#d97706",
    frozen: false,
    frozenAt: null,
    verificationId: "seed-vid-0003-0000-0000-000000000003",
    aiInsight: null,
    selectedForCompare: false,
  },
];

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

// Real call — adjust query params / method if your /api/briefing route differs
async function fetchInsight(
  range: string,
  category: string,
  context: string,
): Promise<string> {
  const res = await fetch("/api/briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      range,
      category: category || "all",
      efficiency: "",
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
  view: SavedView;
  onClose: () => void;
}) {
  const token = useRef(crypto.randomUUID());
  const shareUrl = `https://insight-forge-dashboard.vercel.app/snapshot/${token.current}`;
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
  views: SavedView[];
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
                {v.createdAt} · {RANGE_LABEL[v.range] || v.range}
                {v.category ? ` · ${v.category}` : ""}
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
  onLoad,
  onDelete,
  onToggleFreeze,
  onToggleCompare,
  onShare,
  onGenerateInsight,
}: {
  view: SavedView;
  savedId: string | null;
  onLoad: (v: SavedView) => void;
  onDelete: (id: string) => void;
  onToggleFreeze: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onShare: (v: SavedView) => void;
  onGenerateInsight: (id: string) => void;
}) {
  const [genLoading, setGenLoading] = useState(false);

  const handleGenerate = async () => {
    setGenLoading(true);
    await Promise.resolve(onGenerateInsight(view.id));
    setGenLoading(false);
  };

  const cardBorder = view.frozen
    ? "var(--warning)"
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
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: view.frozen ? "var(--warning)" : view.color }}
      />

      <AnimatePresence>
        {view.frozen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 z-10"
          >
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "var(--warning-bg)",
                color: "var(--warning)",
              }}
            >
              <Snowflake size={9} /> Frozen
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
                {view.frozen && view.frozenAt && (
                  <span>· snapped {view.frozenAt}</span>
                )}
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
            {RANGE_LABEL[view.range] || view.range}
          </span>
          {view.category && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {view.category}
            </span>
          )}
        </div>

        {view.description && (
          <p
            className="text-xs mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {view.description}
          </p>
        )}

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
          className="flex items-center gap-1.5 text-[10px] mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          <Hash size={10} />
          <span className="font-mono truncate">
            {view.verificationId.slice(0, 13)}
          </span>
        </div>

        <div
          className="flex items-center justify-between gap-2 pt-3 flex-wrap"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFreeze(view.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors"
              style={
                view.frozen
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
              {view.frozen ? (
                <>
                  <Snowflake size={10} /> Frozen
                </>
              ) : (
                <>
                  <Lock size={10} /> Freeze
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
            onClick={() => onLoad(view)}
            className="flex items-center gap-1.5 text-xs font-semibold shrink-0"
            style={{ color: view.color }}
          >
            Load <ExternalLink size={10} />
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

  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [shareTarget, setShareTarget] = useState<SavedView | null>(null);

  useEffect(() => {
    const stored = loadLS<SavedView[]>(STORAGE_KEY, []);
    if (stored.length) setViews(stored);
  }, []);

  const persist = (updated: SavedView[]) => {
    setViews(updated);
    saveLS(STORAGE_KEY, updated);
  };

  const currentRange = searchParams.get("range") || "30d";
  const currentCategory = searchParams.get("category") || "";

  const handleCreate = () => {
    if (!newName.trim()) return;
    const view: SavedView = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description:
        newDesc.trim() ||
        `${currentRange} · ${currentCategory || "All categories"}`,
      range: currentRange,
      category: currentCategory,
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      color: newColor,
      frozen: false,
      frozenAt: null,
      verificationId: crypto.randomUUID(),
      aiInsight: null,
      selectedForCompare: false,
    };
    persist([view, ...views]);
    setSavedId(view.id);
    setTimeout(() => setSavedId(null), 2000);
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
  };

  const handleGenerateInsight = async (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    try {
      const briefing = await fetchInsight(
        v.range,
        v.category,
        `${v.name} — ${v.description}`,
      );
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

  const handleLoad = (view: SavedView) => {
    const p = new URLSearchParams();
    if (view.range !== "30d") p.set("range", view.range);
    if (view.category) p.set("category", view.category);
    router.push(`/?${p.toString()}`);
  };
  const handleDelete = (id: string) =>
    persist(views.filter((v) => v.id !== id));
  const handleToggleFreeze = (id: string) =>
    persist(
      views.map((v) =>
        v.id === id
          ? {
              ...v,
              frozen: !v.frozen,
              frozenAt: !v.frozen
                ? new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null,
            }
          : v,
      ),
    );
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
    frozen: views.filter((v) => v.frozen).length,
    withInsight: views.filter((v) => v.aiInsight).length,
  };

  return (
    <div className="space-y-6 relative pb-24">
      <div>
        <div
          className="flex items-center gap-2 text-xs font-medium mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          <Link href="/" className="hover:underline cursor-pointer">Dashboard</Link>
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
            <Plus size={14} /> Save Current View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Snapshots", value: stats.total },
          { label: "Frozen", value: stats.frozen },
          { label: "With Insight", value: stats.withInsight },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg px-4 py-3 text-center"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            <div
              className="text-[10px] uppercase tracking-wide mb-1"
              style={{ color: "var(--text-muted)" }}
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
        ))}
      </div>

      <div
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <Filter size={13} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Active context:{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {RANGE_LABEL[currentRange] || currentRange}
          </span>
          {currentCategory && (
            <>
              {" "}
              ·{" "}
              <span
                style={{ color: "var(--text-primary)", fontWeight: 600 }}
                className="capitalize"
              >
                {currentCategory}
              </span>
            </>
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
          onClick={() => setShowCreate(true)}
          className="ml-auto text-xs font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Save this →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {views.map((view) => (
            <ViewCard
              key={view.id}
              view={view}
              savedId={savedId}
              onLoad={handleLoad}
              onDelete={handleDelete}
              onToggleFreeze={handleToggleFreeze}
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
                    Save View
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
                    Note (optional)
                  </label>
                  <input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What triggered this snapshot?"
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
                    disabled={!newName.trim()}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                    style={{ background: "var(--accent)" }}
                  >
                    Save View
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
