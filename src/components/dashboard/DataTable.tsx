"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, X, ExternalLink, ArrowUpDown } from 'lucide-react';
import { Transaction } from '../../data/mockData';
import { cn } from '../../lib/utils';

interface DataTableProps {
  transactions: Transaction[];
}

const STATUS_CONFIG = {
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  Refunded: 'bg-slate-500/10  text-slate-300  border-slate-500/20',
  Failed: 'bg-rose-500/10   text-rose-400   border-rose-500/20',
};

const highlightText = (text: string, query: string) => {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="text-sky-400 font-bold bg-sky-400/10 px-0.5 rounded not-italic">{part}</mark>
          : part
      )}
    </>
  );
};

export const DataTable: React.FC<DataTableProps> = ({ transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<'date' | 'amount' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const tableRef = useRef<HTMLDivElement>(null);
  const ITEMS = 10;

  useEffect(() => {
    const handler = (e: any) => { setSearchQuery(e.detail || ''); setLocalQuery(e.detail || ''); };
    window.addEventListener('globalSearch', handler);
    return () => window.removeEventListener('globalSearch', handler);
  }, []);

  const handleSort = (key: 'date' | 'amount') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let data = [...transactions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(tx =>
        tx.customer.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q)
      );
    }
    if (sortKey === 'amount') data.sort((a, b) => sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount);
    if (sortKey === 'date') data.sort((a, b) => sortDir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    return data;
  }, [transactions, searchQuery, sortKey, sortDir]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const start = (currentPage - 1) * ITEMS;
  const paginated = filtered.slice(start, start + ITEMS);

  const goTo = (page: number) => {
    setCurrentPage(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const SortBtn = ({ col }: { col: 'date' | 'amount' }) => (
    <button onClick={() => handleSort(col)} className="inline-flex items-center gap-1 hover:text-white transition-colors">
      <ArrowUpDown size={10} className={cn('transition-colors', sortKey === col ? 'text-sky-400' : 'text-slate-600')} />
    </button>
  );

  return (
    <>
      <motion.div
        ref={tableRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mt-6"
      >
        {/* top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-sky-400/20 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-white text-[11px] uppercase tracking-[0.18em]">
              Global Transactions
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {filtered.length} records
            </span>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-sky-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter records..."
              value={localQuery}
              onChange={e => { setLocalQuery(e.target.value); setSearchQuery(e.target.value); }}
              className="pl-9 pr-4 py-2 w-52 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-all"
            />
            {localQuery && (
              <button onClick={() => { setLocalQuery(''); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {[
                  { label: 'Transaction ID', key: null },
                  { label: 'Date', key: 'date' as const },
                  { label: 'Customer', key: null },
                  { label: 'Category', key: null },
                  { label: 'Amount', key: 'amount' as const },
                  { label: 'Status', key: null },
                ].map(col => (
                  <th
                    key={col.label}
                    className="px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortBtn col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout" initial={false}>
                {paginated.map((tx) => (
                  <motion.tr
                    layout
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSelectedTx(tx)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.025] group transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 group-hover:text-sky-400 transition-colors">
                      {tx.id}
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-500">{tx.date}</td>
                    <td className="px-5 py-3.5 text-[12px] font-bold text-slate-200">
                      {highlightText(tx.customer, searchQuery)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-white/[0.04] text-slate-400 rounded-lg border border-white/[0.06] text-[10px] font-bold">
                        {highlightText(tx.category, searchQuery)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] font-black text-white tabular-nums">
                      ${tx.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
                        STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.Pending
                      )}>
                        {tx.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-slate-600 text-sm font-bold">No transactions match "{searchQuery}"</p>
              <p className="text-slate-700 text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
          <p className="text-[10px] font-bold text-slate-600">
            {filtered.length === 0 ? '0' : start + 1}–{Math.min(start + ITEMS, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goTo(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-white hover:border-white/[0.14] disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="px-1 text-slate-600 text-[11px]">…</span>
                  : (
                    <button
                      key={p}
                      onClick={() => goTo(p as number)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-[11px] font-black transition-all',
                        currentPage === p
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'text-slate-500 hover:text-white border border-white/[0.06] hover:border-white/[0.14]'
                      )}
                    >
                      {p}
                    </button>
                  )
              )}

            <button
              onClick={() => goTo(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-white hover:border-white/[0.14] disabled:opacity-20 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Transaction Detail Modal ── */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedTx(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={e => e.stopPropagation()}
              className="relative rounded-2xl border border-white/[0.1] bg-[#080f1f] w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* top accent */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />

              {/* Header */}
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-0.5">Transaction</p>
                  <p className="font-mono text-sky-400 text-sm font-bold">{selectedTx.id}</p>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-2 rounded-xl border border-white/[0.06] text-slate-500 hover:text-white hover:border-white/[0.14] transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Amount + Status */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">Amount</p>
                    <p className="text-4xl font-black text-white tabular-nums">${selectedTx.amount.toLocaleString()}</p>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border',
                    STATUS_CONFIG[selectedTx.status] ?? STATUS_CONFIG.Pending
                  )}>
                    {selectedTx.status}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Customer', value: selectedTx.customer },
                    { label: 'Date', value: selectedTx.date },
                    { label: 'Category', value: selectedTx.category },
                    { label: 'Region', value: selectedTx.region },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600 mb-1">{label}</p>
                      <p className="text-[13px] font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex justify-end">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-white text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};