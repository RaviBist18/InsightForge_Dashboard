"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CEOBriefingProps {
  efficiency?: number;
  newsHeadline?: string;
}

export const CEOBriefing = ({
  efficiency = 0,
  newsHeadline = "Market stable",
}: CEOBriefingProps) => {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "monthly";
  const category = searchParams.get("category") || "all";

  const [briefing, setBriefing] = useState<string>(
    "Forging strategic insight...",
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ─── AI Strategic Handshake ───────────────────────────────────────────────
  useEffect(() => {
    async function fetchAiInsight() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ range, category, efficiency, newsHeadline }),
        });

        const data = await response.json();
        setBriefing(data.briefing);
      } catch (error) {
        // Fallback to clear, plain-English status
        setBriefing("Consultant offline. Check internal growth metrics.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAiInsight();
  }, [range, category, efficiency, newsHeadline]); // Re-runs on every filter shift

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl p-4"
      style={{
        background: "var(--accent-subtle)",
        border: "1px solid var(--accent)",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <Sparkles
            size={18}
            className={isLoading ? "animate-spin" : ""}
            style={{ color: "#fff" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--accent)" }}
            >
              AI Strategic Briefing
            </h3>
            {isLoading && (
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Analyzing...
              </span>
            )}
          </div>

          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={briefing} // Triggers slide animation on new insight
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-[13px] font-medium leading-relaxed"
                style={{ color: "var(--text-primary)" }}
              >
                {briefing}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
