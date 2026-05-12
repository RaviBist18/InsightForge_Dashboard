"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  Bookmark, Plus, Trash2, ExternalLink, Clock, Filter,
  X, Check, Snowflake, Shield, TrendingUp, TrendingDown,
  Brain, GitCompare, Lock, Hash, Activity, Share2,
  Copy, CheckCheck, AlertTriangle, Zap
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketBadge {
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  price: string;
  savedPrice: number;   // numeric for drift calc
}

interface SavedView {
  id: string;
  name: string;
  description: string;
  range: string;
  category: string;
  createdAt: string;
  color: string;
  frozen: boolean;
  frozenAt: string | null;
  healthScore: number;
  verificationHash: string;
  executiveInsight: string;
  marketBadges: MarketBadge[];
  selectedForCompare: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#f472b6', '#fbbf24'];
const STORAGE_KEY = 'insightforge_saved_views_v3';

// Simulated live SPY price (would come from Alpha Vantage in prod)
const LIVE_PRICES: Record<string, number> = {
  SPY: 541,
  NVDA: 1082,
  BTC: 65000,
  QQQ: 468,
};

const RANGE_LABEL: Record<string, string> = {
  '7d': '7 Days', '30d': '30 Days', '90d': '90 Days',
  'monthly': 'Monthly', 'quarterly': 'Quarterly', 'annual': 'Annual',
};

const MOCK_INSIGHTS = [
  'MRR spike correlated with NVDA earnings beat — AI sector tailwind drove 3 enterprise upsells.',
  'Churn elevated 1.4% above baseline; SPY -2.1% that week indicated macro risk-off sentiment.',
  'Revenue outperformed forecast by 12% during Fed pause — capital freed into SaaS budgets.',
  'Enterprise tier grew 22% YoY; bullish SPY momentum validated B2B expansion timing.',
  'Weekly snapshot captured during SVB fallout — churn risk elevated, retain high-value accounts.',
];

const MOCK_BADGES: MarketBadge[][] = [
  [
    { ticker: 'SPY', sentiment: 'bullish', price: '$491', savedPrice: 491 },
    { ticker: 'NVDA', sentiment: 'bullish', price: '$875', savedPrice: 875 },
  ],
  [
    { ticker: 'SPY', sentiment: 'bearish', price: '$438', savedPrice: 438 },
    { ticker: 'BTC', sentiment: 'bearish', price: '$41K', savedPrice: 41000 },
  ],
  [
    { ticker: 'SPY', sentiment: 'bullish', price: '$471', savedPrice: 471 },
    { ticker: 'QQQ', sentiment: 'bullish', price: '$421', savedPrice: 421 },
  ],
];

const DELTA_BRIEFINGS = [
  'Market shifted from risk-off to risk-on between these snapshots. SPY +11.6% realignment drove B2B budget unlocks — expect 8–14% MRR acceleration in next 60 days.',
  'Fed pivot window between these periods created enterprise buying surge. Your metrics lagged market by ~3 weeks — recalibrate sales cycle forecasts accordingly.',
  'Macro divergence detected: internal metrics improved while market cooled. Strong product-market fit insulation — reduce hedging posture immediately.',
];

const generateHash = () => {
  const c = 'ABCDEF0123456789';
  return 'IF-' + Array.from({ length: 24 }, () => c[Math.floor(Math.random() * c.length)]).join('') + '-SV';
};
const generateShareToken = () => {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => c[Math.floor(Math.random() * c.length)]).join('');
};
const randomHealth = () => Math.round(72 + Math.random() * 28);

