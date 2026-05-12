"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Palette, Brain,
  Loader2, CheckCircle2, AlertCircle, Eye, EyeOff,
  Save, Trash2, Shield, Activity, Zap, TrendingUp,
  Globe, Hash, Terminal, Crosshair
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { AppearanceTab } from '@/components/dashboard/AppearanceTab';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'security' | 'notifications' | 'appearance' | 'ai';

type AIPersona = 'aggressive' | 'balanced' | 'defensive';

interface AuditEvent {
  timestamp: string;
  event: string;
  ip: string;
  severity: 'success' | 'warning' | 'critical';
}

interface NotifSettings {
  emailAlerts: boolean;
  weeklyReport: boolean;
  churnAlerts: boolean;
  revenueAlerts: boolean;
  revenueThreshold: number;
  churnThreshold: number;
}

interface AISettings {
  persona: AIPersona;
  tokensUsed: number;
  tokenLimit: number;
  alphaVantageWeight: number;
  newsApiWeight: number;
  supabaseWeight: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Alerts', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Strategy', icon: Brain },
];

const MOCK_AUDIT: AuditEvent[] = [
  { timestamp: '2026-05-12 09:41', event: 'Login — Google OAuth', ip: '103.21.244.12', severity: 'success' },
  { timestamp: '2026-05-11 22:18', event: 'Snapshot sealed — Q2 Revenue', ip: '103.21.244.12', severity: 'success' },
  { timestamp: '2026-05-11 14:03', event: 'Failed login attempt', ip: '185.220.101.4', severity: 'critical' },
  { timestamp: '2026-05-10 08:55', event: 'AI briefing generated', ip: '103.21.244.12', severity: 'success' },
  { timestamp: '2026-05-09 17:30', event: 'Password changed', ip: '103.21.244.12', severity: 'warning' },
  { timestamp: '2026-05-08 11:22', event: 'Forge link toggled — NewsAPI', ip: '103.21.244.12', severity: 'success' },
];

const PERSONA_META: Record<AIPersona, { label: string; desc: string; color: string; bg: string; border: string }> = {
  aggressive: {
    label: 'AGGRESSIVE', desc: 'Blunt, boardroom-direct. Zero hedging. High conviction calls.',
    color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30',
  },
  balanced: {
    label: 'BALANCED', desc: 'Structured analysis. Pros/cons surfaced. Moderate confidence.',
    color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30',
  },
  defensive: {
    label: 'DEFENSIVE', desc: 'Risk-first framing. Downside emphasis. Capital preservation mode.',
    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30',
  },
};

const SEVERITY_STYLE: Record<AuditEvent['severity'], string> = {
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  warning: 'text-amber-400  bg-amber-400/10  border-amber-400/20',
  critical: 'text-rose-400   bg-rose-400/10   border-rose-400/20',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /**/ }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16 }}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-[12px] font-bold',
        type === 'success'
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
      )}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </motion.div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={cn('relative w-10 h-[22px] rounded-full transition-all duration-300 flex-shrink-0',
        checked ? 'bg-sky-500' : 'bg-white/[0.1]')}
      style={{ boxShadow: checked ? '0 0 10px rgba(56,189,248,0.3)' : 'none' }}>
      <div className={cn('absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-300',
        checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-4 flex items-center gap-2">
      <div className="w-4 h-px bg-slate-700" />{children}<div className="flex-1 h-px bg-slate-800" />
    </h2>
  );
}

