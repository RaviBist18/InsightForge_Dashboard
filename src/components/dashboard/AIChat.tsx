"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  User,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/data";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  dashboardStats: DashboardStats & { datasetCount: number };
  datasetNames?: string[];
}

function buildSystemContext(
  stats: AIChatProps["dashboardStats"],
  datasetNames: string[] = [],
): string {
  const WEBSITE_KNOWLEDGE = `
WEBSITE FEATURES (answer how-to/feature questions from this, even with no live data):
- Datasets page: upload CSV/Excel files, view column detection, clean data (remove duplicates, fill nulls); select multiple datasets to bulk-delete.
- Live Metrics (Workspace): real-time KPI cards — Revenue, Profit, Margin, Orders, Users, Churn — all computed from uploaded datasets.
- Snapshot Archive: seal a labeled point-in-time record of current metrics (MRR, churn, signups); records are permanent once sealed, can be deleted individually, in bulk, or all at once.
- CEO Briefing: choose a persona (Risk Defensive / Balanced / Growth Aggressive) to get an AI-written strategic summary based on live risks and opportunities.
- KPI detail pages: click any KPI card for a deeper breakdown — chart, trend, and (where available) AI explanation.
- Simulation: model hypothetical changes (e.g. marketing spend, pricing) and see projected revenue/profit impact using industry-standard elasticity estimates.
`.trim();

  const profitLine =
    stats.totalProfit > 0
      ? `Profit: $${stats.totalProfit.toLocaleString()}`
      : `Profit: not available — dataset schema has no cost field yet`;

  const churnLine =
    stats.churnRate > 0
      ? `Churn rate: ${stats.churnRate}%`
      : `Churn rate: not available — churn-prediction endpoint not wired to this stat yet`;

  return `
ACT AS: InsightForge Lead Strategic Consultant. Boardroom-direct, no fluff.
CORE LOGIC:
1. Only reference the LIVE DASHBOARD DATA below — never invent numbers not listed here.
2. If a metric is marked "not available," say so plainly and explain why. Do not guess or estimate a number for it.
2b. Only state a feature exists on a specific page/section if it's explicitly listed under that section in WEBSITE FEATURES below. If unsure, say "I'm not sure that's available — check the [page] page directly" rather than guessing.
3. Use direct action verbs when giving advice — Cut, Push, Squeeze, Protect, Accelerate.
4. Banned words: overall, stable, healthy, monitor, slightly.

${WEBSITE_KNOWLEDGE}

LIVE DASHBOARD DATA:
- Datasets connected: ${stats.datasetCount}${
    datasetNames.length > 0 ? ` (${datasetNames.join(", ")})` : ""
  }
- Revenue (this period): $${stats.totalRevenue.toLocaleString()}
- ${profitLine}
- Orders: ${stats.totalOrders}
- Active customers: ${stats.activeUsers}
- ${churnLine}
- Growth/efficiency: ${stats.efficiency}%
- Latest signal: ${stats.latestNews}
`.trim();
}

function buildSuggestedQuestions(
  stats: AIChatProps["dashboardStats"],
): string[] {
  if (stats.datasetCount === 0) {
    return [
      "How do I upload a dataset?",
      "What can this dashboard show me once I have data?",
    ];
  }

  const questions: string[] = ["Summarize this month's revenue"];

  if (stats.totalOrders > 0)
    questions.push("How is our order volume trending?");
  if (stats.datasetCount > 1)
    questions.push("Which dataset is outperforming the others?");
  if (stats.efficiency !== 0)
    questions.push("What's driving our growth rate right now?");
  if (stats.totalProfit === 0)
    questions.push("Why isn't profit margin tracked yet?");

  return questions.slice(0, 4);
}

const DEFAULT_POS = { right: 24, bottom: 100 };
const DEFAULT_SIZE = { width: 360, height: 520 };
const MIN_WIDTH = 300;
const MIN_HEIGHT = 360;
const MAX_HEIGHT = 700;

