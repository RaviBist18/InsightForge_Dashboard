"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Bell,
  Menu,
  X,
  Loader2,
  CheckCircle2,
  Download,
  Shield,
  Building2,
} from "lucide-react";
import { TRANSACTIONS } from "@/data/mockData";
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

const ADMIN_NOTIFICATIONS = [
  {
    id: 1,
    title: "New transaction pending",
    desc: "TX-1053 requires review",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    title: "Revenue target hit",
    desc: "90% of Q2 goal reached",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    title: "Churn rate alert",
    desc: "Spike detected in EMEA region",
    time: "3h ago",
    unread: false,
  },
];

const USER_NOTIFICATIONS = [
  {
    id: 1,
    title: "Dashboard updated",
    desc: "New data available",
    time: "5m ago",
    unread: true,
  },
  {
    id: 2,
    title: "Weekly report ready",
    desc: "Your summary is ready to view",
    time: "2h ago",
    unread: false,
  },
];
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
  const [exportState, setExportState] = useState<
    "idle" | "generating" | "done"
  >("idle");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState(
    isAdmin ? ADMIN_NOTIFICATIONS : USER_NOTIFICATIONS,
  );

  // Update notifications when role loads
  useEffect(() => {
    setNotifications(isAdmin ? ADMIN_NOTIFICATIONS : USER_NOTIFICATIONS);
  }, [isAdmin]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("globalSearch", { detail: searchQuery.toLowerCase() }),
      );
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSearchFocus = () => {
    if (pathname !== "/") router.push("/");
  };

  const handleExport = useCallback(() => {
    if (!isAdmin) return; // Guard — users can't export
    setExportState("generating");
    setTimeout(() => {
      const csv =
        "Date,Entity,Amount,Status\n" +
        TRANSACTIONS.map(
          (tx) => `"${tx.date}","${tx.customer}","${tx.amount}","${tx.status}"`,
        ).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `insightforge_mrr_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setExportState("done");
      setTimeout(() => setExportState("idle"), 2500);
    }, 800);
  }, [isAdmin]);

  const markAllRead = () =>
    setNotifications((n) => n.map((x) => ({ ...x, unread: false })));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-dropdown]")) {
        setShowNotifications(false);
        setShowProfile(false);
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

          {/* Export CSV — Admin only */}
          {isAdmin && (
            <motion.button
              onClick={handleExport}
              disabled={exportState !== "idle"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors duration-200",
              )}
              style={{
                background:
                  exportState === "done"
                    ? "var(--success-bg)"
                    : "var(--bg-primary)",
                borderColor:
                  exportState === "done" ? "var(--success)" : "var(--border)",
                color:
                  exportState === "done"
                    ? "var(--success)"
                    : "var(--text-secondary)",
              }}
            >
              <AnimatePresence mode="wait">
                {exportState === "idle" && (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Download size={11} /> Export CSV
                  </motion.span>
                )}
                {exportState === "generating" && (
                  <motion.span
                    key="gen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Loader2 size={11} className="animate-spin" /> Generating...
                  </motion.span>
                )}
                {exportState === "done" && (
                  <motion.span
                    key="done"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={11} /> Downloaded!
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Notifications */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => {
                router.push("/dashboard/settings");
              }}
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
                      Notifications
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
                    className="divide-y"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((x) =>
                              x.id === n.id ? { ...x, unread: false } : x,
                            ),
                          )
                        }
                        className="px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--bg-primary)]"
                      >
                        <div className="flex items-start gap-2.5">
                          {n.unread && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: "var(--accent)" }}
                            />
                          )}
                          <div className={cn(!n.unread && "pl-4")}>
                            <p
                              className="text-[13px] font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {n.title}
                            </p>
                            <p
                              className="text-[12px] mt-0.5"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {n.desc}
                            </p>
                            <p
                              className="text-[10px] mt-1 font-medium uppercase tracking-wider"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {n.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  {/* Avatar + name header */}
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

                  {/* Sign out */}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
};
