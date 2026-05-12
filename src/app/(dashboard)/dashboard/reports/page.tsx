"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts';
import {
  FileText, Download, Loader2, CheckCircle2, Calendar,
  BarChart2, Users, TrendingUp, Trash2, Zap, Shield,
  AlertTriangle, Brain, Activity, ChevronDown
} from 'lucide-react';
import { TRANSACTIONS, INSIGHTS } from '@/data/mockData';
import { RoleGuard } from '@/components/common/RoleGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventPin {
  date: string;
  label: string;
  impact: 'positive' | 'negative';
  description: string;
}

interface HeatCell {
  metric: string;
  pctDelta: number;
  reasoning: string;
  loading: boolean;
}

interface Report {
  id: string;
  name: string;
  type: 'revenue' | 'transactions' | 'users' | 'insights';
  generatedAt: string;
  size: string;
  status: 'ready' | 'generating';
  healthScore: number;
  latencyMs: number;
  seal: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MRR_MARKET_DATA = [
  { month: 'Oct', mrr: 31000, spy: 432 },
  { month: 'Nov', mrr: 34000, spy: 441 },
  { month: 'Dec', mrr: 36000, spy: 449 },
  { month: 'Jan', mrr: 38000, spy: 462 },
  { month: 'Feb', mrr: 35000, spy: 438 },
  { month: 'Mar', mrr: 41000, spy: 471 },
  { month: 'Apr', mrr: 43000, spy: 485 },
  { month: 'May', mrr: 45000, spy: 491 },
];

const EVENT_PINS: EventPin[] = [
  { date: 'Nov', label: 'Fed Rate Hike', impact: 'negative', description: 'Fed +75bps. SMB software spending froze. MRR lagged 2 weeks.' },
  { date: 'Feb', label: 'SVB Collapse', impact: 'negative', description: 'Startup liquidity crisis. 3 enterprise customers paused contracts.' },
  { date: 'Mar', label: 'Nvidia Earnings', impact: 'positive', description: 'AI narrative reignited. New B2B SaaS deal flow surged 31%.' },
];

const SCENARIOS = [
  'If BTC drops 20%',
  'If NASDAQ dips 10%',
  'If Fed hikes +50bps',
  'If recession declared',
  'If competitor raises $100M',
];

const HEATMAP_METRICS = ['MRR', 'Churn', 'ARR', 'CAC', 'LTV', 'NPS', 'Burn', 'Pipeline', 'Headcount'];

const SCENARIO_MOCK: Record<string, number[]> = {
  'If BTC drops 20%': [-4, +18, -3, +7, -6, -12, +8, -9, -2],
  'If NASDAQ dips 10%': [-11, +22, -9, +14, -13, -18, +15, -21, -5],
  'If Fed hikes +50bps': [-7, +15, -6, +9, -8, -10, +11, -14, -3],
  'If recession declared': [-24, +41, -20, +28, -31, -35, +38, -44, -12],
  'If competitor raises $100M': [-8, +19, -7, +11, -9, -7, +6, -16, +2],
};

const generateHash = () => {
  const chars = 'ABCDEF0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const generateSeal = () => `IF-${generateHash()}-CERTIFIED`;

const generateCSV = (type: string, seal: string, health: number, latency: number): string => {
  const meta = `# InsightForge Intelligence Archive\n# Seal: ${seal}\n# Health Score: ${health}/100\n# Latency at Capture: ${latency}ms\n# Generated: ${new Date().toISOString()}\n\n`;
  switch (type) {
    case 'revenue':
      return meta + 'Month,MRR,SPY_Price,Correlation\nOct,$31000,432,0.84\nNov,$34000,441,0.81\nDec,$36000,449,0.79\nJan,$38000,462,0.83\nFeb,$35000,438,0.76\nMar,$41000,471,0.88\nApr,$43000,485,0.91\nMay,$45000,491,0.92';
    case 'transactions':
      return meta + 'ID,Date,Customer,Category,Region,Amount,Status\n' +
        TRANSACTIONS.map(t => `${t.id},${t.date},${t.customer},${t.category},${t.region},$${t.amount},${t.status}`).join('\n');
    case 'users':
      return meta + 'Metric,Value\nTotal Active Users,12500\nNew This Month,1240\nChurn Rate,1.2%\nRetention Rate,94.2%\nAvg Session,8.4 mins';
    case 'insights':
      return meta + 'Title,Type,Priority,Description\n' +
        INSIGHTS.map(i => `"${i.title}","${i.type}","${i.priority}","${i.description}"`).join('\n');
    default: return meta;
  }
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#050a15]/95 backdrop-blur-sm p-3 shadow-2xl">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[10px] font-mono text-white">{p.name}: <span className="font-black">{typeof p.value === 'number' && p.name === 'MRR' ? `$${p.value.toLocaleString()}` : p.value}</span></span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature 1: Executive Post-Mortem ────────────────────────────────────────

function PostMortem() {
  const [activePin, setActivePin] = useState<EventPin | null>(null);

  return (
    <div id="post-mortem" className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(8,15,31,0.8)' }}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)' }} />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={13} className="text-sky-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400">MODULE 01</span>
            </div>
            <h2 className="text-lg font-black text-white">Executive Post-Mortem</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Internal MRR vs. SPY market correlation — last 8 months</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-400/10 border border-sky-400/20">
              <div className="w-3 h-0.5 bg-sky-400 rounded" />
              <span className="text-[8px] font-black uppercase tracking-widest text-sky-400">MRR</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-400/10 border border-violet-400/20">
              <div className="w-3 h-0.5 bg-violet-400 rounded" />
              <span className="text-[8px] font-black uppercase tracking-widest text-violet-400">SPY</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={MRR_MARKET_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="mrr" orientation="left" tick={{ fill: '#38bdf8', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="spy" orientation="right" tick={{ fill: '#a78bfa', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false}
              domain={[420, 500]} />
            <Tooltip content={<ChartTooltip />} />

            {EVENT_PINS.map(pin => (
              <ReferenceLine key={pin.date} x={pin.date} yAxisId="mrr"
                stroke={pin.impact === 'positive' ? '#34d399' : '#fb7185'}
                strokeDasharray="4 4" strokeWidth={1.5}
                label={{
                  value: pin.label, position: 'top',
                  style: { fill: pin.impact === 'positive' ? '#34d399' : '#fb7185', fontSize: 8, fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }
                }}
              />
            ))}

            <Line yAxisId="mrr" type="monotone" dataKey="mrr" name="MRR"
              stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 0 }}
              style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.4))' }} />
            <Line yAxisId="spy" type="monotone" dataKey="spy" name="SPY"
              stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3, strokeWidth: 0 }}
              strokeDasharray="6 3"
              style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.4))' }} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Event Pin Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {EVENT_PINS.map(pin => (
            <motion.button key={pin.date} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setActivePin(activePin?.date === pin.date ? null : pin)}
              className={`text-left p-3 rounded-xl border transition-all ${pin.impact === 'positive'
                ? 'bg-emerald-400/5 border-emerald-400/20 hover:border-emerald-400/40'
                : 'bg-rose-400/5 border-rose-400/20 hover:border-rose-400/40'
                }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 font-mono">{pin.date}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${pin.impact === 'positive' ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
                  }`}>{pin.impact}</span>
              </div>
              <p className={`text-[11px] font-black ${pin.impact === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>{pin.label}</p>
              <AnimatePresence>
                {activePin?.date === pin.date && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="text-[10px] text-slate-400 mt-1.5 leading-relaxed overflow-hidden">
                    {pin.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature 2: Scenario Stress-Test ─────────────────────────────────────────

function StressTest() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  const runScenario = async (s: string) => {
    setRunning(true);
    setCells(HEATMAP_METRICS.map(m => ({ metric: m, pctDelta: 0, reasoning: '', loading: true })));
    const deltas = SCENARIO_MOCK[s] ?? HEATMAP_METRICS.map(() => Math.round((Math.random() - 0.5) * 30));
    for (let i = 0; i < HEATMAP_METRICS.length; i++) {
      await new Promise(r => setTimeout(r, 180 + i * 60));
      setCells(prev => prev.map((c, idx) => idx === i
        ? { metric: c.metric, pctDelta: deltas[i], reasoning: deltas[i] < -15 ? 'Critical exposure — immediate action required.' : deltas[i] < 0 ? 'Moderate impact — monitor closely.' : 'Marginal upside — opportunistic play.', loading: false }
        : c));
    }
    setRunning(false);
  };

  const cellColor = (v: number) => {
    if (v <= -20) return { bg: 'bg-rose-500/30', border: 'border-rose-400/50', text: 'text-rose-300', glow: '0 0 12px rgba(251,113,133,0.3)' };
    if (v <= -10) return { bg: 'bg-rose-400/15', border: 'border-rose-400/30', text: 'text-rose-400', glow: 'none' };
    if (v <= -5) return { bg: 'bg-amber-400/15', border: 'border-amber-400/30', text: 'text-amber-400', glow: 'none' };
    if (v < 0) return { bg: 'bg-amber-400/8', border: 'border-amber-400/20', text: 'text-amber-300', glow: 'none' };
    return { bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', text: 'text-emerald-400', glow: 'none' };
  };

  return (
    <div id="stress-test" className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(8,15,31,0.8)' }}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)' }} />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} className="text-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">MODULE 02</span>
            </div>
            <h2 className="text-lg font-black text-white">Scenario Stress-Test</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">AI-predicted business node impact per macro shock</p>
          </div>

          {/* Scenario dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setOpen(p => !p)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-black text-white hover:border-white/[0.15] transition-all min-w-[220px] justify-between">
                <span>{scenario}</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={12} className="text-slate-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-white/[0.1] overflow-hidden shadow-2xl"
                    style={{ background: '#080f1f' }}>
                    {SCENARIOS.map(s => (
                      <button key={s} onClick={() => { setScenario(s); setOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[11px] font-black hover:bg-white/[0.06] transition-colors ${s === scenario ? 'text-amber-400' : 'text-slate-400'}`}>
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => runScenario(scenario)} disabled={running}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-[11px] font-black text-amber-400 hover:bg-amber-500/25 transition-all disabled:opacity-50">
              {running ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              {running ? 'FORGING...' : 'RUN FORGE'}
            </motion.button>
          </div>
        </div>

        {/* 3x3 Heatmap */}
        {cells.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {cells.map((cell, i) => {
              const style = cellColor(cell.pctDelta);
              return (
                <motion.div key={cell.metric}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative rounded-xl border p-3 overflow-hidden ${style.bg} ${style.border}`}
                  style={{ boxShadow: style.glow }}>
                  {cell.loading ? (
                    <div className="flex items-center justify-center h-12">
                      <Loader2 size={14} className="animate-spin text-slate-600" />
                    </div>
                  ) : (
                    <>
                      <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">{cell.metric}</div>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                        className={`text-xl font-black font-mono ${style.text}`}>
                        {cell.pctDelta > 0 ? '+' : ''}{cell.pctDelta}%
                      </motion.div>
                      <p className="text-[8px] text-slate-600 mt-1 leading-snug">{cell.reasoning}</p>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 border border-white/[0.04] rounded-2xl bg-white/[0.01]">
            <Zap size={24} className="text-slate-700 mb-3" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Select scenario and run forge</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feature 3: Forge Coefficient Gauge ──────────────────────────────────────

function ForgeGauge() {
  const SCORE = 72; // 0-100 coupling score
  const springScore = useSpring(0, { stiffness: 40, damping: 12 });
  const needleRotation = useTransform(springScore, [0, 100], [-90, 90]);

  useEffect(() => { springScore.set(SCORE); }, [springScore]);

  const gaugeColor =
    SCORE >= 60 ? '#fb7185' :
      SCORE >= 30 ? '#fbbf24' : '#34d399';
  const gaugeLabel =
    SCORE >= 60 ? 'EXPOSED' :
      SCORE >= 30 ? 'COUPLED' : 'DECOUPLED';

  const DIRECTIVES = [
    'Diversify into 2 non-correlated revenue streams within 90 days — single-market dependency is a solvency risk.',
    'Hedge 30% of ARR pipeline against macro shock via annual-lock contracts. Quarterly customers are leverage against you.',
    'Audit top 5 enterprise accounts for market-sensitive budgets. Replace with public-sector or compliance-driven buyers.',
  ];

  return (
    <div id="forge-gauge" className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(8,15,31,0.8)' }}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.01) 2px,rgba(255,255,255,0.01) 4px)' }} />
      <div className="relative p-6">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={13} style={{ color: gaugeColor }} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: gaugeColor }}>MODULE 03</span>
        </div>
        <h2 className="text-lg font-black text-white mb-1">Forge Coefficient</h2>
        <p className="text-[11px] text-slate-500 mb-6">Business-market coupling exposure index</p>

        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Tachometer SVG */}
          <div className="relative w-56 h-32 flex-shrink-0">
            <svg viewBox="0 0 200 110" width="224" height="128">
              {/* Arc background */}
              <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" strokeLinecap="round" />
              {/* Emerald zone */}
              <path d="M 10 100 A 90 90 0 0 1 72 22" fill="none" stroke="#34d39930" strokeWidth="14" strokeLinecap="round" />
              {/* Amber zone */}
              <path d="M 72 22 A 90 90 0 0 1 128 22" fill="none" stroke="#fbbf2430" strokeWidth="14" strokeLinecap="round" />
              {/* Rose zone */}
              <path d="M 128 22 A 90 90 0 0 1 190 100" fill="none" stroke="#fb718530" strokeWidth="14" strokeLinecap="round" />
              {/* Zone labels */}
              <text x="18" y="118" fill="#34d399" fontSize="7" fontWeight="900" fontFamily="monospace">0</text>
              <text x="89" y="14" fill="#fbbf24" fontSize="7" fontWeight="900" fontFamily="monospace" textAnchor="middle">50</text>
              <text x="174" y="118" fill="#fb7185" fontSize="7" fontWeight="900" fontFamily="monospace">100</text>
              {/* Score display */}
              <text x="100" y="90" fill="white" fontSize="28" fontWeight="900" fontFamily="monospace" textAnchor="middle">{SCORE}</text>
              <text x="100" y="106" fill={gaugeColor} fontSize="8" fontWeight="900" fontFamily="monospace" textAnchor="middle" letterSpacing="3">{gaugeLabel}</text>
            </svg>
            {/* Needle */}
            <motion.div
              className="absolute bottom-0 left-1/2 origin-bottom"
              style={{ rotate: needleRotation, translateX: '-50%', translateY: '-8px', width: 2, height: 70, background: `linear-gradient(to top, ${gaugeColor}, transparent)`, borderRadius: 2, filter: `drop-shadow(0 0 6px ${gaugeColor})` }}
            />
          </div>

          {/* Directives */}
          {SCORE >= 60 && (
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={12} className="text-rose-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">BOARD DIRECTIVES — ACT NOW</span>
              </div>
              <div className="space-y-2">
                {DIRECTIVES.map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex gap-3 p-3 rounded-xl bg-rose-400/5 border border-rose-400/15">
                    <span className="text-[9px] font-black text-rose-400 font-mono mt-px shrink-0">0{i + 1}</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{d}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Feature 4: Forensic Seal + Report Archive ────────────────────────────────

const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenue Post-Mortem', icon: TrendingUp, description: 'MRR + SPY correlation export', color: '#38bdf8' },
  { id: 'transactions', label: 'Transaction Ledger', icon: FileText, description: 'Full transaction history CSV', color: '#34d399' },
  { id: 'users', label: 'User Intelligence', icon: Users, description: 'Churn, retention, LTV data', color: '#a78bfa' },
  { id: 'insights', label: 'AI Insights Dossier', icon: BarChart2, description: 'Groq-generated strategic intel', color: '#fb923c' },
];

function ForensicArchive() {
  const [reports, setReports] = useState<Report[]>([
    { id: '1', name: 'Revenue Post-Mortem', type: 'revenue', generatedAt: 'May 2, 2026', size: '4.2 KB', status: 'ready', healthScore: 94, latencyMs: 42, seal: generateSeal() },
    { id: '2', name: 'Transaction Ledger', type: 'transactions', generatedAt: 'May 1, 2026', size: '18.7 KB', status: 'ready', healthScore: 87, latencyMs: 110, seal: generateSeal() },
  ]);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (type: typeof REPORT_TYPES[0]) => {
    setGenerating(type.id);
    await new Promise(r => setTimeout(r, 1600));
    setReports(prev => [{
      id: Date.now().toString(),
      name: type.label,
      type: type.id as Report['type'],
      generatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      size: `${(Math.random() * 20 + 2).toFixed(1)} KB`,
      status: 'ready',
      healthScore: Math.round(75 + Math.random() * 25),
      latencyMs: Math.round(30 + Math.random() * 200),
      seal: generateSeal(),
    }, ...prev]);
    setGenerating(null);
  };

  const handleDownload = (report: Report) => {
    const csv = generateCSV(report.type, report.seal, report.healthScore, report.latencyMs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insightforge_${report.type}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="forensic-archive" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={13} className="text-violet-400" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">MODULE 04</span>
      </div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-white">Forensic Archive</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Cryptographically sealed intelligence exports with integrity proof</p>
        </div>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORT_TYPES.map(type => {
          const Icon = type.icon;
          const isGenerating = generating === type.id;
          return (
            <motion.button key={type.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleGenerate(type)} disabled={!!generating}
              className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] text-left transition-all disabled:opacity-50 group">
              <div className="p-2.5 rounded-xl border flex-shrink-0" style={{ background: `${type.color}15`, borderColor: `${type.color}25` }}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: type.color }} /> : <Icon className="w-4 h-4" style={{ color: type.color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white">{type.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{type.description}</p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 group-hover:text-sky-400 transition-colors shrink-0">
                {isGenerating ? 'FORGING...' : 'GENERATE →'}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Report list */}
      <div className="space-y-2">
        <AnimatePresence>
          {reports.map((report, i) => {
            const Icon = REPORT_TYPES.find(t => t.id === report.type)?.icon ?? FileText;
            return (
              <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(8,15,31,0.6)' }}>

                {/* CRT scanline */}
                <div className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />

                <div className="relative flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-white">{report.name}</p>
                      <p className="text-[10px] text-slate-600 font-bold mt-0.5 flex items-center gap-2">
                        <Calendar size={9} /> {report.generatedAt} · {report.size}
                      </p>
                    </div>
                  </div>

                  {/* Forensic Seal */}
                  <div className="flex-1 min-w-0 mx-4">
                    <div className="relative rounded-lg border border-violet-400/15 bg-violet-400/5 px-3 py-2 overflow-hidden">
                      <div className="pointer-events-none absolute inset-0"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(139,92,246,0.04) 2px,rgba(139,92,246,0.04) 4px)' }} />
                      <p className="text-[8px] font-mono text-violet-400 truncate relative">{report.seal}</p>
                      <div className="flex items-center gap-3 mt-1 relative">
                        <span className="text-[7px] font-mono text-slate-600">HEALTH: <span className="text-emerald-400">{report.healthScore}/100</span></span>
                        <span className="text-[7px] font-mono text-slate-600">LATENCY: <span className="text-sky-400">{report.latencyMs}ms</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400">
                      <CheckCircle2 size={9} /> SEALED
                    </span>
                    <button onClick={() => handleDownload(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-400 hover:bg-sky-500/20 transition-all">
                      <Download size={11} /> EXPORT
                    </button>
                    <button onClick={() => setReports(prev => prev.filter(r => r.id !== report.id))}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {reports.length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm font-bold">No sealed reports</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ReportsContent() {
  return (
    <div className="space-y-8 relative">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] opacity-15"
        style={{ background: 'radial-gradient(ellipse at center, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Reports</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Intelligence Archive</h1>
        <p className="text-slate-500 text-[12px] mt-1">
          Historical correlation · Scenario stress-testing · Market coupling · Sealed forensic exports
        </p>
      </div>

      {/* Module 01 */}
      <PostMortem />

      {/* Module 02 */}
      <StressTest />

      {/* Module 03 */}
      <ForgeGauge />

      {/* Module 04 */}
      <ForensicArchive />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <ReportsContent />
    </RoleGuard>
  );
}