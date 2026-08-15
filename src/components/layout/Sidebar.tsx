"use client";
// src/components/layout/Sidebar.tsx

import React, { useState, useEffect } from "react";
import { loadAlerts, runCheckAllAlerts } from "@/lib/alertCenter";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Bookmark,
  Settings,
  UserCog,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Briefcase,
  HelpCircle,
  Zap,
  Archive,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkspace } from "@/context/WorkspaceContext";
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

const ADMIN_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/" },
  { icon: UploadCloud, label: "Datasets", href: "/dashboard/datasets" },
  { icon: SlidersHorizontal, label: "Simulator", href: "/dashboard/simulator" },
  { icon: Bookmark, label: "Saved Views", href: "/dashboard/saved-views" },
  { icon: UserCog, label: "User Management", href: "/dashboard/admin/users" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: Briefcase, label: "Workspace", href: "/dashboard/workspace" },
];

const USER_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/" },
  { icon: UploadCloud, label: "Datasets", href: "/dashboard/datasets" },
  { icon: SlidersHorizontal, label: "Simulator", href: "/dashboard/simulator" },
  { icon: Bookmark, label: "Saved Views", href: "/dashboard/saved-views" },
  { icon: Users, label: "Team", href: "/dashboard/team" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: Briefcase, label: "Workspace", href: "/dashboard/workspace" },
];

