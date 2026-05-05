"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Shield, ShieldOff, Search, RefreshCw,
    ChevronDown, Loader2, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { RoleGuard } from '@/components/common/RoleGuard';

interface UserRecord {
    id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'user';
    created_at: string;
}

const ROLE_STYLE = {
    admin: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    user: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

function AdminUsersContent() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearch] = useState('');
    const [updatingId, setUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Get current user id to prevent self-demotion
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .order('role', { ascending: false });

            if (error) throw error;

            // Get emails from auth — merge with profiles
            const { data: authData } = await supabase.auth.admin?.listUsers?.() || { data: null };

            const merged: UserRecord[] = (data || []).map((profile: any) => ({
                id: profile.id,
                email: profile.full_name?.includes('@') ? profile.full_name : `user-${profile.id.slice(0, 6)}@app.com`,
                full_name: profile.full_name,
                role: profile.role || 'user',
                created_at: new Date().toISOString(),
            }));

            setUsers(merged);
        } catch {
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
        if (userId === currentUserId && newRole === 'user') {
            showToast("You can't demote yourself!", 'error');
            return;
        }
        setUpdating(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);
            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`Role updated to ${newRole}`, 'success');
        } catch {
            showToast('Failed to update role', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const filtered = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
                    <span>Dashboard</span><span className="opacity-30">/</span>
                    <span className="text-sky-400">User Management</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">User Management</h1>
                        <p className="text-slate-500 text-[12px] mt-1">Manage user roles and permissions.</p>
                    </div>
                    <motion.button
                        onClick={fetchUsers} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-black text-slate-300 hover:text-white transition-all"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                    </motion.button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Users', value: users.length, color: '#38bdf8' },
                    { label: 'Admins', value: adminCount, color: '#a78bfa' },
                    { label: 'Regular Users', value: userCount, color: '#34d399' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[1px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${stat.color}40, transparent)` }} />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">{stat.label}</p>
                        <p className="text-3xl font-black text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                    value={searchQuery} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or role..."
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/40 transition-all"
                />
                {searchQuery && (
                    <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.05]">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                        {filtered.length} user{filtered.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-slate-600 text-sm font-bold">No users found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {filtered.map((user, i) => {
                            const isCurrentUser = user.id === currentUserId;
                            const isUpdating = updatingId === user.id;
                            return (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                                >
                                    {/* Avatar + info */}
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            'w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white border border-white/10 flex-shrink-0',
                                            user.role === 'admin'
                                                ? 'bg-gradient-to-br from-sky-400 to-blue-600'
                                                : 'bg-gradient-to-br from-slate-500 to-slate-700'
                                        )}>
                                            {(user.full_name || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-black text-white">
                                                    {user.full_name || 'Unnamed User'}
                                                </p>
                                                {isCurrentUser && (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/20 text-[8px] font-black text-sky-400 uppercase tracking-widest">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                                                ID: {user.id.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>

                                    {/* Role selector */}
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest',
                                            ROLE_STYLE[user.role]
                                        )}>
                                            {user.role === 'admin' ? <Shield size={9} /> : <ShieldOff size={9} />}
                                            {user.role}
                                        </span>

                                        {/* Role change dropdown */}
                                        <div className="relative">
                                            <select
                                                value={user.role}
                                                onChange={e => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                                                disabled={isUpdating || isCurrentUser}
                                                className={cn(
                                                    'appearance-none px-3 py-1.5 pr-7 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-black text-slate-300 focus:outline-none focus:border-sky-500/40 transition-all cursor-pointer',
                                                    (isUpdating || isCurrentUser) && 'opacity-40 cursor-not-allowed'
                                                )}
                                            >
                                                <option value="user" className="bg-[#080f1f]">User</option>
                                                <option value="admin" className="bg-[#080f1f]">Admin</option>
                                            </select>
                                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                        </div>

                                        {isUpdating && <Loader2 size={14} className="animate-spin text-sky-400" />}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16 }}
                        className={cn(
                            'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-[12px] font-bold',
                            toast.type === 'success'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AdminUsersPage() {
    return (
        <RoleGuard allowedRoles={['admin']}>
            <AdminUsersContent />
        </RoleGuard>
    );
}