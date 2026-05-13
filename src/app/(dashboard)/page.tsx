"use client"; // Required for state management and real-time updates

import { useState, useEffect, useRef } from 'react';
import { KPISection } from '@/components/dashboard/KPISection';
import { FiltersPanel } from '@/components/dashboard/FiltersPanel';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTable, ForensicNode } from '@/components/dashboard/DataTable';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { RealTimeDashboard } from '@/components/dashboard/RealTimeDashboard';
import { AIChat } from '@/components/dashboard/AIChat';
import { CEOBriefing } from '@/components/CEOBriefing';
import { AddNodeModal } from '@/components/dashboard/AddNodeModal';
import {
  getTransactions,
  getInsights,
  getDashboardStats,
  getRevenueData,
  getCategoryData,
  getRegionData
} from '@/lib/data';

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

  const tableRef = useRef<HTMLDivElement>(null);

  // 2. Fetch Initial Data
  useEffect(() => {
    async function initDashboard() {
      const range = 'monthly';
      const [tx, ins, st, rev, cat, reg] = await Promise.all([
        getTransactions(range),
        getInsights(range),
        getDashboardStats(range),
        getRevenueData(range),
        getCategoryData(range),
        getRegionData(range)
      ]);

      const initialNodes: ForensicNode[] = (tx || []).map((tx: any) => {
        // 1. Force the ID to a string to prevent the crash
        const stringId = String(tx.id || '');

        return {
          id: stringId,
          // 2. Safely perform string operations on the new stringId
          hash: stringId.startsWith('0x')
            ? stringId
            : `0x${stringId.substring(0, 10)}${stringId.length > 10 ? '...' : ''}`,
          velocity: "Real-time",
          entity: tx.customer || "Global Node",
          intent: tx.category || "Strategic Function",
          correlation: "Optimizing Portfolio",
          alpha: tx.amount,
          audit: tx.status === 'Completed' ? 'Verified' : 'Forensic Audit',
          type: 'transaction',
          metadata: {
            iso_timestamp: new Date().toISOString(),
            shutter_speed: "1/200",
            network_load: "Optimal"
          },
          briefing: {
            status: "Verified financial movement.",
            context: "Forging internal data with global market trends.",
            action: "Maintain liquidity buffer."
          }
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

  // 3. ─── LIVE PULSE ENGINE ───
  // This effect simulates live daily fluctuations by randomly updating alpha values
  // Inside Home component in page.tsx
  useEffect(() => {
    if (nodes.length === 0 || loading) return;

    const pulseEngine = setInterval(() => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const currentAlpha = typeof node.alpha === 'string' ? parseFloat(node.alpha) : node.alpha;

          // Randomly shift every node by +/- 1%
          const changePercent = 1 + (Math.random() * 0.02 - 0.01);
          const newAlpha = Math.max(0.01, currentAlpha * changePercent);

          return {
            ...node,
            prevAlpha: currentAlpha, // Store the old value for comparison
            alpha: newAlpha.toFixed(2),
          };
        })
      );
    }, 4000); // Pulse every 4 seconds

    return () => clearInterval(pulseEngine);
  }, [nodes.length, loading]);

  // 4. Handlers
  const handleAddNode = (newNode: ForensicNode) => {
    setNodes((prev) => [newNode, ...prev]);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter(node => node.id !== id));
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-sky-500 font-black italic uppercase tracking-widest">Initializing InsightForge...</div>;

  return (
    <div className="min-h-screen bg-[#020617] selection:bg-sky-500/30">
      <header className="mb-8 px-2 flex justify-between items-end pt-6">
        <div className="px-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            <span>Enterprise Dashboard</span>
            <span className="opacity-30">/</span>
            <span className="text-sky-400">Executive Summary</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">InsightForge Intelligence</h1>
          <p className="text-slate-400 mt-1">Real-time tracking for revenue and market trends.</p>
        </div>

        <div className="pb-1 px-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20"
          >
            Forge New Node
          </button>
        </div>
      </header>

      <div className="space-y-6 px-4 pb-20">
        <CEOBriefing efficiency={stats?.efficiency || 0} newsHeadline={stats?.latestNews || "Market stable"} />
        <KPISection stats={stats} />
        <FiltersPanel />
        <ChartsSection revenueData={revenueData} categoryData={categoryData} regionData={regionData} category="" range="monthly" />
        <InsightsPanel insights={insights} />
        <RealTimeDashboard />

        <div ref={tableRef} className="pt-4">
          <DataTable nodes={nodes} onDelete={handleDeleteNode} />
        </div>

        <AIChat nodes={nodes} stats={stats} />

        <AddNodeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddNode}
        />
      </div>
    </div>
  );
}