const WAR_ROOM_SHORTCUTS = [
  { label: "Live Metrics", icon: Zap, tab: "pulse" as const },
  { label: "Snapshot Archive", icon: Archive, tab: "archives" as const },
  { label: "CEO Briefing", icon: Target, tab: "customizer" as const },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { role, name, email, loading: roleLoading } = useUserRole();
  const {
    activeTab,
    setActiveTab,
    mrr,
    churn,
    snapshotCount,
    mrrTrend,
    isWorkspacePage,
  } = useWorkspace();

  const isAdmin = role === "admin";
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
  const isOnWorkspace = pathname.startsWith("/dashboard/workspace");

  React.useEffect(() => {
    if (!roleLoading) setLoading(false);
  }, [roleLoading]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const TrendIcon =
    mrrTrend > 0 ? TrendingUp : mrrTrend < 0 ? TrendingDown : Minus;

  // ─── Alert Center (background polling only — UI moved to Navbar) ──
  const runCheck = async () => {
    const current = loadAlerts();
    if (current.length === 0) return;
    await runCheckAllAlerts(current);
  };

  useEffect(() => {
    runCheck(); // check on mount (page load / nav)
    const poll = setInterval(runCheck, 60000); // 60s catch-all
    return () => clearInterval(poll);
  }, []);

  const renderNavItem = (item: {
    icon: any;
    label: string;
    href: string;
    color?: string;
  }) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen?.(false)}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 group text-[13px] font-medium",
          active
            ? "text-[color:var(--accent)]"
            : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-xl"
            style={{ background: "var(--accent-subtle)" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          />
        )}
        {active && (
          <motion.div
            layoutId="sidebar-accent"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: "var(--accent)" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          />
        )}
        <item.icon
          className={cn(
            "w-4 h-4 flex-shrink-0 relative z-10 transition-colors duration-150",
            active
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--text-muted)] group-hover:text-[color:var(--text-secondary)]",
          )}
        />
        <AnimatePresence>
          {(!collapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap relative z-10 tracking-wide"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen?.(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.45 }}
        className={cn(
          "relative flex flex-col h-screen border-r z-50 overflow-hidden",
          mobileOpen ? "flex fixed inset-y-0 left-0" : "hidden lg:flex",
        )}
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white transition-colors"
              style={{ background: "var(--accent)" }}
            >
              IF
            </div>
            <AnimatePresence>
              {(!collapsed || mobileOpen) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col leading-tight"
                >
                  <span
                    className="font-semibold text-[15px] tracking-tight whitespace-nowrap"
                    style={{ color: "var(--text-primary)" }}
                  >
                    InsightForge
                  </span>
                  <span
                    className="text-[10px] whitespace-nowrap"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Enterprise Analytics
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen?.(false)}
              className="ml-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto no-scrollbar">
          {/* Main Nav */}
          <div className="space-y-0.5">{navItems.map(renderNavItem)}</div>

          {/* ── Business Health Scorecard ── */}
          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p
                  className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--accent)" }}
                >
                  Business Health
                </p>
                <div
                  className="mx-0 p-3 rounded-xl"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* MRR Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}
                      >
                        MRR
                      </p>
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        ${mrr > 0 ? mrr.toLocaleString() : "—"}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      style={{
                        color:
                          mrrTrend > 0
                            ? "var(--success)"
                            : mrrTrend < 0
                              ? "var(--danger)"
                              : "var(--text-muted)",
                      }}
                    >
                      <TrendIcon size={11} />
                      <span className="text-[10px] font-medium">
                        {mrrTrend > 0 ? "+" : ""}
                        {mrrTrend.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-px w-full mb-2"
                    style={{ background: "var(--border)" }}
                  />

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        label: "Churn",
                        value: churn > 0 ? `${churn}%` : "—",
                        color: churn > 3 ? "var(--danger)" : "var(--success)",
                      },
                      {
                        label: "Snapshots",
                        value: snapshotCount,
                        color: "var(--text-primary)",
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="text-center p-1.5 rounded-xl"
                        style={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <p
                          className="text-[8px] uppercase tracking-widest mb-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {m.label}
                        </p>
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: m.color }}
                        >
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Workspace Shortcuts ── */}
          <div>
            <AnimatePresence>
              {(!collapsed || mobileOpen) && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--accent)" }}
                >
                  Workspace
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {WAR_ROOM_SHORTCUTS.map((item) => {
                const isTabActive = isOnWorkspace && activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => {
                      setMobileOpen?.(false);
                      if (!isOnWorkspace) {
                        window.location.href = `/dashboard/workspace`;
                      }
                      setActiveTab(item.tab);
                    }}
                    className="w-full relative flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 group text-[12px] font-medium"
                    style={{
                      background: isTabActive
                        ? "var(--accent-subtle)"
                        : "transparent",
                    }}
                  >
                    {isTabActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                        style={{ background: "var(--accent)" }}
                      />
                    )}
                    <item.icon
                      className="w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150"
                      style={{
                        color: isTabActive
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      }}
                    />
                    <AnimatePresence>
                      {(!collapsed || mobileOpen) && (
                        <motion.span
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap relative z-10 tracking-wide"
                          style={{
                            color: isTabActive
                              ? "var(--accent)"
                              : "var(--text-secondary)",
                          }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Menu */}
        <div
          className="px-3 pb-4 pt-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="relative">
            <AnimatePresence>
              {showUserMenu && (!collapsed || mobileOpen) && (
                <motion.div
                  key="user-menu"
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden shadow-md z-50"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* User info block */}
                  <div
                    className="px-4 py-3.5 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <div
                        className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                        style={{ background: "var(--accent)" }}
                      >
                        {getInitials(name)}
                      </div>
                      <div className="overflow-hidden">
                        <p
                          className="text-[12px] font-semibold truncate leading-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {name}
                        </p>
                        <p
                          className="text-[10px] truncate mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {email}
                        </p>
                      </div>
                    </div>
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-semibold uppercase tracking-widest"
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
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/auth";
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium transition-colors"
                    style={{ color: "var(--danger)" }}
                  >
                    <LogOut size={13} />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => !loading && setShowUserMenu((v) => !v)}
              className={cn(
                "w-full flex items-center rounded-xl p-2.5 transition-colors group",
                !collapsed || mobileOpen ? "gap-3" : "justify-center",
              )}
              style={{
                background: showUserMenu ? "var(--bg-primary)" : "transparent",
              }}
            >
              {loading ? (
                <div
                  className="w-8 h-8 rounded-full animate-pulse flex-shrink-0"
                  style={{ background: "var(--border)" }}
                />
              ) : (
                <div
                  className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {getInitials(name)}
                </div>
              )}
              <AnimatePresence>
                {(!collapsed || mobileOpen) && !loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-start overflow-hidden flex-1 min-w-0"
                  >
                    <span
                      className="text-[12px] font-semibold truncate w-full text-left"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {name}
                    </span>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-widest text-left"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {isAdmin ? "Administrator" : "Member"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              {(!collapsed || mobileOpen) && !loading && (
                <ChevronRight
                  size={13}
                  className={cn(
                    "flex-shrink-0 transition-transform",
                    showUserMenu && "rotate-[-90deg]",
                  )}
                  style={{ color: "var(--text-muted)" }}
                />
              )}
            </button>
          </div>

          {(!collapsed || mobileOpen) && (
            <button
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 mt-2 rounded-xl text-[12px] font-semibold transition-colors text-left hover:brightness-110"
              style={{
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <HelpCircle size={14} />
              <span>Help Center</span>
            </button>
          )}

          {showHelpModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowHelpModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm mx-4 p-5 rounded-2xl"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <h3
                  className="text-[15px] font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Help Center
                </h3>
                <p
                  className="text-[13px] mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Need help? Reach out to our support team.
                </p>
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ravibist103@gmail.com
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("support@insightforge.com");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-2.5 rounded-xl text-[13px] font-medium"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};
