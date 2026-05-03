"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Bell, Menu, X, Loader2, CheckCircle2, Download } from 'lucide-react';
import { TRANSACTIONS } from '@/data/mockData';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const getInitials = (nameOrEmail: string) => {
  if (!nameOrEmail) return '??';
  if (nameOrEmail.includes('@')) return nameOrEmail.substring(0, 2).toUpperCase();
  const parts = nameOrEmail.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nameOrEmail.substring(0, 2).toUpperCase();
};

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'New transaction pending', desc: 'TX-1053 requires review', time: '2m ago', unread: true },
  { id: 2, title: 'Revenue target hit', desc: '90% of Q2 goal reached', time: '1h ago', unread: true },
  { id: 3, title: 'Churn rate alert', desc: 'Spike detected in EMEA region', time: '3h ago', unread: false },
];

export const Navbar: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles').select('full_name').eq('id', user.id).single();
          setCurrentUser({ name: profile?.full_name || user.email || 'User', email: user.email || '' });
        }
      } catch { /* silent */ } finally { setLoadingUser(false); }
    };
    fetchUser();
  }, []);

  // Debounced global search dispatch
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('globalSearch', { detail: searchQuery.toLowerCase() }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSearchFocus = () => { if (pathname !== '/') router.push('/'); };

  const handleExport = useCallback(() => {
    setExportState('generating');
    setTimeout(() => {
      const csv = 'Date,Entity,Amount,Status\n' +
        TRANSACTIONS.map(tx => `"${tx.date}","${tx.customer}","${tx.amount}","${tx.status}"`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insightforge_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 2500);
    }, 800);
  }, []);

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, unread: false })));

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      {/* Logout overlay */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Signing Out...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="h-14 mx-2 mt-2 mb-0 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl px-4 flex items-center justify-between sticky top-2 z-20 gap-4">
        {/* Left: hamburger + search */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Menu size={18} />
          </button>

          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-sky-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onKeyDown={e => { if (e.key === 'Escape') setSearchQuery(''); }}
              placeholder="Search records (Press Esc to clear)..."
              className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:bg-white/[0.06] transition-all"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white"
                >
                  <X size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">

          {/* Export CSV */}
          <motion.button
            onClick={handleExport}
            disabled={exportState !== 'idle'}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300',
              exportState === 'done'
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.16]'
            )}
          >
            <AnimatePresence mode="wait">
              {exportState === 'idle' && (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Download size={11} /> Export CSV
                </motion.span>
              )}
              {exportState === 'generating' && (
                <motion.span key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Generating...
                </motion.span>
              )}
              {exportState === 'done' && (
                <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} /> Downloaded!
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Notifications */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => { setShowNotifications(v => !v); setShowProfile(false); }}
              className="relative p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-[#080f1f] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl z-50"
                >
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                        className={cn('px-4 py-3 cursor-pointer transition-colors', n.unread ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]')}
                      >
                        <div className="flex items-start gap-2.5">
                          {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0 mt-1.5" />}
                          <div className={cn(!n.unread && 'pl-4')}>
                            <p className="text-[12px] font-bold text-white">{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{n.desc}</p>
                            <p className="text-[10px] text-slate-700 mt-1 font-bold uppercase tracking-widest">{n.time}</p>
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
              onClick={() => { setShowProfile(v => !v); setShowNotifications(false); }}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/[0.05] transition-all"
            >
              {loadingUser
                ? <div className="w-7 h-7 rounded-full bg-slate-800 animate-pulse border border-white/10" />
                : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-[10px] font-black text-white border border-white/10 flex-shrink-0">
                    {getInitials(currentUser?.name ?? '')}
                  </div>
                )
              }
            </button>

            <AnimatePresence>
              {showProfile && currentUser && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-[#080f1f] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl z-50"
                >
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-[12px] font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={async () => {
                      setIsLoggingOut(true);
                      await supabase.auth.signOut();
                      window.location.href = '/auth';
                    }}
                    className="w-full text-left px-4 py-3 text-[12px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Sign Out
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