const DEFAULT_VIEWS: SavedView[] = [
  {
    id: '1', name: 'Monthly Overview', description: '30-day all categories performance',
    range: '30d', category: '', createdAt: 'May 1, 2026', color: '#38bdf8',
    frozen: false, frozenAt: null, healthScore: 94, verificationHash: generateHash(),
    executiveInsight: MOCK_INSIGHTS[0], marketBadges: MOCK_BADGES[0], selectedForCompare: false,
  },
  {
    id: '2', name: 'Revenue Focus', description: '90-day revenue deep dive',
    range: '90d', category: 'revenue', createdAt: 'Apr 28, 2026', color: '#34d399',
    frozen: true, frozenAt: '10:15 AM', healthScore: 81, verificationHash: generateHash(),
    executiveInsight: MOCK_INSIGHTS[1], marketBadges: MOCK_BADGES[1], selectedForCompare: false,
  },
  {
    id: '3', name: 'Weekly Pulse', description: 'Quick 7-day snapshot',
    range: '7d', category: '', createdAt: 'Apr 25, 2026', color: '#fb923c',
    frozen: false, frozenAt: null, healthScore: 88, verificationHash: generateHash(),
    executiveInsight: MOCK_INSIGHTS[2], marketBadges: MOCK_BADGES[2], selectedForCompare: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /**/ }
}

function calcDrift(badge: MarketBadge): number | null {
  const live = LIVE_PRICES[badge.ticker];
  if (!live || !badge.savedPrice) return null;
  return parseFloat((((live - badge.savedPrice) / badge.savedPrice) * 100).toFixed(1));
}

// ─── Feature 1: Floating Action Bar ──────────────────────────────────────────

