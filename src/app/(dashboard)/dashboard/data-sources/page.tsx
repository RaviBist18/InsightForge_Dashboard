"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Globe, Brain, TrendingUp,
  Lock, Eye, EyeOff, RefreshCw, Link, Link2Off,
  CheckCircle2, AlertCircle, Activity,
  Zap, Shield, Clock, ChevronDown, Snowflake,
  DollarSign, AlertTriangle
} from 'lucide-react';
import { RoleGuard } from '@/components/common/RoleGuard';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ForgeEvent {
  timestamp: string;
  message: string;
  severity: 'success' | 'warning' | 'critical';
}

interface ConflictReport {
  sourceA: string;
  sourceB: string;
  delta: number;
  detectedAt: string;
}

interface CostTracker {
  tokensUsed: number;
  tokenLimit: number;
  costUSD: number;
  resetDate: string;
}

interface DataSourceConnector {
  id: string;
  name: string;
  type: 'database' | 'market' | 'news' | 'ai';
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
  healthScore: number;
  latencyMs: number;
  lastSync: string;
  forgeLinked: boolean;
  apiKeyMasked: string;
  recordCount: number;
  frozen: boolean;
  frozenAt: string | null;
  events: ForgeEvent[];
  conflicted: boolean;
  cost?: CostTracker;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const nowStr = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const DEFAULT_COSTS: Record<string, CostTracker> = {
  groq: { tokensUsed: 2847, tokenLimit: 10000, costUSD: 0.0043, resetDate: '2026-06-01' },
  alphavantage: { tokensUsed: 312, tokenLimit: 500, costUSD: 0.0, resetDate: '2026-06-01' },
};

const INITIAL_SOURCES: DataSourceConnector[] = [
  {
    id: 'supabase', name: 'Supabase DB', type: 'database',
    status: 'connected', healthScore: 94, latencyMs: 42, lastSync: '12s ago',
    forgeLinked: true, apiKeyMasked: 'sbp_••••••••••••••••••••••••••••••••',
    recordCount: 1240, frozen: false, frozenAt: null, conflicted: false,
    events: [
      { timestamp: nowStr(), message: 'Pipeline sync completed — 1,240 records verified', severity: 'success' },
      { timestamp: nowStr(), message: 'Latency spike detected: 210ms peak', severity: 'warning' },
      { timestamp: nowStr(), message: 'Forge link established — AI briefings active', severity: 'success' },
    ],
  },
  {
    id: 'alphavantage', name: 'Alpha Vantage', type: 'market',
    status: 'connected', healthScore: 78, latencyMs: 310, lastSync: '4m ago',
    forgeLinked: true, apiKeyMasked: 'AV••••••••••••••••',
    recordCount: 0, frozen: false, frozenAt: null, conflicted: false,
    cost: DEFAULT_COSTS.alphavantage,
    events: [
      { timestamp: nowStr(), message: 'SPY quote fetched: $541.22', severity: 'success' },
      { timestamp: nowStr(), message: 'Rate limit warning — 4/5 calls used', severity: 'warning' },
    ],
  },
  {
    id: 'newsapi', name: 'NewsAPI', type: 'news',
    status: 'connected', healthScore: 85, latencyMs: 190, lastSync: '2m ago',
    forgeLinked: false, apiKeyMasked: 'nap_••••••••••••••••••••••••••',
    recordCount: 0, frozen: false, frozenAt: null, conflicted: false,
    events: [
      { timestamp: nowStr(), message: '12 business headlines ingested', severity: 'success' },
      { timestamp: nowStr(), message: 'Forge unlinked — excluded from briefings', severity: 'warning' },
    ],
  },
  {
    id: 'groq', name: 'Groq AI', type: 'ai',
    status: 'connected', healthScore: 91, latencyMs: 88, lastSync: '31s ago',
    forgeLinked: true, apiKeyMasked: 'gsk_••••••••••••••••••••••••••••••••••••',
    recordCount: 0, frozen: false, frozenAt: null, conflicted: false,
    cost: DEFAULT_COSTS.groq,
    events: [
      { timestamp: nowStr(), message: 'CEO briefing generated — 847 tokens used', severity: 'success' },
      { timestamp: nowStr(), message: 'Llama 3.1-8b response: 88ms', severity: 'success' },
      { timestamp: nowStr(), message: 'Context window 72% utilized', severity: 'warning' },
    ],
  },
];

const TYPE_META: Record<DataSourceConnector['type'], { icon: React.ElementType; label: string; color: string; bg: string; glow: string; border: string }> = {
  database: { icon: Database, label: 'DATABASE', color: 'text-sky-400', bg: 'bg-sky-400/10', glow: 'shadow-sky-500/30', border: 'border-sky-400/20' },
  market: { icon: TrendingUp, label: 'MARKET', color: 'text-emerald-400', bg: 'bg-emerald-400/10', glow: 'shadow-emerald-500/30', border: 'border-emerald-400/20' },
  news: { icon: Globe, label: 'NEWS', color: 'text-amber-400', bg: 'bg-amber-400/10', glow: 'shadow-amber-500/30', border: 'border-amber-400/20' },
  ai: { icon: Brain, label: 'AI ENGINE', color: 'text-violet-400', bg: 'bg-violet-400/10', glow: 'shadow-violet-500/30', border: 'border-violet-400/20' },
};

const SEVERITY_STYLE: Record<ForgeEvent['severity'], string> = {
  success: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20',
  warning: 'text-amber-400  bg-amber-400/10  border border-amber-400/20',
  critical: 'text-rose-400   bg-rose-400/10   border border-rose-400/20',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
  catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthRing({ score, latencyMs, status }: { score: number; latencyMs: number; status: DataSourceConnector['status'] }) {
  const r = 22, circ = 2 * Math.PI * r, fill = (score / 100) * circ;

  // Dynamic label logic per spec
  const isError = status === 'error';
  const isHighLatency = latencyMs > 300;
  const isOptimal = score > 80;

  const color = isError ? '#fb7185' : isHighLatency ? '#fbbf24' : isOptimal ? '#34d399' : '#fbbf24';
  const label = isError ? 'CIRCUIT BREAK' : isHighLatency ? 'HIGH LATENCY' : isOptimal ? 'OPTIMAL' : 'WARNING';
  const labelClass = isError ? 'text-rose-400' : isHighLatency ? 'text-amber-400' : isOptimal ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <motion.circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - fill }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black text-white">{score}</span>
        </div>
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest ${labelClass}`}>{label}</span>
    </div>
  );
}

function PulseWaveform({ status, frozen }: { status: DataSourceConnector['status']; frozen: boolean }) {
  const bars = [0.4, 0.7, 1.0, 0.6, 0.85];
  const active = status === 'connected' && !frozen;
  const errored = status === 'error';
  const color = errored ? '#fb7185' : frozen ? '#fbbf24' : '#34d399';

  if (frozen) {
    return (
      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
        className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-400/10 border border-amber-400/20">
        <Snowflake size={9} className="text-amber-400" />
        <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">FROZEN</span>
      </motion.div>
    );
  }

  return (
    <div className="flex items-end gap-[3px] h-6">
      {bars.map((h, i) => (
        <motion.div key={i} className="w-[3px] rounded-full"
          style={{ backgroundColor: color, height: `${h * 24}px` }}
          animate={active
            ? { scaleY: [1, h * 1.5, 0.3, 1], opacity: [0.7, 1, 0.5, 0.7] }
            : { scaleY: 0.1, opacity: 0.2 }}
          transition={active
            ? { duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }
            : { duration: 0.4 }}
        />
      ))}
    </div>
  );
}

function VaultKey({ masked }: { masked: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] w-full">
      <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
        <Lock size={10} className="text-amber-400" style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }} />
      </motion.div>
      <span className="text-[10px] font-mono text-slate-500 flex-1 truncate">
        {revealed ? masked.replace(/•/g, '*') : masked}
      </span>
      <button onClick={() => setRevealed(p => !p)} className="text-slate-700 hover:text-slate-400 transition-colors">
        {revealed ? <EyeOff size={10} /> : <Eye size={10} />}
      </button>
    </div>
  );
}

// ── Feature 1: Forge History Log ──────────────────────────────────────────────

function ForgeHistoryLog({ events }: { events: ForgeEvent[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-white/[0.05] pt-3">
      <button onClick={() => setOpen(p => !p)} className="flex items-center justify-between w-full text-left group">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600 group-hover:text-slate-400 transition-colors">
          FORGE EVENT LOG · {events.length} entries
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={11} className="text-slate-600" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {events.slice(0, 5).map((ev, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[9px] ${SEVERITY_STYLE[ev.severity]}`}
                >
                  <span className="font-mono opacity-60 shrink-0 mt-px">{ev.timestamp}</span>
                  <span className="font-bold leading-snug">{ev.message}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Feature 4: Cost of Intelligence Tracker ───────────────────────────────────

function CostWidget({ cost, forgeLinked, frozen }: { cost: CostTracker; forgeLinked: boolean; frozen: boolean }) {
  const pct = Math.min(100, (cost.tokensUsed / cost.tokenLimit) * 100);
  const barColor = pct > 85 ? 'bg-rose-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400';
  const labelColor = pct > 85 ? 'text-rose-400 bg-rose-400/10' : pct > 60 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';
  const label = pct > 85 ? 'CRITICAL' : pct > 60 ? 'WARNING' : 'NOMINAL';

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <DollarSign size={9} className="text-violet-400" />
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">COST OF INTELLIGENCE</span>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${labelColor}`}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-1.5">
        <motion.div className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          style={{ boxShadow: pct > 85 ? '0 0 8px rgba(251,113,133,0.5)' : undefined }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-500">
          {cost.tokensUsed.toLocaleString()} / {cost.tokenLimit.toLocaleString()} tokens
          {frozen && forgeLinked ? ' · [STATIC DATA]' : ''}
        </span>
        <span className="text-[9px] font-mono text-slate-600">${cost.costUSD.toFixed(4)} burned</span>
      </div>
      <div className="text-[8px] font-mono text-slate-700 mt-0.5">Resets {cost.resetDate}</div>
    </div>
  );
}

// ── Operational Metric Bar (symmetry for Supabase & NewsAPI) ──────────────────

function OperationalMetricBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  const barColor = pct > 85 ? 'bg-rose-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400';
  const labelColor = pct > 85 ? 'text-rose-400 bg-rose-400/10' : pct > 60 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';
  const statusLabel = pct > 85 ? 'CRITICAL' : pct > 60 ? 'WARNING' : 'NOMINAL';

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Activity size={9} className="text-sky-400" />
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">{label}</span>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${labelColor}`}>{statusLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-1.5">
        <motion.div className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          style={{ boxShadow: pct > 85 ? '0 0 8px rgba(251,113,133,0.5)' : undefined }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-500">{value}</span>
        <span className="text-[9px] font-mono text-slate-600">{pct}% utilized</span>
      </div>
    </div>
  );
}

