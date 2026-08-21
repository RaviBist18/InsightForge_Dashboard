"use client";
import Link from "next/link";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Palette,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { AppearanceTab } from "@/components/dashboard/AppearanceTab";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "appearance";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "appearance", label: "Appearance", icon: Palette },
];

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
function DeleteAccountModal({
  email,
  confirmText,
  setConfirmText,
  deleting,
  onConfirm,
  onCancel,
}: {
  email: string;
  confirmText: string;
  setConfirmText: (v: string) => void;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--danger)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} style={{ color: "var(--danger)" }} />
          <h3
            className="text-[14px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Delete account
          </h3>
        </div>
        <p
          className="text-[13px] mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          This permanently deletes your account and all data. This cannot be
          undone. To confirm, type{" "}
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {email}
          </span>{" "}
          below.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={email}
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none mb-4"
          style={{
            background: "var(--danger-bg)",
            border: "1px solid var(--danger)",
            color: "var(--text-primary)",
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== email || deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold disabled:opacity-40 transition-colors"
            style={{ background: "var(--danger)", color: "white" }}
          >
            {deleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              "Delete permanently"
            )}
          </button>
        </div>
      </motion.div>
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
  newPw,
  setNewPw,
  confirmPw,
  setConfirmPw,
  showPw,
  setShowPw,
  savingPw,
  onChangePw,
  onDelete,
}: {
  newPw: string;
  setNewPw: (v: string) => void;
  confirmPw: string;
  setConfirmPw: (v: string) => void;
  showPw: boolean;
  setShowPw: (v: boolean) => void;
  savingPw: boolean;
  onChangePw: () => void;
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
      <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <SectionTitle>Danger Zone</SectionTitle>
        <p
          className="text-[13px] mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Permanently delete your account and all associated data. This cannot
          be undone.
        </p>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
          style={{
            background: "var(--danger-bg)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
          }}
        >
          <Trash2 size={13} />
          Delete Account
        </button>
      </div>
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    if (deleteConfirm !== email) return;
    setDeletingAccount(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");

      showToast("Account deleted. Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete account",
        "error",
      );
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
  const visibleTabs = TABS;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Link href="/dashboard" className="hover:underline cursor-pointer">
            Dashboard
          </Link>
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

      <div className="flex flex-col md:flex-row gap-5">
        {/* Sidebar — horizontal scrollable tabs on mobile, vertical column on desktop */}
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 md:w-44 md:flex-shrink-0 pb-1 md:pb-0">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left whitespace-nowrap flex-shrink-0 md:flex-shrink md:w-full"
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
                  newPw={newPw}
                  setNewPw={setNewPw}
                  confirmPw={confirmPw}
                  setConfirmPw={setConfirmPw}
                  showPw={showPw}
                  setShowPw={setShowPw}
                  savingPw={savingPw}
                  onChangePw={handleChangePassword}
                  onDelete={() => setShowDeleteModal(true)}
                />
              )}
              {tab === "appearance" && <AppearanceTab showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal
            email={email}
            confirmText={deleteConfirm}
            setConfirmText={setDeleteConfirm}
            deleting={deletingAccount}
            onConfirm={handleDeleteAccount}
            onCancel={() => {
              setShowDeleteModal(false);
              setDeleteConfirm("");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
