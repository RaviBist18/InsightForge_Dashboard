"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, SlidersHorizontal, Download, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { TRANSACTIONS } from "@/data/mockData";

export const FiltersPanel: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlRange = searchParams.get("range") || "monthly";
  const urlCategory = searchParams.get("category") || "";

  const [selectedRange, setSelectedRange] = useState(urlRange);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ─── Step 1: add ref scroll function at top of component ───────────────────
  const scrollToChart = () => {
    setTimeout(() => {
      document.getElementById("mrr-chart")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  useEffect(() => {
    setSelectedRange(urlRange);
    setSelectedCategory(urlCategory);
  }, [urlRange, urlCategory]);

  const handleApply = async () => {
    setIsAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1200));
    const params = new URLSearchParams(searchParams.toString());

    if (selectedRange === "monthly") {
      params.delete("range");
    } else {
      params.set("range", selectedRange);
    }

    if (!selectedCategory) {
      params.delete("category");
    } else {
      params.set("category", selectedCategory);
    }

    router.push(`${pathname}?${params.toString()}`);
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setSelectedRange("monthly");
    setSelectedCategory("");
    router.push(pathname);
  };

  const handleExport = useCallback(async () => {
    if (!TRANSACTIONS || TRANSACTIONS.length === 0) return;
    setIsExporting(true);

    await new Promise((r) => setTimeout(r, 600));

    const headers = "Date,Entity,Category,Region,Amount,Status";
    const rows = TRANSACTIONS.map(
      (tx) =>
        `"${tx.date}","${tx.customer}","${tx.category}","${tx.region}","${tx.amount}","${tx.status}"`,
    ).join("\n");

    const blob = new Blob([`${headers}\n${rows}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `insightforge_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  }, []);

  const ranges = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annual" },
  ];

  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([{ value: "", label: "All Categories" }]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { supabase } = await import("@/lib/supabase");
      const { getCurrentCompanyId } = await import("@/lib/data");
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("category")
        .eq("company_id", companyId);
      if (error || !data) return;
      const unique: string[] = Array.from(
        new Set(data.map((d: any) => d.category as string).filter(Boolean)),
      );
      setCategories([
        { value: "", label: "All Categories" },
        ...unique.map((c: string) => ({ value: c, label: c })),
      ]);
    };
    fetchCategories();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden"
    >
      {/* ── Mobile layout: stacked ── */}
      <div className="flex flex-col gap-3 p-3 sm:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-[0.15em] flex items-center gap-1 flex-shrink-0">
            <Calendar size={11} className="text-[var(--text-muted)]" /> Filters
          </span>
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-0.5 flex-1">
            {ranges.map((range) => {
              const isActive = selectedRange === range.value;
              return (
                <button
                  key={range.value}
                  // ─── Step 2 — update range button onClick ─────────────────
                  onClick={() => {
                    setSelectedRange(range.value);
                    const params = new URLSearchParams(searchParams.toString());
                    if (range.value === "monthly") params.delete("range");
                    else params.set("range", range.value);
                    router.push(`${pathname}?${params.toString()}`, {
                      scroll: false,
                    });
                    scrollToChart(); // ← add this
                  }}
                  className={cn(
                    "relative flex-1 py-1.5 rounded-[10px] transition-colors duration-200 text-[11px] font-bold",
                    isActive ? "text-white" : "text-[var(--text-secondary)]",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="filter-range-bg-mobile"
                      className="absolute inset-0 rounded-[10px]"
                      style={{ background: "var(--accent)" }}
                      transition={{
                        type: "spring",
                        bounce: 0.18,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <span className="relative z-10">{range.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border)] px-2.5 py-1.5 rounded-xl flex-1 min-w-0">
            <SlidersHorizontal
              size={11}
              className="text-[var(--text-muted)] flex-shrink-0"
            />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const newVal = e.target.value;
                setSelectedCategory(newVal);
                const params = new URLSearchParams(searchParams.toString());
                if (newVal) {
                  params.set("category", newVal);
                } else {
                  params.delete("category");
                }
                router.push(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
                scrollToChart();
              }}
              className="bg-transparent outline-none appearance-none cursor-pointer text-[11px] font-bold text-[var(--text-secondary)] w-full min-w-0"
            >
              {categories.map((c) => (
                <option
                  key={c.value}
                  value={c.value}
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleApply}
            disabled={isAnalyzing}
            className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0 transition-colors"
            style={{ color: "var(--accent)" }}
          >
            {isAnalyzing ? "..." : "Apply"}
          </button>

          <button
            onClick={handleReset}
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0 flex items-center gap-0.5 transition-colors"
          >
            <RotateCcw size={9} /> Reset
          </button>
        </div>

        <motion.button
          onClick={handleExport}
          disabled={isExporting}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "relative flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 text-white",
            exported ? "bg-[var(--success)]" : "hover:opacity-90",
          )}
          style={!exported ? { background: "var(--accent)" } : {}}
        >
          <AnimatePresence mode="wait">
            {isExporting ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Exporting...
              </motion.span>
            ) : exported ? (
              <motion.span
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Exported!
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Download size={13} /> Export Stats
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Desktop layout: horizontal ── */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 py-3 px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-[0.18em] flex items-center gap-1.5">
            <Calendar size={12} className="text-[var(--text-muted)]" /> Filters
          </span>

          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-0.5 text-[11px] font-bold text-[var(--text-secondary)]">
            {ranges.map((range) => {
              const isActive = selectedRange === range.value;
              return (
                <button
                  key={range.value}
                  // ─── Step 2 — update range button onClick ─────────────────
                  onClick={() => {
                    setSelectedRange(range.value);
                    const params = new URLSearchParams(searchParams.toString());
                    if (range.value === "monthly") params.delete("range");
                    else params.set("range", range.value);
                    router.push(`${pathname}?${params.toString()}`, {
                      scroll: false,
                    });
                    scrollToChart(); // ← add this
                  }}
                  className={cn(
                    "relative px-4 py-1.5 rounded-[10px] transition-colors duration-200 text-[11px] font-bold",
                    isActive
                      ? "text-white"
                      : "hover:text-[var(--text-primary)]",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="filter-range-bg"
                      className="absolute inset-0 rounded-[10px]"
                      style={{ background: "var(--accent)" }}
                      transition={{
                        type: "spring",
                        bounce: 0.18,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <span className="relative z-10">{range.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
            <SlidersHorizontal size={12} className="text-[var(--text-muted)]" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                const newVal = e.target.value;
                setSelectedCategory(newVal);
                const params = new URLSearchParams(searchParams.toString());
                if (newVal) {
                  params.set("category", newVal);
                } else {
                  params.delete("category");
                }
                router.push(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
                scrollToChart();
              }}
              className="bg-transparent outline-none appearance-none cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] pr-1"
            >
              {categories.map((c) => (
                <option
                  key={c.value}
                  value={c.value}
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 ml-1">
            <button
              onClick={handleApply}
              disabled={isAnalyzing}
              className="text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-200 flex items-center gap-1"
              style={{ color: "var(--accent)" }}
            >
              {isAnalyzing ? (
                <>
                  <svg
                    className="w-3 h-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Applying...
                </>
              ) : (
                "Apply Filters"
              )}
            </button>

            <button
              onClick={handleReset}
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </div>

        <motion.button
          onClick={handleExport}
          disabled={isExporting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 overflow-hidden text-white",
            exported
              ? "bg-[var(--success)] shadow-md"
              : "hover:opacity-90 shadow-md",
          )}
          style={!exported ? { background: "var(--accent)" } : {}}
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
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
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
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
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
                <Download size={13} /> Export Stats
              </motion.div>
            )}
          </AnimatePresence>
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </motion.button>
      </div>
    </motion.div>
  );
};