// ─── Connector Card ───────────────────────────────────────────────────────────

function ConnectorCard({
  source, onToggleForge, onSync, onToggleFreeze,
}: {
  source: DataSourceConnector;
  onToggleForge: (id: string) => void;
  onSync: (id: string) => void;
  onToggleFreeze: (id: string) => void;
}) {
  const meta = TYPE_META[source.type];
  const Icon = meta.icon;
  const syncing = source.status === 'syncing';

  const statusDot =
    source.status === 'connected' ? 'bg-emerald-400' :
      source.status === 'error' ? 'bg-rose-400' :
        source.status === 'syncing' ? 'bg-amber-400' : 'bg-slate-600';

  const cardBorder = source.conflicted ? 'rgba(251,113,133,0.35)'
    : source.forgeLinked ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)';
  const cardGlow = source.conflicted
    ? '0 0 0 1px rgba(251,113,133,0.2), 0 0 24px rgba(251,113,133,0.1)'
    : source.forgeLinked
      ? '0 0 0 1px rgba(56,189,248,0.15), 0 0 24px rgba(56,189,248,0.08), 0 0 15px rgba(56,189,248,0.2)'
      : 'none';

  return (
    <motion.div id={`source-${source.id}`} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border overflow-hidden transition-all duration-300"
      style={{ background: 'rgba(8,15,31,0.85)', borderColor: cardBorder, boxShadow: cardGlow }}
    >
      {/* CRT scanline */}
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)' }} />

      {/* Inner glow */}
      <AnimatePresence>
        {(source.forgeLinked || source.conflicted) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ boxShadow: source.conflicted ? 'inset 0 0 30px rgba(251,113,133,0.06)' : 'inset 0 0 30px rgba(56,189,248,0.06)' }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-20 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${meta.bg} border ${meta.border} shadow-lg ${meta.glow}`}>
              <Icon size={16} className={meta.color} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[13px] font-black text-white tracking-tight">{source.name}</h3>
                <div className={`w-1.5 h-1.5 rounded-full ${statusDot} ${source.status === 'syncing' ? 'animate-pulse' : ''}`} />
                {source.frozen && (
                  <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                    FROZEN
                  </motion.span>
                )}
                {source.conflicted && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-400/10 border border-rose-400/20 px-1.5 py-0.5 rounded">
                    CONFLICT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[8px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                  {meta.label}
                </span>
                {source.recordCount > 0 && (
                  <span className="text-[9px] font-mono text-slate-600">{source.recordCount.toLocaleString()} rec</span>
                )}
                {source.frozen && source.frozenAt && (
                  <span className="text-[9px] font-mono text-amber-600">SNAPSHOT · {source.frozenAt}</span>
                )}
              </div>
            </div>
          </div>
          <HealthRing score={source.healthScore} latencyMs={source.latencyMs} status={source.status} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: <Zap size={9} className="text-sky-400" />, label: 'LATENCY', value: `${source.latencyMs}ms` },
            { icon: <Clock size={9} className="text-slate-500" />, label: 'SYNC', value: source.lastSync },
            { icon: <Activity size={9} className="text-slate-500" />, label: 'PULSE', value: null },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {icon}
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</span>
              </div>
              {value
                ? <span className="text-[11px] font-mono font-black text-white">{value}</span>
                : <div className="flex justify-center"><PulseWaveform status={source.status} frozen={source.frozen} /></div>
              }
            </div>
          ))}
        </div>

        {/* Vault */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield size={9} className="text-amber-400" />
            <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">ENCRYPTED KEY</span>
          </div>
          <VaultKey masked={source.apiKeyMasked} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => onToggleForge(source.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${source.forgeLinked
              ? 'bg-sky-500/15 border-sky-400/30 text-sky-400 hover:bg-sky-500/25'
              : 'bg-white/[0.03] border-white/[0.06] text-slate-600 hover:text-slate-400'
              }`}>
            {source.forgeLinked ? <Link size={10} /> : <Link2Off size={10} />}
            {source.forgeLinked ? 'FORGE LINKED' : 'LINK TO FORGE'}
          </button>
          <div className="flex items-center gap-2">
            {/* Feature 2: Freeze */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onToggleFreeze(source.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${source.frozen
                ? 'bg-amber-400/15 border-amber-400/30 text-amber-400 hover:bg-amber-400/25'
                : 'bg-white/[0.03] border-white/[0.06] text-slate-600 hover:text-slate-400'
                }`}>
              <Snowflake size={10} />
              {source.frozen ? 'UNFREEZE' : 'FREEZE'}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onSync(source.id)} disabled={syncing || source.frozen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/[0.15] transition-all disabled:opacity-30">
              <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'SYNCING' : 'RESYNC'}
            </motion.button>
          </div>
        </div>

        {/* Feature 4: Cost */}
        {source.cost && (
          <CostWidget cost={source.cost} forgeLinked={source.forgeLinked} frozen={source.frozen} />
        )}

        {/* Operational Metric Bar — symmetry for database/news cards */}
        {source.id === 'supabase' && (
          <OperationalMetricBar label="STORAGE INTEGRITY" value="1,240 / 10,000 Records" pct={85} />
        )}
        {source.id === 'newsapi' && (
          <OperationalMetricBar label="SIGNAL RELEVANCE" value="14 / 40 Articles Filtered" pct={65} />
        )}

        {/* Feature 1: Event log */}
        <ForgeHistoryLog events={source.events} />
      </div>
    </motion.div>
  );
}

// ─── Feature 3: Conflict Banner ───────────────────────────────────────────────

function ConflictBanner({ report }: { report: ConflictReport }) {
  return (
    <motion.div initial={{ opacity: 0, scaleX: 0.95 }} animate={{ opacity: 1, scaleX: 1 }}
      className="flex items-center gap-3 px-5 py-3 rounded-xl bg-rose-500/10 border border-rose-400/25 mb-2">
      <AlertTriangle size={13} className="text-rose-400 shrink-0" style={{ filter: 'drop-shadow(0 0 4px #fb7185)' }} />
      <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
        DATA CONFLICT DETECTED — {report.sourceA} vs {report.sourceB}: ${report.delta.toFixed(2)} discrepancy
      </span>
      <span className="ml-auto text-[9px] font-mono text-rose-600 shrink-0">{report.detectedAt}</span>
    </motion.div>
  );
}

// ─── Intelligence Summary ─────────────────────────────────────────────────────

function IntelligenceSummary({ sources }: { sources: DataSourceConnector[] }) {
  const linked = sources.filter(s => s.forgeLinked).length;
  const frozen = sources.filter(s => s.frozen).length;
  const avgHealth = Math.round(sources.reduce((a, s) => a + s.healthScore, 0) / sources.length);
  const avgLatency = Math.round(sources.reduce((a, s) => a + s.latencyMs, 0) / sources.length);
  const allOk = sources.every(s => s.status === 'connected');

  return (
    <div id="intelligence-summary" className="relative rounded-2xl border border-white/[0.06] overflow-hidden mb-6"
      style={{ background: 'rgba(8,15,31,0.6)' }}>
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)' }} />
      <div className="relative px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'FORGE SOURCES', value: `${linked}/${sources.length}`, color: 'text-sky-400', sub: 'linked to AI' },
          { label: 'AVG HEALTH', value: `${avgHealth}`, color: avgHealth >= 80 ? 'text-emerald-400' : avgHealth >= 60 ? 'text-amber-400' : 'text-rose-400', sub: 'intel score' },
          { label: 'AVG LATENCY', value: `${avgLatency}ms`, color: 'text-violet-400', sub: 'pipeline speed' },
          { label: 'FROZEN', value: `${frozen}`, color: frozen > 0 ? 'text-amber-400' : 'text-slate-600', sub: 'static sources' },
          { label: 'PIPELINE', value: allOk ? 'NOMINAL' : 'DEGRADED', color: allOk ? 'text-emerald-400' : 'text-rose-400', sub: 'overall status' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="text-center">
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600 mb-1">{label}</div>
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-[9px] text-slate-700 font-bold mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function DataSourcesContent() {
  const [sources, setSources] = useState<DataSourceConnector[]>(INITIAL_SOURCES);
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [lastPolled, setLastPolled] = useState<Date>(new Date());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate localStorage
  useEffect(() => {
    const forgeLinks: Record<string, boolean> = loadLS('insightforge_forge_links', {});
    const frozenMap: Record<string, string | null> = loadLS('insightforge_frozen', {});
    const savedCosts: Record<string, CostTracker> = loadLS('insightforge_costs', {});
    setSources(prev => prev.map(s => ({
      ...s,
      forgeLinked: forgeLinks[s.id] ?? s.forgeLinked,
      frozen: frozenMap[s.id] != null,
      frozenAt: frozenMap[s.id] ?? null,
      cost: savedCosts[s.id] ?? s.cost,
    })));
  }, []);

  // Polling
  const poll = useCallback(() => {
    setSources(prev => prev.map(s => {
      if (s.frozen) return s;
      const hd = Math.round((Math.random() - 0.4) * 4);
      const newH = Math.min(100, Math.max(0, s.healthScore + hd));
      const newL = Math.max(20, s.latencyMs + Math.round((Math.random() - 0.5) * 40));
      const ev: ForgeEvent = {
        timestamp: nowStr(),
        message: hd < -2 ? 'Health degradation detected' : newL > 400 ? `Latency spike: ${newL}ms` : 'Pipeline sync nominal — all signals green',
        severity: hd < -2 || newL > 400 ? 'warning' : 'success',
      };
      return { ...s, healthScore: newH, latencyMs: newL, lastSync: 'just now', events: [ev, ...s.events].slice(0, 5) };
    }));
    setLastPolled(new Date());
  }, []);

  useEffect(() => {
    pollingRef.current = setInterval(poll, 30_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [poll]);

  // Feature 3: Conflict detection
  useEffect(() => {
    const byType: Record<string, DataSourceConnector[]> = {};
    sources.forEach(s => { byType[s.type] = [...(byType[s.type] ?? []), s]; });
    const newConflicts: ConflictReport[] = [];
    Object.values(byType).forEach(group => {
      if (group.length < 2) return;
      for (let i = 0; i < group.length - 1; i++) {
        const delta = Math.abs(group[i].latencyMs - group[i + 1].latencyMs);
        if ((delta / Math.max(group[i].latencyMs, 1)) > 0.005) {
          newConflicts.push({ sourceA: group[i].name, sourceB: group[i + 1].name, delta: parseFloat((delta * 0.01).toFixed(2)), detectedAt: nowStr() });
        }
      }
    });
    setSources(prev => prev.map(s => {
      const inConflict = newConflicts.some(c => c.sourceA === s.name || c.sourceB === s.name);
      return { ...s, conflicted: inConflict, healthScore: inConflict ? Math.max(0, s.healthScore - 15) : s.healthScore };
    }));
    setConflicts(newConflicts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.length]);

  const handleToggleForge = (id: string) => {
    setSources(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const linked = !s.forgeLinked;
        const ev: ForgeEvent = { timestamp: nowStr(), message: linked ? 'Forge link activated — source added to AI briefings' : 'Forge link removed — source excluded from briefings', severity: linked ? 'success' : 'warning' };
        const newCost = (linked && s.cost) ? { ...s.cost, tokensUsed: s.cost.tokensUsed + 120, costUSD: parseFloat((s.cost.costUSD + 0.0002).toFixed(4)) } : s.cost;
        return { ...s, forgeLinked: linked, events: [ev, ...s.events].slice(0, 5), cost: newCost };
      });
      saveLS('insightforge_forge_links', Object.fromEntries(updated.map(s => [s.id, s.forgeLinked])));
      const costsToSave = Object.fromEntries(updated.filter(s => s.cost).map(s => [s.id, s.cost]));
      saveLS('insightforge_costs', costsToSave);
      return updated;
    });
  };

  const handleSync = async (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'syncing' } : s));
    await new Promise(r => setTimeout(r, 1800));
    setSources(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ev: ForgeEvent = { timestamp: nowStr(), message: 'Manual resync completed — pipeline nominal', severity: 'success' };
      return { ...s, status: 'connected', lastSync: 'just now', latencyMs: Math.round(50 + Math.random() * 200), events: [ev, ...s.events].slice(0, 5) };
    }));
  };

  const handleToggleFreeze = (id: string) => {
    setSources(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const nowFrozen = !s.frozen;
        const frozenAt = nowFrozen ? nowStr() : null;
        const ev: ForgeEvent = { timestamp: nowStr(), message: nowFrozen ? `Snapshot activated — data frozen at ${frozenAt}` : 'Snapshot released — live data resumed', severity: nowFrozen ? 'warning' : 'success' };
        return { ...s, frozen: nowFrozen, frozenAt, events: [ev, ...s.events].slice(0, 5) };
      });
      saveLS('insightforge_frozen', Object.fromEntries(updated.map(s => [s.id, s.frozenAt])));
      return updated;
    });
  };

  const handleSyncAll = async () => {
    const ids = sources.filter(s => !s.frozen).map(s => s.id);
    await Promise.all(ids.map(id => handleSync(id)));
  };

  return (
    <div className="space-y-6 relative">
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.15) 0%, transparent 70%)' }} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Data Sources</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Intelligence Pipeline</h1>
            <p className="text-slate-500 text-[12px] mt-1">
              Manage connectors · Forge links control AI briefing context · Freeze for static snapshots
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-500">POLLED {lastPolled.toLocaleTimeString()}</span>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={poll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-400/20 text-[10px] font-black text-sky-400 hover:bg-sky-500/20 transition-all">
              <RefreshCw size={11} /> REFRESH ALL
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSyncAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest">
              <Zap size={11} /> SYNC ALL SOURCES
            </motion.button>
          </div>
        </div>
      </div>

      <IntelligenceSummary sources={sources} />

      <AnimatePresence>
        {conflicts.map((c, i) => <ConflictBanner key={i} report={c} />)}
      </AnimatePresence>

      <div id="connector-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source, i) => (
          <motion.div key={source.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <ConnectorCard source={source} onToggleForge={handleToggleForge} onSync={handleSync} onToggleFreeze={handleToggleFreeze} />
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-4 flex flex-wrap items-center gap-4">
        {[
          { icon: <Link size={11} className="text-sky-400" />, text: 'FORGE LINKED — included in Groq AI briefings' },
          { icon: <Snowflake size={11} className="text-amber-400" />, text: 'FROZEN — snapshot mode, AI gets [STATIC DATA]' },
          { icon: <CheckCircle2 size={11} className="text-emerald-400" />, text: '80+ HEALTH = optimal signal' },
          { icon: <AlertCircle size={11} className="text-rose-400" />, text: '<60 HEALTH = degraded intel' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2">
            {icon}
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataSourcesPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <DataSourcesContent />
    </RoleGuard>
  );
}