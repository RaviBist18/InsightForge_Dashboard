"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Bell,
  Palette,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Shield,
  TrendingUp,
  Zap,
  Globe,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { AppearanceTab } from "@/components/dashboard/AppearanceTab";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "notifications" | "appearance" | "ai";

type AIPersona = "aggressive" | "balanced" | "defensive";

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
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai", label: "AI Strategy", icon: Brain },
];

const PERSONA_META: Record<AIPersona, { label: string; desc: string }> = {
  aggressive: {
    label: "Aggressive",
    desc: "Blunt, boardroom-direct. Zero hedging. High conviction calls.",
  },
  balanced: {
    label: "Balanced",
    desc: "Structured analysis. Pros/cons surfaced. Moderate confidence.",
  },
  defensive: {
    label: "Defensive",
    desc: "Risk-first framing. Downside emphasis. Capital preservation mode.",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /**/
  }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-md text-[13px] font-medium"
      style={{
        background:
          type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
        border: `1px solid ${type === "success" ? "var(--success)" : "var(--danger)"}`,
        color: type === "success" ? "var(--success)" : "var(--danger)",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {msg}
    </motion.div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="relative w-10 h-[22px] rounded-full transition-all duration-300 flex-shrink-0"
      style={{ background: checked ? "var(--accent)" : "var(--border-strong)" }}
    >
      <div
        className={cn(
          "absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-300",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[11px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
      style={{ color: "var(--text-muted)" }}
    >
      <div
        className="w-4 h-px"
        style={{ background: "var(--border-strong)" }}
      />
      {children}
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </h2>
  );
}

function SliderInput({
  label,
  value,
  min,
  max,
  unit = "%",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        <span
          className="text-[12px] font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.15 }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
        style={{ position: "relative" }}
      />
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({
  fullName,
  setFullName,
  email,
  isAdmin,
  savingProfile,
  onSave,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  userRole: string;
  isAdmin: boolean;
  savingProfile: boolean;
  onSave: () => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <SectionTitle>Profile</SectionTitle>

      {/* Avatar + role badge */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-semibold text-white flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          {fullName
            ? fullName[0].toUpperCase()
            : email[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <p
            className="text-[14px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {fullName || email}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-xl"
              style={{
                color: "var(--accent)",
                background: "var(--accent-subtle)",
              }}
            >
              {isAdmin ? "Admin" : "Member"}
            </span>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-xl"
              style={{
                color: "var(--success)",
                background: "var(--success-bg)",
              }}
            >
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {[
          {
            label: "Full Name",
            value: fullName,
            onChange: setFullName,
            placeholder: "Jane Doe",
            disabled: false,
          },
          {
            label: "Email Address",
            value: email,
            onChange: () => {},
            placeholder: "",
            disabled: true,
          },
        ].map((f) => (
          <div key={f.label}>
            <label
              className="text-[12px] font-medium block mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {f.label}
            </label>
            <input
              type="text"
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              placeholder={f.placeholder}
              disabled={f.disabled}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-[13px] focus:outline-none transition-all",
                f.disabled && "opacity-60 cursor-not-allowed",
              )}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            {f.disabled && (
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Email is managed via OAuth provider.
              </p>
            )}
          </div>
        ))}
      </div>

      <motion.button
        onClick={onSave}
        disabled={savingProfile}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white disabled:opacity-50 transition-colors"
        style={{ background: "var(--accent)" }}
      >
        {savingProfile ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save size={13} /> Save Profile
          </>
        )}
      </motion.button>
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

function SecurityTab({
  isAdmin,
  newPw,
  setNewPw,
  confirmPw,
  setConfirmPw,
  showPw,
  setShowPw,
  savingPw,
  onChangePw,
  deleteConfirm,
  setDeleteConfirm,
  deletingAccount,
  onDelete,
}: {
  isAdmin: boolean;
  newPw: string;
  setNewPw: (v: string) => void;
  confirmPw: string;
  setConfirmPw: (v: string) => void;
  showPw: boolean;
  setShowPw: (v: boolean) => void;
  savingPw: boolean;
  onChangePw: () => void;
  deleteConfirm: string;
  setDeleteConfirm: (v: string) => void;
  deletingAccount: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <SectionTitle>Change Password</SectionTitle>
      <div className="space-y-4">
        {[
          { label: "New Password", value: newPw, onChange: setNewPw },
          {
            label: "Confirm Password",
            value: confirmPw,
            onChange: setConfirmPw,
          },
        ].map((f) => (
          <div key={f.label}>
            <label
              className="text-[12px] font-medium block mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {f.label}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 pr-10 py-3 rounded-xl text-[13px] focus:outline-none transition-all"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <motion.button
        onClick={onChangePw}
        disabled={savingPw || !newPw || !confirmPw}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white disabled:opacity-50 transition-colors"
        style={{ background: "var(--accent)" }}
      >
        {savingPw ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Updating...
          </>
        ) : (
          <>
            <Lock size={13} /> Update Password
          </>
        )}
      </motion.button>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <SectionTitle>Danger Zone</SectionTitle>
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Type{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              DELETE
            </span>{" "}
            to permanently delete your account and all associated data.
          </p>
          <div className="flex gap-2">
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-all"
              style={{
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={onDelete}
              disabled={deleteConfirm !== "DELETE" || deletingAccount}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium disabled:opacity-40 transition-colors"
              style={{
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
              }}
            >
              {deletingAccount ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}{" "}
              Delete
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
    loadLS("insightforge_notif", {
      emailAlerts: true,
      weeklyReport: true,
      churnAlerts: false,
      revenueAlerts: true,
      revenueThreshold: 10,
      churnThreshold: 2,
    }),
  );

  const toggle = (key: keyof NotifSettings) => {
    if (typeof settings[key] === "boolean") {
      const updated = { ...settings, [key]: !settings[key] };
      setSettings(updated);
      saveLS("insightforge_notif", updated);
    }
  };

  const setSlider = (key: keyof NotifSettings, val: number) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveLS("insightforge_notif", updated);
  };

  return (
    <div className="p-6 space-y-6">
      <SectionTitle>Alert Channels</SectionTitle>
      <div className="space-y-1">
        {[
          {
            key: "emailAlerts",
            label: "Email Alerts",
            desc: "Receive important alerts via email",
          },
          {
            key: "weeklyReport",
            label: "Weekly Report",
            desc: "Executive summary every Monday",
          },
          {
            key: "churnAlerts",
            label: "Churn Alerts",
            desc: "Triggered when churn rate spikes",
          },
          {
            key: "revenueAlerts",
            label: "Revenue Alerts",
            desc: "Triggered on significant MRR changes",
          },
        ].map((n) => (
          <div
            key={n.key}
            className="flex items-center justify-between gap-4 py-3.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {n.label}
              </p>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {n.desc}
              </p>
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
        <SectionTitle>Alert Thresholds</SectionTitle>
        <div
          className="space-y-5 rounded-xl p-4"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} style={{ color: "var(--accent)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--accent)" }}
              >
                Revenue Alert Trigger
              </span>
            </div>
            <SliderInput
              label="Alert when MRR changes by"
              value={settings.revenueThreshold}
              min={1}
              max={50}
              unit="%"
              onChange={(v) => setSlider("revenueThreshold", v)}
            />
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Alert fires when MRR delta ≥ {settings.revenueThreshold}% vs.
              prior period
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={13} style={{ color: "var(--danger)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--danger)" }}
              >
                Churn Alert Trigger
              </span>
            </div>
            <SliderInput
              label="Alert when churn exceeds"
              value={settings.churnThreshold}
              min={1}
              max={20}
              unit="%"
              onChange={(v) => setSlider("churnThreshold", v)}
            />
            <p
              className="text-[11px] mt-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Alert fires when monthly churn ≥ {settings.churnThreshold}%
            </p>
          </div>
        </div>
      </div>

      <motion.button
        onClick={() => onSave("Alert preferences saved!")}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white transition-colors"
        style={{ background: "var(--accent)" }}
      >
        <Save size={13} /> Save Alerts
      </motion.button>
    </div>
  );
}

// ─── Tab: AI Strategy ─────────────────────────────────────────────────────────

function AIStrategyTab({ onSave }: { onSave: (msg: string) => void }) {
  const [settings, setSettings] = useState<AISettings>(() =>
    loadLS("insightforge_ai_settings", {
      persona: "aggressive" as AIPersona,
      tokensUsed: 2847,
      tokenLimit: 10000,
      alphaVantageWeight: 70,
      newsApiWeight: 50,
      supabaseWeight: 90,
    }),
  );

  const tokenPct = Math.min(
    100,
    (settings.tokensUsed / settings.tokenLimit) * 100,
  );
  const tokenColor =
    tokenPct > 85
      ? "var(--danger)"
      : tokenPct > 60
        ? "var(--warning)"
        : "var(--success)";

  const setPersona = (p: AIPersona) => {
    const updated = { ...settings, persona: p };
    setSettings(updated);
    saveLS("insightforge_ai_settings", updated);
  };

  const setWeight = (key: keyof AISettings, val: number) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveLS("insightforge_ai_settings", updated);
  };

  return (
    <div className="p-6 space-y-6">
      <SectionTitle>AI Persona Mode</SectionTitle>

      {/* Persona toggle */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(PERSONA_META) as AIPersona[]).map((p) => {
          const m = PERSONA_META[p];
          const active = settings.persona === p;
          return (
            <motion.button
              key={p}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPersona(p)}
              className="p-3 rounded-xl text-left transition-all"
              style={{
                background: active
                  ? "var(--accent-subtle)"
                  : "var(--bg-primary)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {m.label}
              </div>
              <p
                className="text-[11px] leading-snug"
                style={{ color: "var(--text-secondary)" }}
              >
                {m.desc}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Token usage */}
      <div className="pt-2">
        <SectionTitle>Token Usage</SectionTitle>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={13} style={{ color: tokenColor }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: tokenColor }}
              >
                {tokenPct > 85
                  ? "Critical"
                  : tokenPct > 60
                    ? "Warning"
                    : "Nominal"}
              </span>
            </div>
            <span
              className="text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {settings.tokensUsed.toLocaleString()} /{" "}
              {settings.tokenLimit.toLocaleString()} tokens
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden mb-2"
            style={{ background: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: tokenColor }}
              initial={{ width: 0 }}
              animate={{ width: `${tokenPct}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              ${(settings.tokensUsed * 0.0000015).toFixed(4)} used this month
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Resets 2026-06-01
            </span>
          </div>
        </div>
      </div>

      {/* Signal Weighting */}
      <div className="pt-2">
        <SectionTitle>Signal Weighting</SectionTitle>
        <div
          className="rounded-xl p-4 space-y-5"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-[12px] -mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Controls how much each source influences AI strategic briefings.
          </p>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={12} style={{ color: "var(--success)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--success)" }}
              >
                Alpha Vantage — Market Signal
              </span>
            </div>
            <SliderInput
              label="Market data influence"
              value={settings.alphaVantageWeight}
              min={0}
              max={100}
              onChange={(v) => setWeight("alphaVantageWeight", v)}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={12} style={{ color: "var(--warning)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--warning)" }}
              >
                NewsAPI — Sentiment Signal
              </span>
            </div>
            <SliderInput
              label="News sentiment influence"
              value={settings.newsApiWeight}
              min={0}
              max={100}
              onChange={(v) => setWeight("newsApiWeight", v)}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={12} style={{ color: "var(--accent)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--accent)" }}
              >
                Supabase — Internal Signal
              </span>
            </div>
            <SliderInput
              label="Internal metrics influence"
              value={settings.supabaseWeight}
              min={0}
              max={100}
              onChange={(v) => setWeight("supabaseWeight", v)}
            />
          </div>
        </div>
      </div>

      <motion.button
        onClick={() => onSave("AI strategy settings saved!")}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white transition-colors"
        style={{ background: "var(--accent)" }}
      >
        <Save size={13} /> Save AI Strategy
      </motion.button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { role, loading: roleLoading } = useUserRole();
  const isAdmin = role === "admin";

  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Profile
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Security
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email || "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        if (profile) {
          setFullName(profile.full_name || "");
          setUserRole(profile.role || "user");
        }
      } catch {
        /**/
      }
    };
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (error) throw error;
      showToast("Profile updated!", "success");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update profile",
        "error",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (newPw.length < 6) {
      showToast("Password must be 6+ characters", "error");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setNewPw("");
      setConfirmPw("");
      showToast("Password updated!", "success");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update password",
        "error",
      );
    } finally {
      setSavingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeletingAccount(true);
    try {
      await supabase.auth.signOut();
      showToast("Account deleted. Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch {
      showToast("Failed to delete account", "error");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: "var(--accent)" }}
        />
      </div>
    );
  }

  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => t.id !== "ai");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span>Dashboard</span>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>Settings</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1
              className="text-[22px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Settings
            </h1>
            <p
              className="text-[13px] mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Account, security, and AI strategy preferences
            </p>
          </div>
          <div
            className="px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5"
            style={{
              background: "var(--accent-subtle)",
              color: "var(--accent)",
            }}
          >
            <Shield size={12} />
            {isAdmin ? "Admin" : "Member"} Access
          </div>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left"
              style={{
                background:
                  tab === t.id ? "var(--accent-subtle)" : "transparent",
                color: tab === t.id ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <t.icon
                className="w-4 h-4 flex-shrink-0"
                style={{
                  color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
                }}
              />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              {tab === "profile" && (
                <ProfileTab
                  fullName={fullName}
                  setFullName={setFullName}
                  email={email}
                  userRole={userRole}
                  isAdmin={isAdmin}
                  savingProfile={savingProfile}
                  onSave={handleSaveProfile}
                />
              )}
              {tab === "security" && (
                <SecurityTab
                  isAdmin={isAdmin}
                  newPw={newPw}
                  setNewPw={setNewPw}
                  confirmPw={confirmPw}
                  setConfirmPw={setConfirmPw}
                  showPw={showPw}
                  setShowPw={setShowPw}
                  savingPw={savingPw}
                  onChangePw={handleChangePassword}
                  deleteConfirm={deleteConfirm}
                  setDeleteConfirm={setDeleteConfirm}
                  deletingAccount={deletingAccount}
                  onDelete={handleDeleteAccount}
                />
              )}
              {tab === "notifications" && (
                <NotificationsTab onSave={(msg) => showToast(msg, "success")} />
              )}
              {tab === "appearance" && <AppearanceTab showToast={showToast} />}
              {tab === "ai" && (
                <AIStrategyTab onSave={(msg) => showToast(msg, "success")} />
              )}
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