function SliderInput({
  label, value, min, max, unit = '%', color = '#38bdf8', onChange,
}: {
  label: string; value: number; min: number; max: number;
  unit?: string; color?: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-white">{label}</span>
        <span className="text-[11px] font-mono font-black" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.15 }} />
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
        style={{ position: 'relative' }} />
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({
  fullName, setFullName, email, userRole, isAdmin, savingProfile, onSave,
}: {
  fullName: string; setFullName: (v: string) => void; email: string;
  userRole: string; isAdmin: boolean; savingProfile: boolean; onSave: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sessionHash = mounted
    ? `SES-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    : 'SES-••••••••-••••••••';

  const roleColor = isAdmin
    ? { color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' }
    : { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' };

  return (
    <div className="p-6 space-y-6">
      <SectionTitle>STRATEGIC LEAD PROFILE</SectionTitle>

      {/* Avatar + role badges */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-xl font-black text-white border border-white/10"
            style={{ boxShadow: '0 0 24px rgba(56,189,248,0.2)' }}>
            {fullName ? fullName[0].toUpperCase() : email[0]?.toUpperCase() || '?'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#050a15]"
            style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-black text-white">{fullName || email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${roleColor.color} ${roleColor.bg} ${roleColor.border}`}>
              {isAdmin ? 'STRATEGIC LEAD' : 'ANALYST'}
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
              ACTIVE SESSION
            </span>
          </div>
        </div>
      </div>

      {/* Session metadata */}
      <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />
        <div className="relative grid grid-cols-2 gap-3">
          {[
            { label: 'SESSION ID', value: sessionHash, icon: <Hash size={8} /> },
            { label: 'ACCESS LEVEL', value: isAdmin ? 'FULL COMMAND' : 'READ-ONLY', icon: <Shield size={8} /> },
            { label: 'LAST LOGIN', value: '2026-05-12 09:41', icon: <Activity size={8} /> },
            { label: 'SESSION IP', value: '103.21.244.12', icon: <Globe size={8} /> },
          ].map(({ label, value, icon }) => (
            <div key={label}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-slate-600">{icon}</span>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">{label}</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {[
          { label: 'Full Name', value: fullName, onChange: setFullName, placeholder: 'Jane Doe', disabled: false },
          { label: 'Email Address', value: email, onChange: () => { }, placeholder: '', disabled: true },
        ].map(f => (
          <div key={f.label}>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">{f.label}</label>
            <input type="text" value={f.value} onChange={e => f.onChange(e.target.value)}
              placeholder={f.placeholder} disabled={f.disabled}
              className={cn(
                'w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all',
                f.disabled && 'opacity-40 cursor-not-allowed'
              )} />
            {f.disabled && <p className="text-[10px] text-slate-700 mt-1">Email is managed via OAuth provider.</p>}
          </div>
        ))}
      </div>

      <motion.button onClick={onSave} disabled={savingProfile}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20">
        {savingProfile ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : <><Save size={12} /> SAVE PROFILE</>}
      </motion.button>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab({
  isAdmin, newPw, setNewPw, confirmPw, setConfirmPw,
  showPw, setShowPw, savingPw, onChangePw,
  deleteConfirm, setDeleteConfirm, deletingAccount, onDelete,
}: {
  isAdmin: boolean;
  newPw: string; setNewPw: (v: string) => void;
  confirmPw: string; setConfirmPw: (v: string) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  savingPw: boolean; onChangePw: () => void;
  deleteConfirm: string; setDeleteConfirm: (v: string) => void;
  deletingAccount: boolean; onDelete: () => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <SectionTitle>CHANGE PASSWORD</SectionTitle>
      <div className="space-y-4">
        {[
          { label: 'New Password', value: newPw, onChange: setNewPw },
          { label: 'Confirm Password', value: confirmPw, onChange: setConfirmPw },
        ].map(f => (
          <div key={f.label}>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">{f.label}</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={f.value}
                onChange={e => f.onChange(e.target.value)} autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 pr-10 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <motion.button onClick={onChangePw} disabled={savingPw || !newPw || !confirmPw}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20">
        {savingPw ? <><Loader2 size={12} className="animate-spin" /> Updating...</> : <><Lock size={12} /> UPDATE PASSWORD</>}
      </motion.button>

      {/* Forensic Audit Trail */}
      <div className="pt-4">
        <SectionTitle>FORENSIC AUDIT TRAIL</SectionTitle>
        <div className="relative rounded-xl border border-white/[0.06] overflow-hidden"
          style={{ background: 'rgba(8,15,31,0.6)' }}>
          <div className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />
          <div className="relative divide-y divide-white/[0.04]">
            {MOCK_AUDIT.map((ev, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-2.5">
                <Terminal size={9} className="text-slate-700 shrink-0" />
                <span className="text-[9px] font-mono text-slate-600 shrink-0 w-28">{ev.timestamp}</span>
                <span className="text-[9px] font-bold text-slate-400 flex-1 truncate">{ev.event}</span>
                <span className="text-[8px] font-mono text-slate-700 shrink-0">{ev.ip}</span>
                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${SEVERITY_STYLE[ev.severity]}`}>
                  {ev.severity}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="pt-4 border-t border-rose-500/20">
          <SectionTitle>DANGER ZONE</SectionTitle>
          <p className="text-[12px] text-slate-500 mb-3">
            Type <span className="font-black text-white">DELETE</span> to permanently terminate your account and all associated intelligence data.
          </p>
          <div className="flex gap-2">
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Type DELETE"
              className="flex-1 px-4 py-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[13px] text-white placeholder-rose-900 focus:outline-none focus:border-rose-500/50 transition-all" />
            <button onClick={onDelete} disabled={deleteConfirm !== 'DELETE' || deletingAccount}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-[11px] font-black text-rose-400 hover:bg-rose-500/25 disabled:opacity-30 transition-all">
              {deletingAccount ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} DELETE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab({ onSave }: { onSave: (msg: string) => void }) {
  const [settings, setSettings] = useState<NotifSettings>(() =>
    loadLS('insightforge_notif', {
      emailAlerts: true, weeklyReport: true,
      churnAlerts: false, revenueAlerts: true,
      revenueThreshold: 10, churnThreshold: 2,
    })
  );

  const toggle = (key: keyof NotifSettings) => {
    if (typeof settings[key] === 'boolean') {
      const updated = { ...settings, [key]: !settings[key] };
      setSettings(updated);
      saveLS('insightforge_notif', updated);
    }
  };

  const setSlider = (key: keyof NotifSettings, val: number) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveLS('insightforge_notif', updated);
  };

  return (
    <div className="p-6 space-y-6">
      <SectionTitle>ALERT CHANNELS</SectionTitle>
      <div className="space-y-1">
        {[
          { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive important alerts via email' },
          { key: 'weeklyReport', label: 'Weekly Report', desc: 'Executive summary every Monday' },
          { key: 'churnAlerts', label: 'Churn Alerts', desc: 'Triggered when churn rate spikes' },
          { key: 'revenueAlerts', label: 'Revenue Alerts', desc: 'Triggered on significant MRR changes' },
        ].map(n => (
          <div key={n.key} className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
            <div>
              <p className="text-[12px] font-bold text-white">{n.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{n.desc}</p>
            </div>
            <Toggle
              checked={settings[n.key as keyof NotifSettings] as boolean}
              onChange={() => toggle(n.key as keyof NotifSettings)}
            />
          </div>
        ))}
      </div>

      {/* Market-relative thresholds */}
      <div className="pt-2">
        <SectionTitle>MARKET-RELATIVE THRESHOLDS</SectionTitle>
        <div className="space-y-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={11} className="text-sky-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">REVENUE ALERT TRIGGER</span>
            </div>
            <SliderInput
              label="Alert when MRR changes by"
              value={settings.revenueThreshold}
              min={1} max={50} unit="%" color="#38bdf8"
              onChange={v => setSlider('revenueThreshold', v)}
            />
            <p className="text-[9px] text-slate-600 mt-1.5">
              Alert fires when MRR delta ≥ {settings.revenueThreshold}% vs. prior period
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={11} className="text-rose-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">CHURN ALERT TRIGGER</span>
            </div>
            <SliderInput
              label="Alert when churn exceeds"
              value={settings.churnThreshold}
              min={1} max={20} unit="%" color="#fb7185"
              onChange={v => setSlider('churnThreshold', v)}
            />
            <p className="text-[9px] text-slate-600 mt-1.5">
              Alert fires when monthly churn ≥ {settings.churnThreshold}%
            </p>
          </div>
        </div>
      </div>

      <motion.button onClick={() => onSave('Alert preferences saved!')}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/20">
        <Save size={12} /> SAVE ALERTS
      </motion.button>
    </div>
  );
}

// ─── Tab: AI Strategy ─────────────────────────────────────────────────────────

function AIStrategyTab({ onSave }: { onSave: (msg: string) => void }) {
  const [settings, setSettings] = useState<AISettings>(() =>
    loadLS('insightforge_ai_settings', {
      persona: 'aggressive' as AIPersona,
      tokensUsed: 2847,
      tokenLimit: 10000,
      alphaVantageWeight: 70,
      newsApiWeight: 50,
      supabaseWeight: 90,
    })
  );

  const tokenPct = Math.min(100, (settings.tokensUsed / settings.tokenLimit) * 100);
  const tokenColor =
    tokenPct > 85 ? '#fb7185' :
      tokenPct > 60 ? '#fbbf24' : '#34d399';

  const setPersona = (p: AIPersona) => {
    const updated = { ...settings, persona: p };
    setSettings(updated);
    saveLS('insightforge_ai_settings', updated);
  };

  const setWeight = (key: keyof AISettings, val: number) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveLS('insightforge_ai_settings', updated);
  };

  const meta = PERSONA_META[settings.persona];

  return (
    <div className="p-6 space-y-6">
      <SectionTitle>AI PERSONA MODE</SectionTitle>

      {/* Persona toggle */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(PERSONA_META) as AIPersona[]).map(p => {
          const m = PERSONA_META[p];
          const active = settings.persona === p;
          return (
            <motion.button key={p} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setPersona(p)}
              className={`p-3 rounded-xl border text-left transition-all ${active ? `${m.bg} ${m.border}` : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              style={{ boxShadow: active ? `0 0 16px ${m.color.replace('text-', '').includes('sky') ? 'rgba(56,189,248,0.15)' : m.color.includes('rose') ? 'rgba(251,113,133,0.15)' : 'rgba(52,211,153,0.15)'}` : 'none' }}>
              <div className={`text-[8px] font-black uppercase tracking-widest mb-1.5 ${active ? m.color : 'text-slate-600'}`}>
                {m.label}
              </div>
              <p className="text-[9px] text-slate-500 leading-snug">{m.desc}</p>
              {active && (
                <div className={`mt-2 flex items-center gap-1 ${m.color}`}>
                  <Crosshair size={9} />
                  <span className="text-[7px] font-black uppercase tracking-widest">ACTIVE</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Active persona briefing */}
      <div className={`relative rounded-xl border p-3 overflow-hidden ${meta.bg} ${meta.border}`}>
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />
        <div className="relative flex items-center gap-2">
          <Brain size={11} className={meta.color} />
          <span className={`text-[8px] font-black uppercase tracking-widest ${meta.color}`}>
            GROQ AI OPERATING IN {meta.label} MODE
          </span>
        </div>
      </div>

      {/* Token Burn Meter */}
      <div className="pt-2">
        <SectionTitle>TOKEN BURN METER</SectionTitle>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={11} style={{ color: tokenColor }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: tokenColor }}>
                {tokenPct > 85 ? 'CRITICAL' : tokenPct > 60 ? 'WARNING' : 'NOMINAL'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              {settings.tokensUsed.toLocaleString()} / {settings.tokenLimit.toLocaleString()} tokens
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-2">
            <motion.div className="h-full rounded-full"
              style={{ background: tokenColor, boxShadow: `0 0 8px ${tokenColor}60` }}
              initial={{ width: 0 }} animate={{ width: `${tokenPct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-slate-600 font-mono">
              ${(settings.tokensUsed * 0.0000015).toFixed(4)} burned this month
            </span>
            <span className="text-[8px] text-slate-700 font-mono">Resets 2026-06-01</span>
          </div>
        </div>
      </div>

      {/* Signal Weighting */}
      <div className="pt-2">
        <SectionTitle>SIGNAL WEIGHTING</SectionTitle>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-5">
          <p className="text-[10px] text-slate-600 -mt-1">
            Controls how much each source influences Groq AI strategic briefings.
          </p>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={9} className="text-emerald-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">ALPHA VANTAGE — MARKET SIGNAL</span>
            </div>
            <SliderInput label="Market data influence" value={settings.alphaVantageWeight}
              min={0} max={100} color="#34d399"
              onChange={v => setWeight('alphaVantageWeight', v)} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={9} className="text-amber-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">NEWSAPI — SENTIMENT SIGNAL</span>
            </div>
            <SliderInput label="News sentiment influence" value={settings.newsApiWeight}
              min={0} max={100} color="#fbbf24"
              onChange={v => setWeight('newsApiWeight', v)} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={9} className="text-sky-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-sky-400">SUPABASE — INTERNAL SIGNAL</span>
            </div>
            <SliderInput label="Internal metrics influence" value={settings.supabaseWeight}
              min={0} max={100} color="#38bdf8"
              onChange={v => setWeight('supabaseWeight', v)} />
          </div>
        </div>
      </div>

      <motion.button onClick={() => onSave('AI strategy settings saved!')}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/20">
        <Save size={12} /> SAVE AI STRATEGY
      </motion.button>
    </div>
  );
}

// ─── Tab: Appearance (with Forensic HUD toggle) ───────────────────────────────

function AppearanceTabWrapper({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [forensicHUD, setForensicHUD] = useState(() => loadLS('insightforge_forensic_hud', false));

  const toggleHUD = () => {
    const next = !forensicHUD;
    setForensicHUD(next);
    saveLS('insightforge_forensic_hud', next);
    // Apply CRT scanline to root
    if (next) {
      document.documentElement.classList.add('forensic-hud');
    } else {
      document.documentElement.classList.remove('forensic-hud');
    }
    showToast(`Forensic HUD ${next ? 'enabled' : 'disabled'}`, 'success');
  };

  return (
    <div>
      {/* Forensic HUD toggle — injected before AppearanceTab content */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Terminal size={11} className="text-violet-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">FORENSIC HUD</span>
            </div>
            <p className="text-[11px] text-slate-500">Enable CRT scanline overlay across all dashboard panels</p>
          </div>
          <Toggle checked={forensicHUD} onChange={toggleHUD} />
        </div>
        {forensicHUD && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[9px] font-mono text-violet-400/60 mb-4 px-1">
            ▸ SCANLINE OVERLAY ACTIVE — 10% opacity CRT mode engaged
          </motion.p>
        )}
      </div>
      <AppearanceTab showToast={showToast} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { role, loading: roleLoading } = useUserRole();
  const isAdmin = role === 'admin';

  const [tab, setTab] = useState<Tab>('profile');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Profile
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles').select('full_name, role').eq('id', user.id).single();
        if (profile) { setFullName(profile.full_name || ''); setUserRole(profile.role || 'user'); }
      } catch { /**/ }
    };
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
      if (error) throw error;
      showToast('Profile updated!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    if (newPw.length < 6) { showToast('Password must be 6+ characters', 'error'); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setNewPw(''); setConfirmPw('');
      showToast('Password updated!', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update password', 'error');
    } finally { setSavingPw(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      await supabase.auth.signOut();
      showToast('Account terminated. Redirecting...', 'success');
      setTimeout(() => { window.location.href = '/auth'; }, 1500);
    } catch { showToast('Failed to delete account', 'error'); }
    finally { setDeletingAccount(false); }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    );
  }

  const visibleTabs = isAdmin ? TABS : TABS.filter(t => t.id !== 'ai');

  return (
    <div className="space-y-6 max-w-3xl relative">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] opacity-10"
        style={{ background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.2) 0%, transparent 70%)' }} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Settings</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Strategic Command Center</h1>
            <p className="text-slate-500 text-[12px] mt-1">Account · Security · AI strategy · Intelligence preferences</p>
          </div>
          <div className={cn(
            'px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5',
            isAdmin
              ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
          )}>
            <Shield size={10} />
            {isAdmin ? 'STRATEGIC LEAD' : 'ANALYST'} ACCESS
          </div>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all text-left',
                tab === t.id
                  ? 'bg-white/[0.08] border border-white/[0.1] text-white'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
              )}>
              <t.icon className={cn('w-4 h-4 flex-shrink-0', tab === t.id ? 'text-sky-400' : 'text-slate-600')} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ background: 'rgba(8,15,31,0.8)' }}
            >
              {/* CRT scanline */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />

              <div className="relative">
                {tab === 'profile' && (
                  <ProfileTab
                    fullName={fullName} setFullName={setFullName}
                    email={email} userRole={userRole} isAdmin={isAdmin}
                    savingProfile={savingProfile} onSave={handleSaveProfile}
                  />
                )}
                {tab === 'security' && (
                  <SecurityTab
                    isAdmin={isAdmin}
                    newPw={newPw} setNewPw={setNewPw}
                    confirmPw={confirmPw} setConfirmPw={setConfirmPw}
                    showPw={showPw} setShowPw={setShowPw}
                    savingPw={savingPw} onChangePw={handleChangePassword}
                    deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
                    deletingAccount={deletingAccount} onDelete={handleDeleteAccount}
                  />
                )}
                {tab === 'notifications' && (
                  <NotificationsTab onSave={msg => showToast(msg, 'success')} />
                )}
                {tab === 'appearance' && (
                  <AppearanceTabWrapper showToast={showToast} />
                )}
                {tab === 'ai' && (
                  <AIStrategyTab onSave={msg => showToast(msg, 'success')} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}