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
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
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
      className="relative flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* subtle top glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-sky-400/30 to-transparent pointer-events-none" />

      {/* Left: filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Label */}
        <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.18em] flex items-center gap-1.5">
          <Calendar size={12} className="text-slate-600" />
          Filters
        </span>

        {/* Range pills */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-0.5 text-[11px] font-bold text-slate-400">
          {ranges.map((range) => {
            const isActive = selectedRange === range.value;
            return (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={cn(
                  "relative px-4 py-1.5 rounded-[10px] transition-colors duration-200 text-[11px] font-bold",
                  isActive ? "text-white" : "hover:text-slate-300"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="filter-range-bg"
                    className="absolute inset-0 rounded-[10px] bg-sky-500"
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{range.label}</span>
              </button>
            );
          })}
        </div>

        {/* Category dropdown */}
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:border-white/[0.14] hover:text-white transition-all duration-200 cursor-pointer">
          <SlidersHorizontal size={12} className="text-slate-500" />
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
            className="bg-transparent outline-none appearance-none cursor-pointer text-slate-400 hover:text-white pr-1"
          >
            {categories.map(c => (
              <option key={c.value} value={c.value} className="bg-[#0f172a] text-slate-200">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Apply + Reset */}
        <div className="flex items-center gap-3 ml-1">
          <button
            onClick={handleApply}
            className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-400 hover:text-sky-300 transition-colors duration-200"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-300 transition-colors duration-200 flex items-center gap-1"
          >
            <RotateCcw size={10} />
            Reset
          </button>
        </div>
      </div>

      {/* Right: export button */}
      <motion.button
        onClick={handleExport}
        disabled={isExporting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 overflow-hidden",
          exported
            ? "bg-emerald-500 shadow-lg shadow-emerald-500/25 text-white"
            : "bg-sky-500 hover:bg-sky-400 shadow-lg shadow-sky-500/25 text-white"
        )}
      >
        <AnimatePresence mode="wait">
          {isExporting ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Exporting...
            </motion.div>
          ) : exported ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Exported!
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Download size={13} />
              Export Stats
            </motion.div>
          )}
        </AnimatePresence>

        {/* shimmer sweep */}
        <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      </motion.button>
    </motion.div>
  );
};