export function AIChat({ dashboardStats, datasetNames = [] }: AIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content:
        "Hi! I'm InsightForge AI. Ask me anything about your dashboard data, trends, or business insights.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const systemContext = buildSystemContext(dashboardStats, datasetNames);
  const suggested = buildSuggestedQuestions(dashboardStats);

  // ── Drag + resize state ──
  const [panelPos, setPanelPos] = useState(DEFAULT_POS);
  const [panelSize, setPanelSize] = useState(DEFAULT_SIZE);
  const [dragging, setDragging] = useState(false);

  const dragStart = useRef({ mouseX: 0, mouseY: 0, right: 0, bottom: 0 });

  const resizingLeft = useRef(false);
  const resizingRight = useRef(false);
  const resizingTop = useRef(false);
  const resizingBottom = useRef(false);
  const resizeStart = useRef({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    right: 0,
    bottom: 0,
  });

  useEffect(() => {
    const clampWidth = () => Math.min(window.innerWidth - 32, 700);
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (resizingLeft.current) {
        const delta = resizeStart.current.mouseX - clientX;
        const newW = Math.min(
          clampWidth(),
          Math.max(MIN_WIDTH, resizeStart.current.width + delta),
        );
        setPanelSize((s) => ({ ...s, width: newW }));
        return;
      }
      if (resizingRight.current) {
        const delta = clientX - resizeStart.current.mouseX;
        const newW = Math.min(
          clampWidth(),
          Math.max(MIN_WIDTH, resizeStart.current.width + delta),
        );
        const widthDelta = newW - resizeStart.current.width;
        setPanelSize((s) => ({ ...s, width: newW }));
        setPanelPos((p) => ({
          ...p,
          right: Math.max(8, resizeStart.current.right - widthDelta),
        }));
        return;
      }
      if (resizingTop.current) {
        const delta = resizeStart.current.mouseY - clientY;
        const newH = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, resizeStart.current.height + delta),
        );
        setPanelSize((s) => ({ ...s, height: newH }));
        return;
      }
      if (resizingBottom.current) {
        const delta = clientY - resizeStart.current.mouseY;
        const newH = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, resizeStart.current.height + delta),
        );
        const heightDelta = newH - resizeStart.current.height;
        setPanelSize((s) => ({ ...s, height: newH }));
        setPanelPos((p) => ({
          ...p,
          bottom: Math.max(8, resizeStart.current.bottom - heightDelta),
        }));
        return;
      }
      if (!dragging) return;
      const newRight = Math.max(
        8,
        Math.min(
          window.innerWidth - 200,
          dragStart.current.right - (clientX - dragStart.current.mouseX),
        ),
      );
      const newBottom = Math.max(
        8,
        Math.min(
          window.innerHeight - 100,
          dragStart.current.bottom - (clientY - dragStart.current.mouseY),
        ),
      );
      setPanelPos({ right: newRight, bottom: newBottom });
    };

    const onUp = () => {
      setDragging(false);
      resizingLeft.current = false;
      resizingRight.current = false;
      resizingTop.current = false;
      resizingBottom.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      right: panelPos.right,
      bottom: panelPos.bottom,
    };
    setDragging(true);
  };

  const onResizeStartLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingLeft.current = true;
    resizeStart.current = {
      ...resizeStart.current,
      mouseX: e.clientX,
      width: panelSize.width,
    };
  };
  const onResizeStartRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRight.current = true;
    resizeStart.current = {
      ...resizeStart.current,
      mouseX: e.clientX,
      width: panelSize.width,
      right: panelPos.right,
    };
  };
  const onResizeStartTop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingTop.current = true;
    resizeStart.current = {
      ...resizeStart.current,
      mouseY: e.clientY,
      height: panelSize.height,
    };
  };
  const onResizeStartBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingBottom.current = true;
    resizeStart.current = {
      ...resizeStart.current,
      mouseY: e.clientY,
      height: panelSize.height,
      bottom: panelPos.bottom,
    };
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setFollowups([]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          systemPrompt: systemContext,
          history: historyForApi,
        }),
      });

      const data = await response.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || "Sorry, I could not process that.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setFollowups(
        Array.isArray(data.followups) ? data.followups.slice(0, 3) : [],
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "0",
        role: "assistant",
        content:
          "Hi! I'm InsightForge AI. Ask me anything about your dashboard data, trends, or business insights.",
        timestamp: new Date(),
      },
    ]);
    setFollowups([]);
  };

  const copyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = () => {
    const text = messages
      .map(
        (m) => `${m.role === "user" ? "You" : "InsightForge AI"}: ${m.content}`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => {
          setOpen((v) => !v);
          if (open) {
            setPanelPos(DEFAULT_POS);
            setPanelSize(DEFAULT_SIZE);
          }
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-10 right-6 z-50 w-[52px] h-[52px] rounded-2xl shadow-lg flex items-center justify-center transition-colors"
        style={{ background: "var(--accent)" }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={20} className="text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="spark"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles size={20} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
            style={{
              background: "var(--success)",
              borderColor: "var(--bg-primary)",
            }}
          />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed z-50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              right: panelPos.right,
              bottom: panelPos.bottom,
              width: panelSize.width,
              height: panelSize.height,
              maxWidth: "calc(100vw - 2rem)",
              transition: dragging ? "none" : "right 0.15s, bottom 0.15s",
            }}
          >
            {/* Resize handles */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 group"
              onMouseDown={onResizeStartTop}
            >
              <div
                className="mx-auto mt-0.5 w-8 h-1 rounded-full"
                style={{ background: "var(--border)" }}
              />
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 group"
              onMouseDown={onResizeStartBottom}
            >
              <div
                className="mx-auto mb-0.5 w-8 h-1 rounded-full"
                style={{ background: "var(--border)" }}
              />
            </div>
            <div
              className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize z-10"
              onMouseDown={onResizeStartLeft}
            />
            <div
              className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize z-10"
              onMouseDown={onResizeStartRight}
            />

            {/* Header — drag handle */}
            <div
              className="px-4 py-3.5 flex items-center justify-between flex-shrink-0 mt-1 select-none"
              style={{
                borderBottom: "1px solid var(--border)",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent)" }}
                >
                  <Sparkles size={13} className="text-white" />
                </div>
                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    InsightForge AI
                  </p>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--success)" }}
                    />
                    <p
                      className="text-[11px] font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Online
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={copyAll}
                  title={copiedAll ? "Copied!" : "Copy all"}
                  className="p-1.5 rounded-xl transition-colors"
                  style={{
                    color: copiedAll ? "var(--success)" : "var(--text-muted)",
                  }}
                >
                  {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleReset}
                  title="Clear chat"
                  className="p-1.5 rounded-xl transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setOpen(false);
                    setPanelPos(DEFAULT_POS);
                    setPanelSize(DEFAULT_SIZE);
                  }}
                  className="p-1.5 rounded-xl transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-2.5",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background:
                        msg.role === "assistant"
                          ? "var(--accent)"
                          : "var(--bg-primary)",
                      border:
                        msg.role === "user"
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    {msg.role === "assistant" ? (
                      <Sparkles size={10} className="text-white" />
                    ) : (
                      <User
                        size={10}
                        style={{ color: "var(--text-secondary)" }}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-w-[78%]">
                    <div
                      className="px-3.5 py-2.5 rounded-xl text-[12px] leading-relaxed"
                      style={{
                        background:
                          msg.role === "assistant"
                            ? "var(--bg-primary)"
                            : "var(--accent)",
                        border:
                          msg.role === "assistant"
                            ? "1px solid var(--border)"
                            : "none",
                        color:
                          msg.role === "assistant"
                            ? "var(--text-primary)"
                            : "#fff",
                      }}
                    >
                      {msg.content}
                    </div>
                    <button
                      onClick={() => copyMessage(msg)}
                      className={cn(
                        "flex items-center gap-1 text-[10px] transition-colors",
                        msg.role === "user" ? "self-end" : "self-start",
                      )}
                      style={{
                        color:
                          copiedId === msg.id
                            ? "var(--success)"
                            : "var(--text-muted)",
                      }}
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={10} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={10} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div
                    className="w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--accent)" }}
                  >
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div
                    className="px-3.5 py-3 rounded-xl flex items-center gap-1.5"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--text-muted)" }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions (first open) */}
            {messages.length === 1 && suggested.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {suggested.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Follow-ups (after each AI reply) */}
            {!loading && messages.length > 1 && followups.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {followups.map((f) => (
                  <button
                    key={f}
                    onClick={() => sendMessage(f)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="px-3 pb-3 pt-2 flex-shrink-0"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Ask about your data..."
                  className="flex-1 bg-transparent text-[12px] focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-6 h-6 rounded-xl disabled:opacity-30 flex items-center justify-center transition-all flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {loading ? (
                    <Loader2 size={11} className="animate-spin text-white" />
                  ) : (
                    <Send size={11} className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
