"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight, X, Crosshair, Zap,
  ShieldCheck, Target, UserPlus, Globe, ArrowUpDown,
  Activity, Fingerprint, Database, Cpu, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────

export interface ForensicNode {
  id: string;
  hash: string;
  velocity: string;
  entity: string;
  intent: string;
  correlation: string;
  alpha: number | string;
  audit: 'Verified' | 'Forensic Audit';
  type: 'transaction' | 'node_activation';
  metadata: {
    gas_fee?: string;
    block_depth?: number;
    network_load?: string;
    iso_timestamp: string;
    shutter_speed: string;
  };
  briefing: {
    status: string;
    context: string;
    action: string;
  };
}

interface DataTableProps {
  nodes?: ForensicNode[];
  onDelete: (id: string) => void;
}

const AUDIT_CONFIG = {
  Verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
  'Forensic Audit': 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
};

// ─── SUB-COMPONENT: VIEWFINDER FOCUS (MODAL) ────────────────────────────

const ViewfinderFocus = ({ node, onClose }: { node: ForensicNode; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        className="relative bg-[#050a15] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        {/* CRT Scanline Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />

        <div className="p-10 relative z-10">
          <div className="flex justify-between items-start mb-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <Crosshair size={20} className="text-sky-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Manual Focus Mode</h4>
                <p className="text-[11px] font-mono text-sky-400 mt-1">{node.hash}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <section>
                <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={10} /> CEO Briefing [Status]
                </h5>
                <p className="text-sm text-slate-200 leading-relaxed italic font-medium">"{node.briefing.status}"</p>
              </section>
              <section>
                <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Globe size={10} /> Market Correlation [Context]
                </h5>
                <p className="text-sm text-slate-200 leading-relaxed italic font-medium">"{node.briefing.context}"</p>
              </section>
              <div className="p-5 rounded-2xl bg-sky-500/5 border border-sky-400/20">
                <h5 className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Target size={12} /> Prescriptive Action
                </h5>
                <p className="text-xs text-white font-black uppercase tracking-tight leading-snug">{node.briefing.action}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Raw Forensic Metadata</h5>
              {[
                { label: 'ISO Timestamp', value: node.metadata.iso_timestamp, icon: Cpu },
                { label: 'Network Load', value: node.metadata.network_load, icon: Activity },
                { label: 'Block Depth', value: node.metadata.block_depth, icon: Database },
                { label: 'Gas Velocity', value: node.metadata.gas_fee || 'N/A', icon: Zap },
              ].map((meta, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <meta.icon size={10} className="text-slate-600" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{meta.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">{meta.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-[0.4em]">
            <span>Hardware: Sony A1 Master Engine</span>
            <span>Lens: 85mm f1.4 // Shutter: {node.metadata.shutter_speed}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────

export const DataTable: React.FC<DataTableProps> = ({ nodes = [], onDelete = () => { } }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<ForensicNode | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ForensicNode | null, dir: 'asc' | 'desc' }>({ key: null, dir: 'desc' });
  const ITEMS_PER_PAGE = 10;

  const handleSort = (key: keyof ForensicNode) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredNodes = useMemo(() => {
    let result = nodes.filter(n =>
      n.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.hash.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [nodes, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / ITEMS_PER_PAGE));
  const paginated = filteredNodes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative rounded-[2rem] border border-white/[0.08] bg-[#050a15]/80 backdrop-blur-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
      >
        {/* Table Header Section */}
        <div className="px-8 py-6 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 relative z-10">
                <Fingerprint className="w-6 h-6 text-sky-400" />
              </div>
              <div className="absolute inset-0 bg-sky-400/20 blur-xl animate-pulse" />
            </div>
            <div>
              <h2 className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Forensic Intelligence Ledger</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Connectivity: {nodes.length > 0 ? 'Active' : 'Awaiting Data'}
                </span>
              </div>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-sky-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter Nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-6 py-3 w-full md:w-80 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-[11px] text-white focus:outline-none focus:border-sky-500/40 transition-all placeholder:uppercase placeholder:tracking-widest"
            />
          </div>
        </div>

        {/* The Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.01]">
                {[
                  { label: 'Forensic Hash', key: 'hash' },
                  { label: 'Settlement Velocity', key: 'velocity' },
                  { label: 'Entity / Node', key: 'entity' },
                  { label: 'Strategic Function', key: 'intent' },
                  { label: 'Market Correlation', key: 'correlation' },
                  { label: 'Growth Fuel', key: 'alpha' },
                  { label: 'Audit Integrity', key: 'audit' },
                  { label: '', key: null }
                ].map((col, i) => (
                  <th key={i} className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-white/[0.04]">
                    {col.key ? (
                      <button onClick={() => handleSort(col.key as any)} className="flex items-center gap-2 hover:text-sky-400 transition-colors uppercase">
                        {col.label} <ArrowUpDown size={10} />
                      </button>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {paginated.length > 0 ? paginated.map((node) => (
                <tr
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="group hover:bg-white/[0.02] transition-all cursor-pointer"
                >
                  <td className="px-8 py-5 font-mono text-[11px] text-slate-500 group-hover:text-sky-400 transition-colors">{node.hash}</td>
                  <td className="px-8 py-5 text-[11px] font-bold text-slate-400 tracking-tight">{node.velocity}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        {node.type === 'node_activation' ? <UserPlus size={14} className="text-emerald-400" /> : <Globe size={14} className="text-sky-400" />}
                      </div>
                      <span className="text-[12px] font-black text-white uppercase tracking-tighter">{node.entity}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
                      {node.intent}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2.5">
                      <Zap size={12} className="text-sky-400 animate-pulse" />
                      <span className="text-[11px] font-bold text-sky-400/80 italic tracking-tight">{node.correlation}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <div className="inline-block">
                      <p className="text-[13px] font-black text-white tabular-nums tracking-tighter">
                        {/* Clean Currency formatting */}
                        ${Number(node.alpha).toLocaleString()}
                      </p>
                      <div className="h-[1.5px] w-full bg-gradient-to-r from-sky-500/50 to-transparent mt-1" />
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border',
                      AUDIT_CONFIG[node.audit]
                    )}>
                      {node.audit}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {/* Prune/Delete Node Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening viewfinder
                        onDelete(node.id);
                      }}
                      className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                      title="Prune Node"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No Nodes Detected in Current Cycle</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="px-8 py-5 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Showing {paginated.length} of {filteredNodes.length} nodes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-white/[0.08] text-slate-500 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 text-[11px] font-black text-white tabular-nums tracking-tighter">
              PAGE {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-white/[0.08] text-slate-500 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* The Viewfinder Focus (Manual Focus Mode Popup) */}
      <AnimatePresence>
        {selectedNode && (
          <ViewfinderFocus
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};