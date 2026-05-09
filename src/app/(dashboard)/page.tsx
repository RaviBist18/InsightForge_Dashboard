import { KPISection } from '@/components/dashboard/KPISection';
import { FiltersPanel } from '@/components/dashboard/FiltersPanel';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTable, ForensicNode } from '@/components/dashboard/DataTable';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { RealTimeDashboard } from '@/components/dashboard/RealTimeDashboard';
import { CEOBriefing } from '@/components/CEOBriefing';
import {
  getTransactions,
  getInsights,
  getDashboardStats,
  getRevenueData,
  getCategoryData,
  getRegionData
} from '@/lib/data';

export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string, category?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const range = resolvedSearchParams.range || 'monthly';
  const category = resolvedSearchParams.category || '';

  const [
    transactions,
    insights,
    stats,
    revenueData,
    categoryData,
    regionData
  ] = await Promise.all([
    getTransactions(range),
    getInsights(range),
    getDashboardStats(range),
    getRevenueData(range),
    getCategoryData(range),
    getRegionData(range)
  ]);

  // ─── THE DATA FORGE: MAPPING RAW DATA TO FORENSIC NODES ──────────────────
  // This step ensures end-to-end connectivity
  const forensicNodes: ForensicNode[] = (transactions || []).map((tx: any) => ({
    id: tx.id,
    hash: tx.id.startsWith('0x') ? tx.id : `0x${tx.id.substring(0, 10)}...`, // Forensic Hash
    velocity: "Real-time", // Settlement Velocity
    entity: tx.customer || "Global Node", // Entity / Node
    intent: tx.category || "Strategic Function", // Strategic Function
    correlation: "Optimizing Portfolio", // Market Correlation
    alpha: tx.amount, // Growth Fuel
    audit: tx.status === 'Completed' ? 'Verified' : 'Forensic Audit', // Audit Integrity
    type: 'transaction',
    metadata: {
      iso_timestamp: new Date().toISOString(),
      shutter_speed: "1/200", // Sony A1 Emulation
      network_load: "Optimal"
    },
    briefing: {
      status: "Verified financial movement.",
      context: "Forging internal data with global market trends.",
      action: "Maintain liquidity buffer."
    }
  }));

  return (
    <>
      <header className="mb-8 px-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <span>Enterprise Dashboard</span>
          <span className="opacity-30">/</span>
          <span className="text-sky-400">Executive Summary</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">InsightForge Intelligence</h1>
        <p className="text-slate-400 mt-1">Real-time tracking for revenue and market trends.</p>
      </header>

      <div className="space-y-6">
        <CEOBriefing efficiency={stats?.efficiency || 0} newsHeadline={stats?.latestNews || "Market stable"} />
        <KPISection stats={stats} category={category} range={range} />
        <FiltersPanel />
        <ChartsSection revenueData={revenueData} categoryData={categoryData} regionData={regionData} category={category} range={range} />
        <InsightsPanel insights={insights} />
        <RealTimeDashboard />


        <DataTable nodes={forensicNodes} />
      </div>
    </>
  );
}