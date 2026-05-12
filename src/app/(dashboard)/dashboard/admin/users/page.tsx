"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Shield, Search, RefreshCw, Loader2,
    CheckCircle2, AlertCircle, X, ChevronDown,
    Eye, Hash, Globe, Zap, Flag, RotateCcw,
    TrendingUp, Terminal, Lock, AlertTriangle
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { RoleGuard } from '@/components/common/RoleGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type TierRole = 'strategic_lead' | 'intelligence_analyst' | 'executive_viewer';

interface UserRecord {
    id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'user';
    tier: TierRole;
    created_at: string;
    lastLoginIp: string;
    verificationHash: string;
    tokenBurn: number;      // 0-100 %
    tokenLimit: number;
    flagged: boolean;
    lastSeen: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_META: Record<TierRole, { label: string; color: string; bg: string; border: string; plan: string }> = {
    strategic_lead: { label: 'STRATEGIC LEAD', color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/25', plan: 'Enterprise' },
    intelligence_analyst: { label: 'INTELLIGENCE ANALYST', color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/25', plan: 'Pro' },
    executive_viewer: { label: 'EXECUTIVE VIEWER', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/25', plan: 'Starter' },
};

const MOCK_IPS = ['103.21.244.12', '185.93.3.114', '46.151.209.33', '104.21.88.22', '172.67.44.91'];
const MOCK_DATES = ['2026-05-12 09:41', '2026-05-11 14:22', '2026-05-10 08:55', '2026-05-09 17:30', '2026-05-08 11:00'];
const MOCK_TIERS: TierRole[] = ['strategic_lead', 'intelligence_analyst', 'executive_viewer', 'strategic_lead', 'intelligence_analyst'];

function makeHash() {
    const c = 'ABCDEF0123456789';
    const seg = (n: number) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
    return `IF-${seg(4)}...-CERT`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
            )}>
            {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {msg}
        </motion.div>
    );
}

// ─── Read-Only Bar ────────────────────────────────────────────────────────────

function ReadOnlyBar() {
    return (
        <motion.div
            initial={{ y: -40 }} animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-6 py-2.5"
            style={{ background: 'rgba(251,191,36,0.12)', borderBottom: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(12px)' }}>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                <Lock size={11} className="text-amber-400" />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                READ-ONLY FORENSIC ACCESS — ARCHIVE INTEGRITY ACTIVE
            </span>
            <AlertTriangle size={11} className="text-amber-400" />
        </motion.div>
    );
}

// ─── Token Burn Bar ───────────────────────────────────────────────────────────

function TokenBurn({ pct }: { pct: number }) {
    const color = pct > 85 ? '#fb7185' : pct > 60 ? '#fbbf24' : '#34d399';
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">TOKEN BURN</span>
                <span className="text-[7px] font-mono" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div className="h-full rounded-full"
                    style={{ background: color, boxShadow: pct > 85 ? `0 0 6px ${color}80` : 'none' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} />
            </div>
        </div>
    );
}

// ─── Action Dropdown ──────────────────────────────────────────────────────────

function ActionDropdown({
    user, isReadOnly, onUpgrade, onResetSeal, onFlag,
}: {
    user: UserRecord;
    isReadOnly: boolean;
    onUpgrade: (id: string) => void;
    onResetSeal: (id: string) => void;
    onFlag: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setOpen(p => !p)}
                disabled={isReadOnly}
                className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:border-white/[0.15] transition-all',
                    isReadOnly && 'opacity-40 pointer-events-none'
                )}>
                ACTIONS <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl border border-white/[0.1] overflow-hidden shadow-2xl"
                        style={{ background: '#080f1f' }}>
                        {[
                            { icon: <TrendingUp size={10} />, label: 'Upgrade Tier', color: 'text-sky-400', action: () => { onUpgrade(user.id); setOpen(false); } },
                            { icon: <RotateCcw size={10} />, label: 'Reset Forensic Seal', color: 'text-violet-400', action: () => { onResetSeal(user.id); setOpen(false); } },
                            { icon: <Flag size={10} />, label: user.flagged ? 'Unflag Account' : 'Flag Account', color: 'text-rose-400', action: () => { onFlag(user.id); setOpen(false); } },
                        ].map(({ icon, label, color, action }) => (
                            <button key={label} onClick={action}
                                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-black hover:bg-white/[0.06] transition-colors ${color}`}>
                                {icon} {label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
    user, index, currentUserId, isReadOnly, updatingId, isScanning,
    onRoleChange, onViewPortfolio, onUpgrade, onResetSeal, onFlag,
}: {
    user: UserRecord;
    index: number;
    currentUserId: string | null;
    isReadOnly: boolean;
    updatingId: string | null;
    isScanning: boolean;
    onRoleChange: (id: string, role: 'admin' | 'user') => void;
    onViewPortfolio: (id: string) => void;
    onUpgrade: (id: string) => void;
    onResetSeal: (id: string) => void;
    onFlag: (id: string) => void;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isCurrentUser = user.id === currentUserId;
    const isUpdating = updatingId === user.id;
    const tier = TIER_META[user.tier];

    return (
        <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
                'relative px-5 py-4 transition-colors border-b border-white/[0.04] last:border-0',
                user.flagged ? 'bg-rose-400/[0.03]' : 'hover:bg-white/[0.02]'
            )}
            style={{
                boxShadow: user.flagged ? 'inset 2px 0 0 rgba(251,113,133,0.4)' : undefined,
            }}>
            {/* Scanning animation overlay */}
            {isScanning && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: [0, 0.06, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.1 }}
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)' }} />
            )}

            <div className="flex items-center gap-4 flex-wrap">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white border border-white/10',
                        user.role === 'admin'
                            ? 'bg-gradient-to-br from-sky-400 to-blue-600'
                            : 'bg-gradient-to-br from-violet-500 to-purple-700'
                    )} style={{ boxShadow: user.role === 'admin' ? '0 0 12px rgba(56,189,248,0.2)' : undefined }}>
                        {(user.full_name || 'U')[0].toUpperCase()}
                    </div>
                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#050a15]"
                        style={{ boxShadow: '0 0 4px rgba(52,211,153,0.6)' }} />
                </div>

                {/* Identity block */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-[12px] font-black text-white truncate">{user.full_name || 'Unnamed User'}</p>
                        {isCurrentUser && (
                            <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/20 text-sky-400">YOU</span>
                        )}
                        {user.flagged && (
                            <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center gap-1">
                                <Flag size={7} /> FLAGGED
                            </motion.span>
                        )}
                    </div>

                    {/* Security metadata */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-[8px] font-mono" style={{ color: 'rgba(167,139,250,0.7)' }}>
                            <Hash size={7} /> {mounted ? user.verificationHash : 'IF-••••...-CERT'}
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-mono" style={{ color: 'rgba(167,139,250,0.7)' }}>
                            <Globe size={7} /> {user.lastLoginIp}
                        </span>
                        <span className="flex items-center gap-1 text-[8px] font-mono text-slate-700">
                            <Terminal size={7} /> {user.lastSeen}
                        </span>
                    </div>

                    {/* Token burn */}
                    <div className="mt-2 max-w-[160px]">
                        <TokenBurn pct={user.tokenBurn} />
                    </div>
                </div>

                {/* Tier badge */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tier.color} ${tier.bg} ${tier.border}`}>
                        {tier.label}
                    </span>
                    <span className="text-[8px] font-mono text-slate-600">{tier.plan}</span>
                </div>

                {/* Role pill + selector */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest',
                        user.role === 'admin'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    )}>
                        <Shield size={8} /> {user.role}
                    </span>

                    <div className="relative">
                        <select
                            value={user.role}
                            onChange={e => onRoleChange(user.id, e.target.value as 'admin' | 'user')}
                            disabled={isUpdating || isCurrentUser || isReadOnly}
                            className={cn(
                                'appearance-none px-3 py-1.5 pr-7 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-black text-slate-400 focus:outline-none focus:border-sky-500/40 transition-all cursor-pointer',
                                (isUpdating || isCurrentUser || isReadOnly) && 'opacity-40 cursor-not-allowed'
                            )}>
                            <option value="user" className="bg-[#080f1f]">User</option>
                            <option value="admin" className="bg-[#080f1f]">Admin</option>
                        </select>
                        <ChevronDown size={9} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    </div>

                    {isUpdating && <Loader2 size={13} className="animate-spin text-sky-400" />}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* View Portfolio */}
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => onViewPortfolio(user.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-400/10 border border-violet-400/20 text-[9px] font-black uppercase tracking-widest text-violet-400 hover:bg-violet-400/20 transition-all">
                        <Eye size={10} /> VIEW
                    </motion.button>

                    <ActionDropdown
                        user={user} isReadOnly={isReadOnly}
                        onUpgrade={onUpgrade} onResetSeal={onResetSeal} onFlag={onFlag}
                    />
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function AdminUsersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isReadOnly = searchParams.get('readonly') === 'true';

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [filterTier, setFilterTier] = useState<TierRole | 'all'>('all');

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        setIsScanning(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .order('role', { ascending: false });

            if (error) throw error;

            const merged: UserRecord[] = (data || []).map((profile, i) => ({
                id: profile.id,
                email: `user-${profile.id.slice(0, 6)}@app.com`,
                full_name: profile.full_name,
                role: profile.role || 'user',
                tier: MOCK_TIERS[i % MOCK_TIERS.length],
                created_at: new Date().toISOString(),
                lastLoginIp: MOCK_IPS[i % MOCK_IPS.length],
                verificationHash: makeHash(),
                tokenBurn: Math.round(15 + Math.random() * 80),
                tokenLimit: 10000,
                flagged: false,
                lastSeen: MOCK_DATES[i % MOCK_DATES.length],
            }));

            setUsers(merged);
        } catch {
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
            setTimeout(() => setIsScanning(false), 2000);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
        if (isReadOnly) return;
        if (userId === currentUserId && newRole === 'user') {
            showToast("Cannot demote yourself", 'error'); return;
        }
        setUpdatingId(userId);
        try {
            const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`Role updated to ${newRole}`, 'success');
        } catch {
            showToast('Failed to update role', 'error');
        } finally { setUpdatingId(null); }
    };

    const handleViewPortfolio = (userId: string) => {
        router.push(`/?readonly=true&userId=${userId}`);
    };

    const handleUpgrade = (id: string) => {
        const order: TierRole[] = ['executive_viewer', 'intelligence_analyst', 'strategic_lead'];
        setUsers(prev => prev.map(u => {
            if (u.id !== id) return u;
            const idx = order.indexOf(u.tier);
            const next = order[Math.min(idx + 1, order.length - 1)];
            return { ...u, tier: next };
        }));
        showToast('Tier upgraded', 'success');
    };

    const handleResetSeal = (id: string) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, verificationHash: makeHash() } : u));
        showToast('Forensic seal reset', 'success');
    };

    const handleFlag = (id: string) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, flagged: !u.flagged } : u));
        const user = users.find(u => u.id === id);
        showToast(user?.flagged ? 'Account unflagged' : 'Account flagged', 'success');
    };

    const filtered = users.filter(u => {
        const matchSearch = (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
            || u.role.toLowerCase().includes(searchQuery.toLowerCase())
            || u.lastLoginIp.includes(searchQuery);
        const matchTier = filterTier === 'all' || u.tier === filterTier;
        return matchSearch && matchTier;
    });

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        flagged: users.filter(u => u.flagged).length,
        avgBurn: users.length ? Math.round(users.reduce((a, u) => a + u.tokenBurn, 0) / users.length) : 0,
    };

    return (
        <div className={cn('space-y-6 relative', isReadOnly && 'pt-10')}>
            {isReadOnly && <ReadOnlyBar />}

            {/* Ambient glow */}
            <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] opacity-10"
                style={{ background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.2) 0%, transparent 70%)' }} />

            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
                    <span>Dashboard</span><span className="opacity-30">/</span>
                    <span className="text-sky-400">Forensic Access Terminal</span>
                </div>
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Forensic Access Terminal</h1>
                        <p className="text-slate-500 text-[12px] mt-1">
                            Live user registry · Role management · Security metadata · Token consumption
                        </p>
                    </div>
                    {/* Cinematic refresh */}
                    <motion.button
                        onClick={fetchUsers}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={loading}
                        className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-black text-slate-300 hover:text-white hover:border-sky-400/30 transition-all overflow-hidden"
                    >
                        {/* Pulse ring */}
                        {isScanning && (
                            <motion.div
                                className="absolute inset-0 rounded-xl border border-sky-400/40"
                                animate={{ opacity: [1, 0], scale: [1, 1.06] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        )}
                        <RefreshCw size={12} className={cn(loading && 'animate-spin', 'relative')} style={{ color: isScanning ? '#38bdf8' : undefined }} />
                        <span className="relative">{isScanning ? 'SCANNING DB...' : 'RESCAN'}</span>
                    </motion.button>
                </div>
            </div>

            {/* Glassmorphism stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'TOTAL USERS', value: stats.total, color: '#38bdf8', icon: <Users size={11} /> },
                    { label: 'ADMINS', value: stats.admins, color: '#a78bfa', icon: <Shield size={11} /> },
                    { label: 'FLAGGED', value: stats.flagged, color: '#fb7185', icon: <Flag size={11} /> },
                    { label: 'AVG TOKEN BURN', value: `${stats.avgBurn}%`, color: '#fbbf24', icon: <Zap size={11} /> },
                ].map(({ label, value, color, icon }) => (
                    <div key={label} className="relative rounded-2xl border border-white/[0.06] overflow-hidden p-4"
                        style={{ background: 'rgba(8,15,31,0.7)', backdropFilter: 'blur(12px)' }}>
                        {/* CRT scanline */}
                        <div className="pointer-events-none absolute inset-0"
                            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.008) 2px,rgba(255,255,255,0.008) 4px)' }} />
                        <div className="absolute top-0 left-0 right-0 h-[1px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
                        <div className="relative">
                            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
                                {icon}
                                <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(100,116,139,1)' }}>{label}</span>
                            </div>
                            <p className="text-2xl font-black text-white">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + filter */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input value={searchQuery} onChange={e => setSearch(e.target.value)}
                        placeholder="Search name, role, IP..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[12px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/40 transition-all" />
                    {searchQuery && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Tier filter */}
                <div className="relative">
                    <select value={filterTier} onChange={e => setFilterTier(e.target.value as TierRole | 'all')}
                        className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-black text-slate-400 focus:outline-none focus:border-sky-500/40 cursor-pointer transition-all">
                        <option value="all" className="bg-[#080f1f]">All Tiers</option>
                        <option value="strategic_lead" className="bg-[#080f1f]">Strategic Lead</option>
                        <option value="intelligence_analyst" className="bg-[#080f1f]">Intelligence Analyst</option>
                        <option value="executive_viewer" className="bg-[#080f1f]">Executive Viewer</option>
                    </select>
                    <ChevronDown size={9} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>
            </div>

            {/* User table */}
            <div className="relative rounded-2xl border border-white/[0.06] overflow-hidden"
                style={{ background: 'rgba(8,15,31,0.7)', backdropFilter: 'blur(12px)' }}>
                {/* CRT overlay */}
                <div className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.006) 2px,rgba(255,255,255,0.006) 4px)' }} />

                {/* Table header */}
                <div className="relative px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal size={10} className="text-sky-400" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                            {filtered.length} SUBJECT{filtered.length !== 1 ? 'S' : ''} IN REGISTRY
                        </span>
                    </div>
                    {isScanning && (
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
                            className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                            <span className="text-[8px] font-mono text-sky-400 uppercase tracking-widest">LIVE SCAN</span>
                        </motion.div>
                    )}
                </div>

                {/* Rows */}
                {loading ? (
                    <div className="relative flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="relative py-16 text-center">
                        <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-slate-600 text-sm font-bold uppercase tracking-widest">No subjects found</p>
                    </div>
                ) : (
                    <div className="relative">
                        <AnimatePresence>
                            {filtered.map((user, i) => (
                                <UserRow
                                    key={user.id}
                                    user={user} index={i}
                                    currentUserId={currentUserId}
                                    isReadOnly={isReadOnly}
                                    updatingId={updatingId}
                                    isScanning={isScanning}
                                    onRoleChange={handleRoleChange}
                                    onViewPortfolio={handleViewPortfolio}
                                    onUpgrade={handleUpgrade}
                                    onResetSeal={handleResetSeal}
                                    onFlag={handleFlag}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {toast && <Toast msg={toast.msg} type={toast.type} />}
            </AnimatePresence>
        </div>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
    return (
        <RoleGuard allowedRoles={['admin']}>
            <AdminUsersContent />
        </RoleGuard>
    );
}