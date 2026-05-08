"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface CEOBriefingProps {
    efficiency: number;     // Passed from ChartsSection net efficiency logic
    newsHeadline?: string;  // Passed from your live NewsAPI state
}

export const CEOBriefing = ({ efficiency, newsHeadline = "Market stable" }: CEOBriefingProps) => {
    const searchParams = useSearchParams();
    const range = searchParams.get('range') || 'monthly';
    const category = searchParams.get('category') || 'all';

    const [briefing, setBriefing] = useState<string>("Forging strategic insight...");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // ─── AI Strategic Handshake ───────────────────────────────────────────────
    useEffect(() => {
        async function fetchAiInsight() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/briefing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
            className="mb-6 relative overflow-hidden rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 backdrop-blur-md shadow-lg"
        >
            {/* Background Sony A1-style Cinematic Glows */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-sky-400/10 blur-[80px] pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400/10 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                    <Sparkles size={18} className={isLoading ? "animate-spin" : "animate-pulse"} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400/70">
                            AI Strategic Briefing
                        </h3>
                        {isLoading && (
                            <span className="text-[8px] font-bold text-sky-500/40 uppercase tracking-widest animate-pulse">
                                Analyzing Scenario...
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
                                className="text-sm font-semibold text-slate-100 leading-relaxed italic"
                            >
                                &ldquo;{briefing}&rdquo;
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};