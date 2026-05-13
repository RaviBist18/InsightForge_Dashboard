"use client";
// src/components/layout/Sidebar.tsx

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Database, FileText, Bookmark, Settings, UserCog,
  ChevronLeft, ChevronRight, X, Shield, Briefcase,
  Zap, Archive, Flame, Map, Target, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkspace } from '@/context/WorkspaceContext';

const getInitials = (nameOrEmail: string) => {
  if (!nameOrEmail) return '??';
  if (nameOrEmail.includes('@')) return nameOrEmail.substring(0, 2).toUpperCase();
  const parts = nameOrEmail.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nameOrEmail.substring(0, 2).toUpperCase();
};

const ADMIN_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Database, label: 'Data Sources', href: '/dashboard/data-sources' },
  { icon: FileText, label: 'Reports', href: '/dashboard/reports' },
  { icon: Bookmark, label: 'Saved Views', href: '/dashboard/saved-views' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  { icon: UserCog, label: 'User Management', href: '/dashboard/admin/users' },
  { icon: Briefcase, label: 'Workspace', href: '/dashboard/workspace' },
];

const USER_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Bookmark, label: 'Saved Views', href: '/dashboard/saved-views' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  { icon: Briefcase, label: 'Workspace', href: '/dashboard/workspace' },
];

