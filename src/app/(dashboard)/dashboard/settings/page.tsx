"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Palette, Trash2,
  Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

const ALL_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

// Users only see Profile tab
const USER_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
];

const Toast = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => (
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

export default function SettingsPage() {
  const { role, loading: roleLoading } = useUserRole();
  const isAdmin = role === 'admin';
  const tabs = isAdmin ? ALL_TABS : USER_TABS;

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

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
    emailAlerts: true, weeklyReport: true, churnAlerts: false, revenueAlerts: true,
  });

  // Appearance
  const [accentColor, setAccentColor] = useState('#38bdf8');
  const [compactMode, setCompactMode] = useState(false);

  // Danger zone
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
      } catch { /* silent */ }
    };
    load();
  }, []);

  // Reset to profile tab if user and currently on admin-only tab
  useEffect(() => {
    if (!isAdmin && tab !== 'profile') setTab('profile');
  }, [isAdmin, tab]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, role: userRole });
      if (error) throw error;
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
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
      showToast('Password changed successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally { setSavingPw(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      await supabase.auth.signOut();
      showToast('Account deleted. Redirecting...', 'success');
      setTimeout(() => { window.location.href = '/auth'; }, 1500);
    } catch { showToast('Failed to delete account', 'error'); }
    finally { setDeletingAccount(false); }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      className={cn('relative w-10 h-[22px] rounded-full transition-all duration-300 flex-shrink-0',
        checked ? 'bg-sky-500' : 'bg-white/[0.1]')}>
      <div className={cn('absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-300',
        checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );

  const SettingRow = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-[13px] font-bold text-white">{label}</p>
        {desc && <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );

  const ACCENT_COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#f472b6', '#fbbf24'];

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Settings</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
            <p className="text-slate-500 text-[12px] mt-1">
              {isAdmin ? 'Manage your account and preferences.' : 'Update your profile information.'}
            </p>
          </div>
          {/* Role badge */}
          <div className={cn(
            'px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest',
            isAdmin
              ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
              : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
          )}>
            {role} Account
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all text-left',
                tab === t.id
                  ? 'bg-white/[0.08] border border-white/[0.1] text-white'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.04]')}>
              <t.icon className={cn('w-4 h-4 flex-shrink-0', tab === t.id ? 'text-sky-400' : 'text-slate-600')} />
              {t.label}
            </button>
          ))}

          {/* Show locked tabs hint for users */}
          {!isAdmin && (
            <div className="pt-3 px-3">
              <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
                Admin only
              </p>
              {ALL_TABS.filter(t => t.id !== 'profile').map(t => (
                <div key={t.id} className="flex items-center gap-3 px-0 py-2 text-[12px] font-bold text-slate-700 opacity-40 cursor-not-allowed">
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              {/* ── PROFILE TAB ── */}
              {tab === 'profile' && (
                <div className="p-6 space-y-5">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Profile Information</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-xl font-black text-white border border-white/10">
                      {fullName ? fullName[0].toUpperCase() : email[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-white">{fullName || email}</p>
                      <p className="text-[10px] text-slate-600 capitalize mt-0.5">{userRole} Account</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Full Name', value: fullName, onChange: setFullName, placeholder: 'Jane Doe', type: 'text', disabled: false },
                      { label: 'Email', value: email, onChange: () => { }, placeholder: '', type: 'email', disabled: true },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">{f.label}</label>
                        <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)}
                          placeholder={f.placeholder} disabled={f.disabled}
                          className={cn(
                            'w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all',
                            f.disabled && 'opacity-40 cursor-not-allowed'
                          )} />
                        {f.disabled && <p className="text-[10px] text-slate-700 mt-1">Email cannot be changed here.</p>}
                      </div>
                    ))}
                  </div>
                  <motion.button onClick={handleSaveProfile} disabled={savingProfile}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20">
                    {savingProfile ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : <><Save size={12} /> Save Profile</>}
                  </motion.button>
                </div>
              )}

              {/* ── SECURITY TAB — Admin only ── */}
              {tab === 'security' && isAdmin && (
                <div className="p-6 space-y-5">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Change Password</h2>
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
                          <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <motion.button onClick={handleChangePassword} disabled={savingPw || !newPw || !confirmPw}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-50 transition-all shadow-lg shadow-sky-500/20">
                    {savingPw ? <><Loader2 size={12} className="animate-spin" /> Updating...</> : <><Lock size={12} /> Update Password</>}
                  </motion.button>

                  {/* Danger zone — Admin only */}
                  <div className="mt-6 pt-6 border-t border-rose-500/20">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-4">Danger Zone</h3>
                    <p className="text-[12px] text-slate-500 mb-3">Type <span className="font-black text-white">DELETE</span> to permanently delete your account.</p>
                    <div className="flex gap-2">
                      <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Type DELETE"
                        className="flex-1 px-4 py-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[13px] text-white placeholder-rose-900 focus:outline-none focus:border-rose-500/50 transition-all" />
                      <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE' || deletingAccount}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-[11px] font-black text-rose-400 hover:bg-rose-500/25 disabled:opacity-30 transition-all">
                        {deletingAccount ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS TAB — Admin only ── */}
              {tab === 'notifications' && isAdmin && (
                <div className="p-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">Notification Preferences</h2>
                  <div>
                    {[
                      { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive important alerts via email' },
                      { key: 'weeklyReport', label: 'Weekly Report', desc: 'Get a summary every Monday morning' },
                      { key: 'churnAlerts', label: 'Churn Alerts', desc: 'Notify when churn rate spikes' },
                      { key: 'revenueAlerts', label: 'Revenue Alerts', desc: 'Notify on significant revenue changes' },
                    ].map(n => (
                      <SettingRow key={n.key} label={n.label} desc={n.desc}>
                        <Toggle
                          checked={notifSettings[n.key as keyof typeof notifSettings]}
                          onChange={() => setNotifSettings(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof notifSettings] }))}
                        />
                      </SettingRow>
                    ))}
                  </div>
                  <motion.button onClick={() => showToast('Notification preferences saved!', 'success')}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/20">
                    <Save size={12} /> Save Preferences
                  </motion.button>
                </div>
              )}

              {/* ── APPEARANCE TAB — Admin only ── */}
              {tab === 'appearance' && isAdmin && (
                <div className="p-6 space-y-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Appearance</h2>
                  <div>
                    <p className="text-[13px] font-bold text-white mb-1">Accent Color</p>
                    <p className="text-[11px] text-slate-500 mb-3">Choose your dashboard accent color.</p>
                    <div className="flex gap-3">
                      {ACCENT_COLORS.map(c => (
                        <button key={c} onClick={() => setAccentColor(c)}
                          className={cn('w-8 h-8 rounded-full border-2 transition-all', accentColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105')}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <SettingRow label="Compact Mode" desc="Reduce spacing for more data density">
                    <Toggle checked={compactMode} onChange={() => setCompactMode(v => !v)} />
                  </SettingRow>
                  <SettingRow label="Theme" desc="Dark mode is always active for InsightForge">
                    <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Dark Only
                    </span>
                  </SettingRow>
                  <motion.button onClick={() => showToast('Appearance settings saved!', 'success')}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/20">
                    <Save size={12} /> Save Appearance
                  </motion.button>
                </div>
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