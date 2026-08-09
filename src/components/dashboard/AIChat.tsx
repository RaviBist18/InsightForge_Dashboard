"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, User, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForensicNode } from "@/components/dashboard/DataTable";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DashboardStats {
  efficiency?: number;
  latestNews?: string;
  [key: string]: unknown;
}

interface AIChatProps {
  nodes: ForensicNode[];
  stats: DashboardStats | null;
}

const SUGGESTED = [
  "Summarize this month's revenue",
  "Why might churn rate be high?",
  "Which region performs best?",
  "How can I improve profit margin?",
];

export function AIChat({ nodes, stats }: AIChatProps) {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSystemContext = `
        You are the InsightForge AI, a financial analyst assistant for a B2B SaaS dashboard.
        You have access to the following data:

        1. TRACKED ENTITIES: Currently tracking ${nodes?.length || 0} entities.
           The latest entities are: ${
             nodes
               ?.slice(0, 3)
               .map((n) => n.entity)
               .join(", ") || "None"
           }.

        2. BUSINESS STATS:
           - Efficiency: ${stats?.efficiency || 0}%
           - Latest Market Signal: ${stats?.latestNews || "Stable"}.

        INSTRUCTIONS:
        - Answer any question the user asks.
        - If they ask about the dashboard, use the data provided above.
        - Maintain a professional, boardroom-ready tone.
        - If an entity's value exceeds $50,000, treat it as high growth. Otherwise, treat it as stable.
        - Use this to give prescriptive advice when asked which entities are performing best.
    `;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          context: currentSystemContext,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
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
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-14 right-6 z-50 w-[52px] h-[52px] rounded-2xl shadow-lg flex items-center justify-center transition-colors"
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

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-[120px] right-6 z-50 w-[360px] h-[520px] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
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
                  onClick={handleReset}
                  className="p-1.5 rounded-xl transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-xl transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
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
                  <div
                    className="max-w-[78%] px-3.5 py-2.5 rounded-xl text-[12px] leading-relaxed"
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

            {/* Suggestions Panel */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {SUGGESTED.map((s) => (
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

            {/* Input Area */}
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
