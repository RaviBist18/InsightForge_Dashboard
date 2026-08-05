"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { KPISection } from "@/components/dashboard/KPISection";
import { FiltersPanel } from "@/components/dashboard/FiltersPanel";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { DataTable, ForensicNode } from "@/components/dashboard/DataTable";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { RealTimeDashboard } from "@/components/dashboard/RealTimeDashboard";
import { AIChat } from "@/components/dashboard/AIChat";
import { CEOBriefing } from "@/components/CEOBriefing";
import { AddNodeModal } from "@/components/dashboard/AddNodeModal";
import { KPIDetailClient } from "@/components/dashboard/KPIDetailClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  getTransactions,
  getInsights,
  getDashboardStats,
  getRevenueData,
  getCategoryData,
  getRegionData,
} from "@/lib/data";

// KPI slugs that trigger the detail panel
const KPI_SLUGS = new Set([
  "total-revenue",
  "total-profit",
  "profit-margin",
  "total-orders",
  "active-users",
  "churn-rate",
]);

export default function Home({ searchParams }: { searchParams: any }) {
  // 1. State Management
  const [nodes, setNodes] = useState<ForensicNode[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>([]);
  const [categoryData, setCategoryData] = useState<any>([]);
  const [regionData, setRegionData] = useState<any>([]);
  const [insights, setInsights] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  // Active KPI tab — null = main dashboard, slug string = detail panel
  const [localTab, setLocalTab] = useState<string | null>(null);
  useWorkspace();

  const tableRef = useRef<HTMLDivElement>(null);
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
      const range = "monthly";
      const [tx, ins, st, rev, cat, reg] = await Promise.all([
        getTransactions(range),
        getInsights(range),
        getDashboardStats(range),
        getRevenueData(range),
        getCategoryData(range),
        getRegionData(range),
      ]);

      const initialNodes: ForensicNode[] = (tx || []).map((tx: any) => {
        const stringId = String(tx.id || "");
        return {
          id: stringId,
          status: tx.status === "Completed" ? "Settled" : "Pending",
          entity: tx.customer || "Unknown",
          category: tx.category || "General",
          amount: tx.amount,
          audit: tx.status === "Completed" ? "Verified" : "Needs Review",
          type: "transaction",
          metadata: {
            timestamp: new Date().toISOString(),
          },
          briefing: {
            status:
              tx.status === "Completed"
                ? "Payment confirmed."
                : "Awaiting settlement.",
            context: `${tx.category || "Transaction"} from ${tx.customer || "customer"}.`,
            action:
              tx.status === "Completed"
                ? "No action needed."
                : "Follow up with customer.",
          },
        };
      });

      setNodes(initialNodes);
      setStats(st);
      setInsights(ins);
      setRevenueData(rev);
      setCategoryData(cat);
      setRegionData(reg);
      setLoading(false);
    }
    initDashboard();
  }, []);

  // 4. Handlers
  const handleAddNode = (newNode: ForensicNode) => {
    setNodes((prev) => [newNode, ...prev]);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== id));
  };

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
            <span>Dashboard</span>
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white transition-colors"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={14} /> Add Entity
          </button>
        </div>
      </header>

      <div className="space-y-6 px-4 pb-20">
        <CEOBriefing efficiency={stableEfficiency} newsHeadline={stableNews} />

        {/* KPI cards — always visible, clicking sets localTab */}
        {/* FIX: no category/range props — KPISection only accepts { stats } */}
        <KPISection
          stats={stats}
          onCardClick={(slug) => setLocalTab(slug)}
          allowedSlugs={[
            "total-revenue",
            "total-profit",
            "profit-margin",
            "total-orders",
            "active-users",
            "churn-rate",
          ]}
        />

        {/* AnimatePresence router: main dashboard ↔ summary KPI panel */}
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
              <FiltersPanel />
              <ChartsSection
                revenueData={revenueData}
                categoryData={categoryData}
                regionData={regionData}
                category=""
                range="monthly"
              />
              <InsightsPanel insights={insights} />
              <RealTimeDashboard />

              <div ref={tableRef} className="pt-4">
                <DataTable nodes={nodes} onDelete={handleDeleteNode} />
              </div>

              <AIChat nodes={nodes} stats={stats} />
            </motion.div>
          )}
        </AnimatePresence>

        <AddNodeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddNode}
        />
      </div>
    </div>
  );
}
