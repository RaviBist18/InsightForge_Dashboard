"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, SlidersHorizontal, Download, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { TRANSACTIONS } from '@/data/mockData';

export const FiltersPanel: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlRange = searchParams.get('range') || '30d';
  const urlCategory = searchParams.get('category') || '';

  const [selectedRange, setSelectedRange] = useState(urlRange);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    setSelectedRange(urlRange);
    setSelectedCategory(urlCategory);
  }, [urlRange, urlCategory]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedRange === '30d') params.delete('range');
    else params.set('range', selectedRange);
    if (!selectedCategory) params.delete('category');
    else params.set('category', selectedCategory);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setSelectedRange('30d');
    setSelectedCategory('');
    router.push('/');
  };

  const handleExport = useCallback(async () => {
    if (!TRANSACTIONS || TRANSACTIONS.length === 0) return;
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 600));
    const headers = 'Date,Entity,Category,Region,Amount,Status';
    const rows = TRANSACTIONS.map(tx =>
      `"${tx.date}","${tx.customer}","${tx.category}","${tx.region}","${tx.amount}","${tx.status}"`
    ).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `insightforge_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  }, []);

  const ranges = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
  ];

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'profit', label: 'Profit' },
    { value: 'users', label: 'Users' },
    { value: 'orders', label: 'Orders' },
    { value: 'churn', label: 'Churn Rate' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-sky-400/30 to-transparent pointer-events-none" />

      {/* ── Mobile layout: stacked ── */}
      <div className="flex flex-col gap-3 p-3 sm:hidden">
        {/* Row 1: Filters label + range pills */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.15em] flex items-center gap-1 flex-shrink-0">
            <Calendar size={11} className="text-slate-600" /> Filters
          </span>
          <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-0.5 flex-1">
            {ranges.map((range) => {
              const isActive = selectedRange === range.value;
              return (
                <button
                  key={range.value}
                  onClick={() => setSelectedRange(range.value)}
                  className={cn(
                    'relative flex-1 py-1.5 rounded-[10px] transition-colors duration-200 text-[11px] font-bold',
                    isActive ? 'text-white' : 'text-slate-400'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="filter-range-bg-mobile"
                      className="absolute inset-0 rounded-[10px]"
                      style={{ background: 'var(--accent)' }}
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{range.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Category + Apply + Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 rounded-xl flex-1 min-w-0">
            <SlidersHorizontal size={11} className="text-slate-500 flex-shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const newVal = e.target.value;
                setSelectedCategory(newVal);
                const params = new URLSearchParams(searchParams.toString());
                if (newVal) params.set('category', newVal);
                else params.delete('category');
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="bg-transparent outline-none appearance-none cursor-pointer text-[11px] font-bold text-slate-400 w-full min-w-0"
            >
              {categories.map(c => (
                <option key={c.value} value={c.value} className="bg-[#0f172a] text-slate-200">{c.label}</option>
              ))}
            </select>
          </div>

          <button onClick={handleApply}
            className="text-[10px] font-black uppercase tracking-widest flex-shrink-0 transition-colors"
            style={{ color: 'var(--accent)' }}>
            Apply
          </button>
          <button onClick={handleReset}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 flex-shrink-0 flex items-center gap-0.5 transition-colors">
            <RotateCcw size={9} /> Reset
          </button>
        </div>

        {/* Row 3: Export button full width */}
        <motion.button
          onClick={handleExport} disabled={isExporting}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'relative flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 text-white',
            exported ? 'bg-emerald-500' : 'hover:opacity-90'
          )}
          style={!exported ? { background: 'var(--accent)' } : {}}
        >
          <AnimatePresence mode="wait">
            {isExporting ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Exporting...
              </motion.span>
            ) : exported ? (
              <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                Exported!
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Download size={13} /> Export Stats
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Desktop layout: horizontal ── */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 py-3 px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.18em] flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-600" /> Filters
          </span>

          <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-0.5 text-[11px] font-bold text-slate-400">
            {ranges.map((range) => {
              const isActive = selectedRange === range.value;
              return (
                <button key={range.value} onClick={() => setSelectedRange(range.value)}
                  className={cn('relative px-4 py-1.5 rounded-[10px] transition-colors duration-200 text-[11px] font-bold', isActive ? 'text-white' : 'hover:text-slate-300')}>
                  {isActive && (
                    <motion.div layoutId="filter-range-bg"
                      className="absolute inset-0 rounded-[10px]"
                      style={{ background: 'var(--accent)' }}
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{range.label === '7D' ? '7 Days' : range.label === '30D' ? '30 Days' : '90 Days'}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:border-white/[0.14] hover:text-white transition-all cursor-pointer">
            <SlidersHorizontal size={12} className="text-slate-500" />
            <select value={selectedCategory}
              onChange={(e) => {
                const newVal = e.target.value;
                setSelectedCategory(newVal);
                const params = new URLSearchParams(searchParams.toString());
                if (newVal) params.set('category', newVal);
                else params.delete('category');
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="bg-transparent outline-none appearance-none cursor-pointer text-slate-400 hover:text-white pr-1"
            >
              {categories.map(c => (
                <option key={c.value} value={c.value} className="bg-[#0f172a] text-slate-200">{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 ml-1">
            <button onClick={handleApply}
              className="text-[10px] font-black uppercase tracking-[0.16em] transition-colors duration-200"
              style={{ color: 'var(--accent)' }}>
              Apply Filters
            </button>
            <button onClick={handleReset}
              className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </div>

        <motion.button
          onClick={handleExport} disabled={isExporting}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className={cn(
            'relative flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 overflow-hidden text-white',
            exported ? 'bg-emerald-500 shadow-lg shadow-emerald-500/25' : 'hover:opacity-90 shadow-lg'
          )}
          style={!exported ? { background: 'var(--accent)' } : {}}
        >
          <AnimatePresence mode="wait">
            {isExporting ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Exporting...
              </motion.div>
            ) : exported ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                Exported!
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Download size={13} /> Export Stats
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </motion.button>
      </div>
    </motion.div>
  );
};