const WAR_ROOM_SHORTCUTS = [
  { label: 'Strategic Pulse', icon: Zap, tab: 'pulse' as const, color: '#38bdf8' },
  { label: 'Intel Archives', icon: Archive, tab: 'archives' as const, color: '#a78bfa' },
  { label: 'What-If Forge', icon: Flame, tab: 'forge' as const, color: '#fb923c' },
  { label: 'Asset Registry', icon: Map, tab: 'entities' as const, color: '#34d399' },
  { label: 'CEO Briefing', icon: Target, tab: 'customizer' as const, color: '#f472b6' },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed, setCollapsed, mobileOpen, setMobileOpen
}) => {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { role, name, email, loading: roleLoading } = useUserRole();
  const {
    activeTab, setActiveTab,
    mrr, churn, entityCount, snapshotCount, mrrTrend,
    isWorkspacePage,
  } = useWorkspace();

  const isAdmin = role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
  const isOnWorkspace = pathname.startsWith('/dashboard/workspace');

  React.useEffect(() => {
    if (!roleLoading) setLoading(false);
  }, [roleLoading]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const TrendIcon = mrrTrend > 0 ? TrendingUp : mrrTrend < 0 ? TrendingDown : Minus;
  const trendColor = mrrTrend > 0 ? '#4ade80' : mrrTrend < 0 ? '#fb7185' : '#94a3b8';

  const renderNavItem = (item: { icon: any; label: string; href: string; color?: string }) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen?.(false)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[12px] font-bold',
          active ? 'text-white' : 'text-slate-500 hover:text-slate-200'
        )}
      >
        {active && (
          <motion.div layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.1]"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
        )}
        {active && (
          <motion.div layoutId="sidebar-accent"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full"
            style={{ background: 'var(--accent)' }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
        )}
        <item.icon className={cn('w-4 h-4 flex-shrink-0 relative z-10 transition-colors duration-200',
          active ? 'text-sky-400' : 'text-slate-600 group-hover:text-slate-400'
        )} />
        <AnimatePresence>
          {(!collapsed || mobileOpen) && (
            <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }} transition={{ duration: 0.15 }}
              className="whitespace-nowrap relative z-10 tracking-wide">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen?.(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.45 }}
        className={cn(
          'relative flex flex-col h-screen border-r border-white/[0.07] bg-white/[0.02] backdrop-blur-xl z-50 overflow-hidden',
          'lg:m-2 lg:mr-0 lg:rounded-xl lg:rounded-r-none',
          mobileOpen ? 'flex fixed inset-y-0 left-0' : 'hidden lg:flex'
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-sky-400/[0.04] to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-sky-500/30 group-hover:bg-sky-400 transition-colors">
              IF
            </div>
            <AnimatePresence>
              {(!collapsed || mobileOpen) && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="font-black text-white text-[15px] tracking-tight whitespace-nowrap">
                  InsightForge
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {mobileOpen && (
            <button onClick={() => setMobileOpen?.(false)} className="ml-auto text-slate-500 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto no-scrollbar">
          {/* Main Nav */}
          <div className="space-y-0.5">
            {navItems.map(renderNavItem)}
          </div>

          {/* ── Business Health Scorecard ── */}
          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="px-3 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.22em]">
                  Business Health
                </p>
                <div className="mx-0 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* MRR Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest">MRR</p>
                      <p className="text-[13px] font-black text-white" style={{ fontFamily: 'monospace' }}>
                        ${mrr > 0 ? mrr.toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: trendColor }}>
                      <TrendIcon size={11} />
                      <span className="text-[10px] font-bold" style={{ fontFamily: 'monospace' }}>
                        {mrrTrend > 0 ? '+' : ''}{mrrTrend.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-px w-full mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Churn', value: churn > 0 ? `${churn}%` : '—', color: churn > 3 ? '#fb7185' : '#4ade80' },
                      { label: 'Assets', value: entityCount, color: '#38bdf8' },
                      { label: 'Seals', value: snapshotCount, color: '#a78bfa' },
                    ].map(m => (
                      <div key={m.label} className="text-center p-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest mb-0.5">{m.label}</p>
                        <p className="text-[11px] font-black" style={{ color: m.color, fontFamily: 'monospace' }}>
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
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="px-3 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.22em]">
                  Workspace
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {WAR_ROOM_SHORTCUTS.map(item => {
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
                    className="w-full relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group text-[11px] font-bold"
                    style={{
                      background: isTabActive ? `${item.color}12` : 'transparent',
                      border: isTabActive ? `1px solid ${item.color}30` : '1px solid transparent',
                    }}
                  >
                    {isTabActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                        style={{ background: item.color }} />
                    )}
                    <item.icon
                      className="w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200"
                      style={{ color: isTabActive ? item.color : item.color + '66' }}
                    />
                    <AnimatePresence>
                      {(!collapsed || mobileOpen) && (
                        <motion.span
                          initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }} transition={{ duration: 0.15 }}
                          className="whitespace-nowrap relative z-10 tracking-wide"
                          style={{ color: isTabActive ? item.color : item.color + '88' }}
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
        <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] space-y-2">
          <div className="relative">
            <AnimatePresence>
              {showUserMenu && (!collapsed || mobileOpen) && (
                <motion.div key="user-menu"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-[#0b1629] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl z-50"
                >
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-[11px] font-bold text-white truncate">{email}</p>
                    <div className={cn(
                      'mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                      isAdmin
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                    )}>
                      <Shield size={8} />
                      {role}
                    </div>
                  </div>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); window.location.href = '/auth'; }}
                    className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => !loading && setShowUserMenu(v => !v)}
              className={cn(
                'w-full flex items-center rounded-xl p-2.5 hover:bg-white/[0.05] transition-all',
                (!collapsed || mobileOpen) ? 'gap-3' : 'justify-center'
              )}
            >
              {loading ? (
                <div className="w-7 h-7 rounded-full bg-slate-800 animate-pulse border border-white/10 flex-shrink-0" />
              ) : (
                <div className={cn(
                  'w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-black text-white border border-white/10',
                  isAdmin ? 'bg-gradient-to-br from-sky-400 to-blue-600' : 'bg-gradient-to-br from-slate-500 to-slate-700'
                )}>
                  {getInitials(name)}
                </div>
              )}
              <AnimatePresence>
                {(!collapsed || mobileOpen) && !loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-start overflow-hidden">
                    <span className="text-[12px] font-bold text-white truncate max-w-[150px]">{name}</span>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest',
                      isAdmin ? 'text-sky-600' : 'text-slate-600')}>
                      {role} Account
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          <button
            onClick={() => { setCollapsed(!collapsed); setShowUserMenu(false); }}
            className="hidden lg:flex w-full items-center justify-center gap-2 p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all text-[11px] font-bold"
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};