function FloatingActionBar({
  count, onForge, onClear,
}: { count: number; onForge: () => void; onClear: () => void }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-sky-400/30 shadow-2xl"
      style={{
        background: 'rgba(5,10,21,0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 0 1px rgba(56,189,248,0.2), 0 8px 40px rgba(56,189,248,0.15)',
      }}
    >
      {/* CRT line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent rounded-t-2xl" />

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
          {count} snapshots selected
        </span>
      </div>

      <div className="w-px h-5 bg-white/[0.08]" />

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onForge}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all"
        style={{ boxShadow: '0 0 16px rgba(56,189,248,0.3)' }}
      >
        <GitCompare size={12} /> GENERATE DELTA REPORT
      </motion.button>

      <button onClick={onClear}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors">
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ─── Comparison Forge Modal ───────────────────────────────────────────────────

function ComparisonForge({ views, onClose }: { views: SavedView[]; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [a, b] = views;

  const runForge = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setBriefing(DELTA_BRIEFINGS[Math.floor(Math.random() * DELTA_BRIEFINGS.length)]);
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] overflow-hidden shadow-2xl"
        style={{ background: '#080f1f' }}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare size={14} className="text-sky-400" />
            <h3 className="font-black text-white text-sm uppercase tracking-widest">Delta Report Forge</h3>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors"><X size={15} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[a, b].map((v, i) => (
              <div key={v.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">VIEW {String.fromCharCode(65 + i)}</div>
                <p className="text-[12px] font-black text-white">{v.name}</p>
                <p className="text-[9px] font-mono text-slate-600 mt-0.5">{v.createdAt}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {v.marketBadges.map(b => (
                    <span key={b.ticker} className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase ${b.sentiment === 'bullish' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                      }`}>{b.ticker} {b.price}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={runForge} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-[11px] font-black text-sky-400 hover:bg-sky-500/25 transition-all disabled:opacity-50">
            {loading
              ? <><Zap size={12} className="animate-pulse" /> FORGING DELTA BRIEFING...</>
              : <><Brain size={12} /> GENERATE DELTA BRIEFING</>}
          </motion.button>

          <AnimatePresence>
            {briefing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="relative rounded-xl border border-sky-400/20 bg-sky-400/5 p-4 overflow-hidden">
                <div className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(56,189,248,0.03) 2px,rgba(56,189,248,0.03) 4px)' }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={10} className="text-sky-400" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-sky-400">AI DELTA BRIEFING</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{briefing}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Feature 4: Share Module ──────────────────────────────────────────────────

function ShareModule({ view, onClose }: { view: SavedView; onClose: () => void }) {
  const token = useRef(generateShareToken());
  const shareUrl = `https://insight-forge-dashboard.vercel.app/snapshot/${token.current}`;
  const [copied, setCopied] = useState(false);
  const [expiry] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 24);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  });

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.1] overflow-hidden shadow-2xl"
        style={{ background: '#080f1f' }}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={13} className="text-emerald-400" />
            <h3 className="font-black text-white text-sm uppercase tracking-widest">Secure Share</h3>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white"><X size={15} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Snapshot preview */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-[11px] font-black text-white">{view.name}</p>
            <p className="text-[9px] font-mono text-slate-600 mt-0.5">{view.verificationHash}</p>
          </div>

          {/* Token */}
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1.5">SECURE ACCESS TOKEN</div>
            <div className="relative rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2.5 overflow-hidden">
              <div className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(52,211,153,0.03) 2px,rgba(52,211,153,0.03) 4px)' }} />
              <p className="text-[9px] font-mono text-emerald-400 break-all relative">{token.current}</p>
            </div>
          </div>

          {/* URL */}
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1.5">SHARE URL</div>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
                <p className="text-[9px] font-mono text-slate-400 truncate">{shareUrl}</p>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={copy}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-black transition-all ${copied
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}>
                {copied ? <><CheckCheck size={11} /> COPIED</> : <><Copy size={11} /> COPY</>}
              </motion.button>
            </div>
          </div>

          {/* Expiry + security info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
              <div className="text-[7px] font-black uppercase tracking-widest text-slate-600 mb-0.5">EXPIRES</div>
              <div className="text-[9px] font-mono text-amber-400">{expiry}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
              <div className="text-[7px] font-black uppercase tracking-widest text-slate-600 mb-0.5">ACCESS</div>
              <div className="text-[9px] font-mono text-emerald-400">READ-ONLY</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/5 border border-amber-400/15">
            <AlertTriangle size={10} className="text-amber-400 shrink-0" />
            <p className="text-[9px] text-slate-600 leading-snug">Link expires in 24h. Recipient gets read-only view, no raw data export.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── View Card ────────────────────────────────────────────────────────────────

function ViewCard({
  view, savedId, onLoad, onDelete, onToggleFreeze, onToggleCompare, onShare,
}: {
  view: SavedView;
  savedId: string | null;
  onLoad: (v: SavedView) => void;
  onDelete: (id: string) => void;
  onToggleFreeze: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onShare: (v: SavedView) => void;
}) {
  const controls = useAnimation();
  const [sealing, setSealing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const healthColor =
    view.healthScore >= 80 ? 'text-emerald-400' :
      view.healthScore >= 60 ? 'text-amber-400' : 'text-rose-400';

  // Feature 3: Sealing animation handler
  const handleFreeze = async () => {
    if (!view.frozen) {
      setSealing(true);
      // Digital lock shatter sequence
      await controls.start({ scale: [1, 1.02, 0.98, 1.01, 1], transition: { duration: 0.15 } });
      await controls.start({
        boxShadow: [
          '0 0 0px rgba(251,191,36,0)',
          '0 0 30px rgba(251,191,36,0.6)',
          '0 0 60px rgba(251,191,36,0.3)',
          '0 0 20px rgba(251,191,36,0.4)',
        ],
        transition: { duration: 0.5 },
      });
      setSealing(false);
    }
    onToggleFreeze(view.id);
  };

  const cardBorder = view.frozen
    ? 'rgba(251,191,36,0.35)'
    : view.selectedForCompare
      ? 'rgba(56,189,248,0.4)'
      : 'rgba(255,255,255,0.06)';

  const cardGlow = view.frozen
    ? '0 0 0 1px rgba(251,191,36,0.2), 0 0 28px rgba(251,191,36,0.08)'
    : view.selectedForCompare
      ? '0 0 0 1px rgba(56,189,248,0.2), 0 0 28px rgba(56,189,248,0.1)'
      : 'none';

  return (
    <motion.div
      id={`source-${view.id}`}
      layout
      animate={controls}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden group transition-colors duration-300"
      style={{
        background: 'rgba(8,15,31,0.85)',
        border: `1px solid ${cardBorder}`,
        boxShadow: cardGlow,
      }}
    >
      {/* Sealing flash overlay */}
      <AnimatePresence>
        {sealing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.4, 0] }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-30 rounded-2xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.3), transparent 70%)' }} />
        )}
      </AnimatePresence>

      {/* CRT scanline */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl z-10"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)' }} />

      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl z-20"
        style={{
          background: view.frozen
            ? 'linear-gradient(90deg, #fbbf24, transparent)'
            : `linear-gradient(90deg, ${view.color}, transparent)`,
          boxShadow: view.frozen ? '0 0 12px rgba(251,191,36,0.4)' : `0 0 12px ${view.color}40`,
        }} />

      {/* Frozen badge */}
      <AnimatePresence>
        {view.frozen && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-3 right-3 z-20">
            <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[8px] font-black uppercase tracking-widest text-amber-400">
              <Snowflake size={8} /> SEALED
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved flash */}
      <AnimatePresence>
        {savedId === view.id && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400">
            <Check size={9} /> Saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare selected indicator */}
      <AnimatePresence>
        {view.selectedForCompare && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[8px] font-black text-sky-400">
            <Check size={8} /> SELECTED
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-20 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg border" style={{ background: `${view.color}15`, borderColor: `${view.color}25` }}>
              <Bookmark className="w-3.5 h-3.5" style={{ color: view.color }} />
            </div>
            <div>
              <h3 className="text-[13px] font-black text-white leading-tight">{view.name}</h3>
              <p className="text-[9px] font-mono text-slate-600 mt-0.5 flex items-center gap-1.5">
                <Clock size={8} /> {view.createdAt}
                {view.frozen && view.frozenAt && (
                  <span className="text-amber-600">· SNAP {view.frozenAt}</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => onDelete(view.id)}
            className="p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
            <Trash2 size={11} />
          </button>
        </div>

        {/* Feature 1 + 2: Market Badges + Drift */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {view.marketBadges.map(badge => {
            const drift = !view.frozen ? calcDrift(badge) : null;
            return (
              <div key={badge.ticker} className="flex items-center gap-1">
                <span className={`flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${badge.sentiment === 'bullish'
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                  }`}>
                  {badge.sentiment === 'bullish' ? <TrendingUp size={7} /> : <TrendingDown size={7} />}
                  {badge.ticker} {badge.price}
                </span>
                {/* Feature 2: Market Drift */}
                {drift !== null && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                    className={`text-[7px] font-black font-mono px-1.5 py-0.5 rounded border ${Math.abs(drift) > 5
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                      : drift > 0
                        ? 'text-emerald-400 bg-emerald-400/8 border-emerald-400/15'
                        : 'text-rose-400 bg-rose-400/8 border-rose-400/15'
                      }`}>
                    {drift > 0 ? '+' : ''}{drift}%
                  </motion.span>
                )}
              </div>
            );
          })}
          <span className={`text-[7px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${view.marketBadges[0]?.sentiment === 'bullish'
            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
            }`}>
            {view.marketBadges[0]?.sentiment?.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[8px] font-black text-slate-500 uppercase tracking-widest">
            {RANGE_LABEL[view.range] || view.range}
          </span>
          {view.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[8px] font-black text-slate-500 uppercase tracking-widest capitalize">
              {view.category}
            </span>
          )}
        </div>

        {/* Drift warning — show if any badge has >5% drift and not frozen */}
        {!view.frozen && view.marketBadges.some(b => {
          const d = calcDrift(b); return d !== null && Math.abs(d) > 5;
        }) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-400/8 border border-amber-400/15 mb-3">
              <AlertTriangle size={9} className="text-amber-400 shrink-0" />
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">
                MARKET DRIFT DETECTED — context may be stale
              </span>
            </motion.div>
          )}

        {/* AI Executive Insight */}
        <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 mb-3 overflow-hidden">
          <div className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.006) 2px,rgba(255,255,255,0.006) 4px)' }} />
          <div className="relative flex items-start gap-2">
            <Brain size={9} className="text-violet-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-violet-400 block mb-0.5">EXECUTIVE INSIGHT</span>
              <p className="text-[9px] text-slate-400 leading-relaxed">{view.executiveInsight}</p>
            </div>
          </div>
        </div>

        {/* Forensic Seal */}
        <div className="relative rounded-xl border border-violet-400/12 bg-violet-400/[0.03] px-3 py-2 mb-4 overflow-hidden">
          <div className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(139,92,246,0.03) 2px,rgba(139,92,246,0.03) 4px)' }} />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Hash size={8} className="text-violet-400 shrink-0" />
              <span className="text-[8px] font-mono text-violet-400/70 truncate">{mounted ? view.verificationHash : 'IF-••••••••••••••••••••••••-SV'}</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className={`text-[8px] font-black font-mono flex items-center gap-1 ${healthColor}`}>
                <Activity size={8} /> {view.healthScore}
              </span>
              <span className="text-[7px] font-black uppercase tracking-widest text-violet-400 flex items-center gap-1">
                <Shield size={8} /> SEALED
              </span>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.05] flex-wrap">
          <div className="flex items-center gap-1.5">
            {/* Feature 3: Sealing with animation */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleFreeze}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${view.frozen
                ? 'bg-amber-400/15 border-amber-400/30 text-amber-400 hover:bg-amber-400/25'
                : 'bg-white/[0.03] border-white/[0.07] text-slate-600 hover:text-slate-400 hover:border-white/[0.12]'
                }`}>
              {view.frozen ? <><Snowflake size={9} /> FROZEN</> : <><Lock size={9} /> FREEZE</>}
            </motion.button>

            {/* Feature 1: Compare select */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onToggleCompare(view.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${view.selectedForCompare
                ? 'bg-sky-500/15 border-sky-400/30 text-sky-400 hover:bg-sky-500/25'
                : 'bg-white/[0.03] border-white/[0.07] text-slate-600 hover:text-slate-400 hover:border-white/[0.12]'
                }`}>
              <GitCompare size={9} />
              {view.selectedForCompare ? 'SELECTED' : 'COMPARE'}
            </motion.button>

            {/* Feature 4: Share */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onShare(view)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border bg-white/[0.03] border-white/[0.07] text-slate-600 hover:text-emerald-400 hover:border-emerald-400/20 hover:bg-emerald-400/5">
              <Share2 size={9} /> SHARE
            </motion.button>
          </div>

          <button onClick={() => onLoad(view)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-70 shrink-0"
            style={{ color: view.color }}>
            LOAD <ExternalLink size={9} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SavedViewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [shareTarget, setShareTarget] = useState<SavedView | null>(null);

  useEffect(() => {
    const stored = loadLS<SavedView[]>(STORAGE_KEY, []);
    if (stored.length) setViews(stored);
  }, []);

  const persist = (updated: SavedView[]) => {
    setViews(updated);
    saveLS(STORAGE_KEY, updated);
  };

  const currentRange = searchParams.get('range') || '30d';
  const currentCategory = searchParams.get('category') || '';

  const handleCreate = () => {
    if (!newName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: newName.trim(),
      description: newDesc.trim() || `${currentRange} · ${currentCategory || 'All categories'}`,
      range: currentRange, category: currentCategory,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      color: newColor,
      frozen: false, frozenAt: null,
      healthScore: randomHealth(),
      verificationHash: generateHash(),
      executiveInsight: MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)],
      marketBadges: MOCK_BADGES[Math.floor(Math.random() * MOCK_BADGES.length)],
      selectedForCompare: false,
    };
    persist([view, ...views]);
    setSavedId(view.id);
    setTimeout(() => setSavedId(null), 2000);
    setShowCreate(false);
    setNewName(''); setNewDesc('');
  };

  const handleLoad = (view: SavedView) => {
    const p = new URLSearchParams();
    if (view.range !== '30d') p.set('range', view.range);
    if (view.category) p.set('category', view.category);
    router.push(`/?${p.toString()}`);
  };
  const handleDelete = (id: string) => persist(views.filter(v => v.id !== id));
  const handleToggleFreeze = (id: string) => persist(views.map(v => v.id === id
    ? { ...v, frozen: !v.frozen, frozenAt: !v.frozen ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null }
    : v));
  const handleToggleCompare = (id: string) => {
    const sel = views.filter(v => v.selectedForCompare);
    const tgt = views.find(v => v.id === id);
    if (!tgt) return;
    if (tgt.selectedForCompare) {
      persist(views.map(v => v.id === id ? { ...v, selectedForCompare: false } : v));
    } else if (sel.length < 2) {
      persist(views.map(v => v.id === id ? { ...v, selectedForCompare: true } : v));
    }
  };
  const clearCompare = () => persist(views.map(v => ({ ...v, selectedForCompare: false })));

  const compareViews = views.filter(v => v.selectedForCompare);
  const canCompare = compareViews.length === 2;

  const stats = {
    total: views.length,
    frozen: views.filter(v => v.frozen).length,
    avgHealth: views.length ? Math.round(views.reduce((a, v) => a + v.healthScore, 0) / views.length) : 0,
    bullish: views.filter(v => v.marketBadges[0]?.sentiment === 'bullish').length,
  };

  return (
    <div className="space-y-6 relative pb-24">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] opacity-15"
        style={{ background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.2) 0%, transparent 70%)' }} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Saved Views</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Intelligence Snapshots</h1>
            <p className="text-slate-500 text-[12px] mt-1">
              Strategic archive — sealed with market context, AI insight + forensic verification
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/25">
            <Plus size={13} /> SEAL SNAPSHOT
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'SNAPSHOTS', value: stats.total, color: 'text-sky-400' },
          { label: 'FROZEN', value: stats.frozen, color: stats.frozen > 0 ? 'text-amber-400' : 'text-slate-600' },
          { label: 'AVG HEALTH', value: stats.avgHealth, color: stats.avgHealth >= 80 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'BULLISH', value: `${stats.bullish}/${stats.total}`, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">{label}</div>
            <div className={`text-xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Active filter bar */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <Filter size={12} className="text-slate-600" />
        <p className="text-[11px] font-bold text-slate-500">
          Active context: <span className="text-white">{RANGE_LABEL[currentRange] || currentRange}</span>
          {currentCategory && <> · <span className="text-white capitalize">{currentCategory}</span></>}
        </p>
        {compareViews.length > 0 && (
          <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 rounded-full">
            {compareViews.length}/2 SELECTED
          </span>
        )}
        <button onClick={() => setShowCreate(true)}
          className="ml-auto text-[10px] font-black text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-widest">
          SEAL THIS →
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {views.map((view, i) => (
            <motion.div key={view.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.06 }}>
              <ViewCard
                view={view} savedId={savedId}
                onLoad={handleLoad} onDelete={handleDelete}
                onToggleFreeze={handleToggleFreeze} onToggleCompare={handleToggleCompare}
                onShare={setShareTarget}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {views.length === 0 && (
          <div className="col-span-3 py-16 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Bookmark className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-black uppercase tracking-widest">No snapshots sealed</p>
          </div>
        )}
      </div>

      {/* Feature 1: Floating action bar */}
      <AnimatePresence>
        {compareViews.length > 0 && (
          <FloatingActionBar
            count={compareViews.length}
            onForge={() => { if (canCompare) setShowCompare(true); }}
            onClear={clearCompare}
          />
        )}
      </AnimatePresence>

      {/* Comparison modal */}
      <AnimatePresence>
        {showCompare && canCompare && (
          <ComparisonForge views={compareViews} onClose={() => setShowCompare(false)} />
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {shareTarget && (
          <ShareModule view={shareTarget} onClose={() => setShareTarget(null)} />
        )}
      </AnimatePresence>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/[0.1] overflow-hidden shadow-2xl"
              style={{ background: '#080f1f' }}>
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-sky-400" />
                  <h3 className="font-black text-white text-sm uppercase tracking-widest">Seal Snapshot</h3>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-slate-600 hover:text-white"><X size={15} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">Snapshot Name</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Q2 Revenue Inflection"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">Context Note (optional)</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder="What triggered this snapshot?"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewColor(c)}
                        className={cn('w-7 h-7 rounded-full border-2 transition-all', newColor === c ? 'border-white scale-110' : 'border-transparent')}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-violet-400/15 bg-violet-400/5">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-violet-400 mb-1.5">AUTO-GENERATED ON SEAL</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[8px] font-mono text-slate-600">HASH: IF-••••-SV</span>
                    <span className="text-[8px] font-mono text-emerald-400">HEALTH: AUTO</span>
                    <span className="text-[8px] font-mono text-sky-400">DRIFT: LIVE</span>
                  </div>
                </div>
                <div className="pt-1 flex gap-2">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[11px] font-black text-slate-500 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={!newName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-40 transition-all">
                    SEAL SNAPSHOT
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