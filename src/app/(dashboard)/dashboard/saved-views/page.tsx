"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Plus, Trash2, ExternalLink, Clock, Filter, X, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SavedView {
  id: string;
  name: string;
  description: string;
  range: string;
  category: string;
  createdAt: string;
  color: string;
}

const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#f472b6', '#fbbf24'];

const DEFAULT_VIEWS: SavedView[] = [
  { id: '1', name: 'Monthly Overview', description: '30-day all categories', range: '30d', category: '', createdAt: 'May 1, 2026', color: '#38bdf8' },
  { id: '2', name: 'Revenue Focus', description: '90-day revenue deep dive', range: '90d', category: 'revenue', createdAt: 'Apr 28, 2026', color: '#34d399' },
  { id: '3', name: 'Weekly Pulse', description: 'Quick 7-day snapshot', range: '7d', category: '', createdAt: 'Apr 25, 2026', color: '#fb923c' },
];

const STORAGE_KEY = 'insightforge_saved_views';

export default function SavedViewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setViews(JSON.parse(stored));
    } catch { /* use defaults */ }
  }, []);

  const persist = (updated: SavedView[]) => {
    setViews(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const currentRange = searchParams.get('range') || '30d';
  const currentCategory = searchParams.get('category') || '';

  const handleCreate = () => {
    if (!newName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: newName.trim(),
      description: newDesc.trim() || `${currentRange} · ${currentCategory || 'All categories'}`,
      range: currentRange,
      category: currentCategory,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      color: newColor,
    };
    persist([view, ...views]);
    setSavedId(view.id);
    setTimeout(() => setSavedId(null), 2000);
    setShowCreate(false);
    setNewName(''); setNewDesc('');
  };

  const handleLoad = (view: SavedView) => {
    const params = new URLSearchParams();
    if (view.range !== '30d') params.set('range', view.range);
    if (view.category) params.set('category', view.category);
    router.push(`/?${params.toString()}`);
  };

  const handleDelete = (id: string) => persist(views.filter(v => v.id !== id));

  const RANGE_LABEL: Record<string, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Saved Views</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Saved Views</h1>
            <p className="text-slate-500 text-[12px] mt-1">Bookmark your favourite filter combinations.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/25"
          >
            <Plus size={13} /> Save Current View
          </motion.button>
        </div>
      </div>

      {/* Current filter info */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <Filter size={13} className="text-slate-600" />
        <p className="text-[11px] font-bold text-slate-500">
          Current filters: <span className="text-white">{RANGE_LABEL[currentRange]}</span>
          {currentCategory && <> · <span className="text-white capitalize">{currentCategory}</span></>}
        </p>
        <button onClick={() => setShowCreate(true)}
          className="ml-auto text-[10px] font-black text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest">
          Save this →
        </button>
      </div>

      {/* Views grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {views.map((view, i) => (
            <motion.div
              key={view.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.06 }}
              className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-hidden group hover:border-white/[0.12] transition-all"
            >
              {/* top accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-60"
                style={{ background: `linear-gradient(90deg, ${view.color}, transparent)` }} />

              {/* saved badge */}
              <AnimatePresence>
                {savedId === view.id && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400">
                    <Check size={9} /> Saved!
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg border" style={{ background: `${view.color}15`, borderColor: `${view.color}25` }}>
                  <Bookmark className="w-3.5 h-3.5" style={{ color: view.color }} />
                </div>
                {savedId !== view.id && (
                  <button onClick={() => handleDelete(view.id)}
                    className="p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <h3 className="text-[13px] font-black text-white mb-1">{view.name}</h3>
              <p className="text-[11px] text-slate-500 mb-4">{view.description}</p>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  {RANGE_LABEL[view.range] || view.range}
                </span>
                {view.category && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[9px] font-black text-slate-500 uppercase tracking-widest capitalize">
                    {view.category}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <span className="text-[9px] font-bold text-slate-700 flex items-center gap-1">
                  <Clock size={9} /> {view.createdAt}
                </span>
                <button onClick={() => handleLoad(view)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors hover:opacity-80"
                  style={{ color: view.color }}>
                  Load View <ExternalLink size={9} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {views.length === 0 && (
          <div className="col-span-3 py-16 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Bookmark className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-bold">No saved views yet</p>
            <p className="text-slate-700 text-[11px] mt-1">Set your filters on dashboard then save here</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#080f1f] overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="font-black text-white text-sm">Save Current View</h3>
                <button onClick={() => setShowCreate(false)} className="text-slate-600 hover:text-white"><X size={15} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">View Name</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Weekly Revenue Check"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">Description (optional)</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-2">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewColor(c)}
                        className={cn('w-7 h-7 rounded-full border-2 transition-all', newColor === c ? 'border-white scale-110' : 'border-transparent')}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[11px] font-black text-slate-500 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={!newName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-40 transition-all">
                    Save View
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}