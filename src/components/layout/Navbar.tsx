"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Menu,
  X,
  Loader2,
  Shield,
  Building2,
  RefreshCw,
} from "lucide-react";
import {
  loadAlerts,
  getTriggeredAlerts,
  getUnreadTriggeredAlerts,
  markAlertRead,
  ALERTS_UPDATED_EVENT,
  type SavedAlert,
} from "@/lib/alertCenter";
import { getAggregateRisks, type AggregateRiskResult } from "@/lib/data";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut } from "lucide-react";

const getInitials = (nameOrEmail: string) => {
  if (!nameOrEmail) return "??";
  if (nameOrEmail.includes("@"))
    return nameOrEmail.substring(0, 2).toUpperCase();
  const parts = nameOrEmail.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nameOrEmail.substring(0, 2).toUpperCase();
};

export const Navbar: React.FC<{
  onMenuClick?: () => void;
  companyName?: string | null;
}> = ({ onMenuClick, companyName }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { role, name, email, loading: roleLoading } = useUserRole();
  const isAdmin = role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const [dropdownView, setDropdownView] = useState<"profile" | "switch">(
    "profile",
  );
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [newAccountEmail, setNewAccountEmail] = useState("");

  useEffect(() => {
    setAlerts(loadAlerts());
    const handler = () => setAlerts(loadAlerts());
    window.addEventListener(ALERTS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ALERTS_UPDATED_EVENT, handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("if_saved_accounts");
      if (raw) setSavedAccounts(JSON.parse(raw));
    } catch {}
  }, []);

  const triggeredAlerts = getTriggeredAlerts(alerts);
  const unreadCount = getUnreadTriggeredAlerts(alerts).length;

  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("globalSearch", { detail: searchQuery.toLowerCase() }),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [riskData, setRiskData] = useState<AggregateRiskResult | null>(null);

  useEffect(() => {
    getAggregateRisks()
      .then(setRiskData)
      .catch(() => {});
  }, []);

  const handleSearchFocus = () => {
    if (pathname !== "/") router.push("/");
  };

  const markAllRead = () =>
    setAlerts(
      triggeredAlerts.reduce((acc, a) => markAlertRead(acc, a.id), alerts),
    );

  const handleAddAccount = () => {
    const email = newAccountEmail.trim();
    if (!email || savedAccounts.includes(email)) return;
    const updated = [...savedAccounts, email];
    setSavedAccounts(updated);
    localStorage.setItem("if_saved_accounts", JSON.stringify(updated));
    setNewAccountEmail("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-dropdown]")) {
        setShowNotifications(false);
        setShowProfile(false);
        setDropdownView("profile");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex flex-col items-center justify-center gap-4"
          >
            {/* FIX: Dynamic color for logout loader */}
            <Loader2
              className="w-10 h-10 animate-spin"
              style={{ color: "var(--accent)" }}
            />
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Signing Out...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        className="h-14 border-b px-4 flex items-center justify-between sticky top-0 z-20 gap-4"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-xl transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <Menu size={18} />
          </button>
          <div className="relative group flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors"
              style={{
                color: searchQuery ? "var(--accent)" : "var(--text-muted)",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
              placeholder="Search metrics, users, or reports..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-[13px] focus:outline-none transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: `1px solid ${searchQuery ? "var(--accent)" : "var(--border)"}`,
                color: "var(--text-primary)",
              }}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {companyName && (
            <div
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-[12px]"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-subtle)" }}
              >
                <Building2 size={11} style={{ color: "var(--accent)" }} />
              </div>
              <span
                className="font-semibold truncate max-w-[140px]"
                style={{ color: "var(--text-primary)" }}
              >
                {companyName}
              </span>
            </div>
          )}

          {/* Notifications */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 rounded-xl transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden shadow-md z-50"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Alerts
                    </p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-medium hover:opacity-70 transition-opacity"
                        style={{ color: "var(--accent)" }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div
                    className="divide-y max-h-[320px] overflow-y-auto"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {triggeredAlerts.length === 0 &&
                    (!riskData || riskData.risks.length === 0) ? (
                      <div
                        className="px-4 py-6 text-center text-[12px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No alerts triggered
                      </div>
                    ) : (
                      <>
                        {triggeredAlerts.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => {
                              setAlerts(markAlertRead(loadAlerts(), a.id));
                              setShowNotifications(false);
                              router.push("/dashboard/saved-views");
                            }}
                            className="px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--bg-primary)]"
                          >
                            <div className="flex items-start gap-2.5">
                              {!a.read && (
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                                  style={{ background: "var(--accent)" }}
                                />
                              )}
                              <div className={cn(a.read && "pl-4")}>
                                <p
                                  className="text-[13px] font-medium"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {a.name}
                                </p>
                                <p
                                  className="text-[12px] mt-0.5"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {a.triggeredValue != null
                                    ? `${a.triggeredValue > 0 ? "+" : ""}${a.triggeredValue}%${a.triggeredSource ? ` (${a.triggeredSource})` : ""}`
                                    : "Triggered"}
                                </p>
                                <p
                                  className="text-[10px] mt-1 font-medium uppercase tracking-wider"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {a.lastChecked ?? ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {riskData && riskData.risks.length > 0 && (
                          <>
                            <div
                              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                              style={{
                                color: "var(--text-muted)",
                                background: "var(--bg-primary)",
                              }}
                            >
                              Risks ({riskData.riskCount.high} high,{" "}
                              {riskData.riskCount.medium} medium)
                            </div>
                            {riskData.risks.map((r, i) => (
                              <div
                                key={`${r.filename}-${r.category}-${i}`}
                                className="px-4 py-3"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                                    style={{
                                      background:
                                        r.severity === "high"
                                          ? "var(--danger)"
                                          : "var(--warning)",
                                    }}
                                  />
                                  <div>
                                    <p
                                      className="text-[13px] font-medium"
                                      style={{
                                        color:
                                          r.severity === "high"
                                            ? "var(--danger)"
                                            : "var(--warning)",
                                      }}
                                    >
                                      {r.category} Risk
                                    </p>
                                    <p
                                      className="text-[12px] mt-0.5"
                                      style={{ color: "var(--text-secondary)" }}
                                    >
                                      {r.message}
                                    </p>
                                    <p
                                      className="text-[10px] mt-1 font-medium uppercase tracking-wider"
                                      style={{ color: "var(--text-muted)" }}
                                    >
                                      {r.filename}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => {
                setShowProfile((v) => !v);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 rounded-xl transition-colors"
            >
              {roleLoading ? (
                <div
                  className="w-7 h-7 rounded-full animate-pulse"
                  style={{ background: "var(--border)" }}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {getInitials(name)}
                </div>
              )}
            </button>
            <AnimatePresence>
              {showProfile && !roleLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden shadow-md z-50"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {dropdownView === "profile" ? (
                    <>
                      <div
                        className="px-4 py-4 border-b"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                            style={{ background: "var(--accent)" }}
                          >
                            {getInitials(name)}
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <p
                              className="text-[13px] font-semibold truncate leading-tight"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {name}
                            </p>
                            <p
                              className="text-[12px] truncate mt-0.5"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {email}
                            </p>
                          </div>
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold uppercase tracking-widest"
                          style={{
                            background: "var(--accent-subtle)",
                            color: "var(--accent)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <Shield size={9} />
                          {isAdmin ? "Administrator" : "Member"}
                        </div>
                      </div>

                      <button
                        onClick={() => setDropdownView("switch")}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium border-b transition-colors"
                        style={{
                          color: "var(--text-secondary)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <RefreshCw size={13} />
                        Switch account
                      </button>

                      <button
                        onClick={async () => {
                          setIsLoggingOut(true);
                          await supabase.auth.signOut();
                          window.location.href = "/auth";
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-[13px] font-medium transition-colors"
                        style={{ color: "var(--danger)" }}
                      >
                        <LogOut size={13} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="px-4 py-3 border-b flex items-center justify-between"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <p
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Switch account
                        </p>
                        <button
                          onClick={() => setDropdownView("profile")}
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="px-4 py-3 space-y-2">
                        {savedAccounts.map((acc) => (
                          <a
                            key={acc}
                            href={`/auth?email=${encodeURIComponent(acc)}`}
                            className="block w-full px-3 py-2.5 rounded-xl text-[12px] font-medium truncate transition-colors"
                            style={{
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {acc}
                          </a>
                        ))}

                        <input
                          type="email"
                          value={newAccountEmail}
                          onChange={(e) => setNewAccountEmail(e.target.value)}
                          placeholder="Add account email"
                          className="w-full px-3 py-2.5 rounded-xl text-[12px] focus:outline-none"
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />

                        <button
                          onClick={handleAddAccount}
                          disabled={!newAccountEmail.trim()}
                          className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-colors"
                          style={{
                            background: newAccountEmail.trim()
                              ? "var(--accent)"
                              : "var(--border)",
                            color: "white",
                          }}
                        >
                          + Add account
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
};
