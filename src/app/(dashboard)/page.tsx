import { KPISection } from '@/components/dashboard/KPISection';
import { FiltersPanel } from '@/components/dashboard/FiltersPanel';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTable } from '@/components/dashboard/DataTable';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { RealTimeDashboard } from '@/components/dashboard/RealTimeDashboard';
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
  const range = resolvedSearchParams.range || '30d';
  const category = resolvedSearchParams.category || '';

  // Parallel fetching using the DAL
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

  return (
    <>
      <header className="mb-8 px-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <span>Enterprise Dashboard</span>
          <span className="opacity-30">/</span>
          <span className="text-sky-400">Executive Summary</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          InsightForge Intelligence
        </h1>
        <p className="text-slate-400 mt-1">
          Real-time tracking for revenue, operational efficiency, and market trends.
        </p>
      </header>

      <div className="space-y-6">
        {/* KPI Metrics */}
        <KPISection stats={stats} category={category} range={range} />

        {/* Filters and Controls */}
        <FiltersPanel />

        {/* Charts visualization */}
        <ChartsSection
          revenueData={revenueData}
          categoryData={categoryData}
          regionData={regionData}
        />

        {/* AI Generated Insights */}
        <InsightsPanel insights={insights} />

        {/* Real-Time Intelligence */}
        <RealTimeDashboard />

        {/* Transaction Table */}
        <DataTable transactions={transactions} />
      </div>
    </>
  );
}

