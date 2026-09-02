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
  getDatasetFilenames,
  getCachedDashboardBundle,
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
  const [datasetNames, setDatasetNames] = useState<string[]>([]);
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
      const { rows, cid, userResult, opp, riskData } =
        await getCachedDashboardBundle();

      const st = await getAggregateDashboardStats(rows);
      const rev = await getAggregateRevenueChart("monthly", rows);
      const names = await getDatasetFilenames(rows);

      setCompanyId(cid);
      setUserId(userResult.data.user?.id);
      setStats(st);
      setRevenueData(rev);
      setOpportunities(opp.opportunities);
      setDatasetNames(names);

      setLoading(false);

      getAIRecommendations(riskData.risks, opp.opportunities).then(
        setRecommendations,
      );
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
        <div id="kpi-cards-section">
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
        </div>

        {/* range filter — sits right-aligned under Churn Rate card, hidden in KPI detail view */}
        {!isKPIActive && (
          <div className="flex justify-end">
            <RangeSwitcher />
          </div>
        )}

        {/* AnimatePresence router: main dashboard â†” summary KPI panel */}
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            if (localTab === null) {
              document
                .getElementById("kpi-cards-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        >
          {isKPIActive ? (
            <motion.div
              key={localTab}
              id="kpi-detail-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              onAnimationComplete={() => {
                document
                  .getElementById("kpi-detail-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
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
                  <AIChat dashboardStats={stats} datasetNames={datasetNames} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
