"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const CEOBriefing = () => {
    const searchParams = useSearchParams();
    const range = searchParams.get('range') || 'monthly';
    const category = searchParams.get('category') || 'all';

    const getBriefing = () => {
        // Priority 1: Specific Subscription Tier Insights
        if (category === 'enterprise') {
            return "Enterprise retention is stable, but high API usage in Europe suggests regional tier optimization.";
        }
        if (category === 'pro') {
            return "Pro tier is your fastest-growing segment. Analyze 'Starter' upgrade paths to maximize your Profit Forge.";
        }
        if (category === 'starter') {
            return "Starter tier churn is 2% higher than the market benchmark. Consider simplifying onboarding for better efficiency.";
        }

        // Priority 2: Time-Scale Strategic Insights
        switch (range) {
            case 'daily':
                return "Daily volume is up 2%, but sentiment in Asia is ⚠️. Monitor Starter tier churn over the next 24 hours.";
            case 'weekly':
                return "Weekly efficiency is high. NewsAPI highlights tech sector growth—ideal window for Pro-tier promotions.";
            case 'monthly':
                return "Monthly health is strong. Net Efficiency is stable with minimal tech overhead after Vercel/API costs.";
            case 'quarterly':
                return "Q2 growth beats market benchmarks by 5%. Strategic opportunity: Reinvest Enterprise surplus into R&D.";
            case 'annually':
                return "Annual revenue shows high stability. Prepare for 2027 scaling by optimizing European server and API costs.";
            default:
                return "Overall MRR is healthy. Internal growth outpaces market benchmarks by 5%. Stay the course.";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 relative overflow-hidden rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 backdrop-blur-md"
        >
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-400/10 text-sky-400">
                    <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400/70">AI Strategic Briefing</h3>
                    <div className="overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={getBriefing()} // Triggers animation on text change
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.3 }}
                                className="text-sm font-medium text-slate-200"
                            >
                                {getBriefing()}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            {/* Background Ambient Glow for Sony A1 Aesthetic */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-sky-400/10 blur-[80px] pointer-events-none" />
        </motion.div>
    );
};