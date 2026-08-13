"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { KPISection } from "@/components/dashboard/KPISection";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { RangeSwitcher } from "@/components/dashboard/RangeSwitcher";
import { AIChat } from "@/components/dashboard/AIChat";
import { CEOBriefing } from "@/components/CEOBriefing";
import { KPIDetailClient } from "@/components/dashboard/KPIDetailClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { supabase } from "@/lib/supabase";
import { OpportunitiesPanel } from "@/components/dashboard/OpportunitiesPanel";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";

import {
  getAggregateDashboardStats,
  getAggregateRevenueChart,
  getCurrentCompanyId,
  getAggregateOpportunities,
  getAggregateRisks,
  getAIRecommendations,
  type Recommendation,
} from "@/lib/data";
import Link from "next/link";

// KPI slugs that trigger the detail panel
const KPI_SLUGS = new Set([
  "total-revenue",
  "total-profit",
  "profit-margin",
  "total-orders",
  "active-users",
  "churn-rate",
]);

export default function Home() {
  // 1. State Management
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [opportunities, setOpportunities] = useState<any>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  // Active KPI tab — null = main dashboard, slug string = detail panel
  const [localTab, setLocalTab] = useState<string | null>(null);
  useWorkspace();

  const stableEfficiency = useMemo(
    () => stats?.efficiency ?? 0,
    [stats?.efficiency],
  );
  const stableNews = useMemo(
    () => stats?.latestNews ?? "Market stable",
    [stats?.latestNews],
  );

  // 2. Fetch Initial Data
  useEffect(() => {
    async function initDashboard() {
      const [st, rev, cid, userResult, opp] = await Promise.all([
        getAggregateDashboardStats(),
        getAggregateRevenueChart(),
        getCurrentCompanyId(),
        supabase.auth.getUser(),
        getAggregateOpportunities(),
      ]);
      setCompanyId(cid);
      setUserId(userResult.data.user?.id);
      setStats(st);
      setRevenueData(rev);
      setOpportunities(opp.opportunities);

      const riskData = await getAggregateRisks();
      const recs = await getAIRecommendations(
        riskData.risks,
        opp.opportunities,
      );
      setRecommendations(recs);

      setLoading(false);
    }
    initDashboard();
  }, []);

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center gap-2"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-secondary)",
        }}
      >
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color: "var(--accent)" }}
        />
        <span className="text-[13px] font-medium">Loading dashboard...</span>
      </div>
    );

  const isKPIActive = localTab !== null && KPI_SLUGS.has(localTab);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="mb-8 px-2 flex justify-between items-end pt-6">
        <div className="px-4">
          <div
            className="flex items-center gap-2 text-[12px] mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            <button
              onClick={() => setLocalTab(null)}
              className="hover:underline cursor-pointer"
            >
              Dashboard
            </button>
            <span className="opacity-40">/</span>
            <span style={{ color: "var(--accent)" }}>Overview</span>
          </div>
          <h1
            className="text-[22px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Overview
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Real-time tracking for revenue and market trends
          </p>
        </div>

        <div className="pb-1 px-4 flex items-center gap-3">
          {/* Back button when a KPI panel is open */}
          {isKPIActive && (
            <button
              onClick={() => setLocalTab(null)}
              className="px-4 py-2 rounded-xl text-[12px] font-medium transition-colors"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              ← Dashboard
            </button>
          )}
          <Link
            href="/dashboard/datasets"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white transition-colors"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={14} /> Upload Dataset
          </Link>
        </div>
      </header>

      <div className="space-y-6 px-4 pb-20">
        <CEOBriefing efficiency={stableEfficiency} newsHeadline={stableNews} />

        {/* KPI cards — always visible, clicking sets localTab */}
        {/* FIX: no category/range props — KPISection only accepts { stats } */}
        <KPISection
          stats={stats}
          activeSlug={localTab}
          onCardClick={(slug) => setLocalTab(localTab === slug ? null : slug)}
          estimatedSlugs={["total-profit", "profit-margin"]}
          allowedSlugs={[
            "total-revenue",
            "total-profit",
            "profit-margin",
            "total-orders",
            "active-users",
            "churn-rate",
          ]}
        />

        {/* range filter — sits right-aligned under Churn Rate card */}
        <div className="flex justify-end">
          <RangeSwitcher />
        </div>

        {/* AnimatePresence router: main dashboard â†” summary KPI panel */}
        <AnimatePresence mode="wait">
          {isKPIActive ? (
            <motion.div
              key={localTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <KPIDetailClient
                slug={localTab}
                stats={stats}
                analytics={{}}
                viewMode="summary"
                onBack={() => setLocalTab(null)}
                userId={userId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="main-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {stats?.datasetCount === 0 ? (
                <div
                  className="text-center py-20 text-[13px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No datasets uploaded yet.{" "}
                  <Link
                    href="/dashboard/datasets"
                    className="underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Upload your first CSV
                  </Link>{" "}
                  to see live KPIs here.
                </div>
              ) : (
                <div
                  id="revenue-trend-section"
                  style={{ scrollMarginTop: "64px" }}
                >
                  <ChartsSection
                    revenueData={revenueData}
                    categoryData={[]}
                    range={undefined}
                  />

                  <OpportunitiesPanel opportunities={opportunities} />
                  <RecommendationsPanel recommendations={recommendations} />
                  <AIChat dashboardStats={stats} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
