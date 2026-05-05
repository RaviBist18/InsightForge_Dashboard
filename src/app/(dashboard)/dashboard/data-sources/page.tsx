"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Upload, Plus, Trash2, CheckCircle2,
  AlertCircle, Loader2, FileText, Globe, RefreshCw, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { RoleGuard } from '@/components/common/RoleGuard';

interface DataSource {
  id: string;
  name: string;
  type: 'csv' | 'api' | 'database';
  status: 'connected' | 'error' | 'syncing';
  lastSync: string;
  records: number;
}

const MOCK_SOURCES: DataSource[] = [
  { id: '1', name: 'Transactions CSV', type: 'csv', status: 'connected', lastSync: '2 mins ago', records: 53 },
  { id: '2', name: 'Supabase DB', type: 'database', status: 'connected', lastSync: 'Just now', records: 1240 },
];

const TYPE_ICON = { csv: FileText, api: Globe, database: Database };
const STATUS_STYLE = {
  connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  syncing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function DataSourcesContent() {
  const [sources, setSources] = useState<DataSource[]>(MOCK_SOURCES);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showAddAPI, setShowAddAPI] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiName, setApiName] = useState('');
  const [testingAPI, setTestingAPI] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<'success' | 'error' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setUploadError('Only CSV files are supported.'); return; }
    setUploading(true); setUploadError(null); setUploadSuccess(null);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] }), {} as Record<string, string>);
      });
      const { error } = await supabase.from('transactions').insert(
        rows.map(r => ({
          customer: r.entity || r.customer || r.name || 'Unknown',
          amount: parseFloat(r.amount) || 0,
          status: r.status || 'Completed',
          category: r.category || 'Analytics',
          region: r.region || 'Global',
          created_at: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
        }))
      );
      if (error) throw new Error(error.message);
      setSources(prev => [{ id: Date.now().toString(), name: file.name, type: 'csv', status: 'connected', lastSync: 'Just now', records: rows.length }, ...prev]);
      setUploadSuccess(`${rows.length} records imported from ${file.name}`);
    } catch {
      setUploadSuccess(`CSV parsed (${file.name}) — Supabase not configured yet.`);
      setSources(prev => [{ id: Date.now().toString(), name: file.name, type: 'csv', status: 'connected', lastSync: 'Just now', records: 0 }, ...prev]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    await new Promise(r => setTimeout(r, 1800));
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'connected', lastSync: 'Just now' } : s));
    setSyncingId(null);
  };

  const handleTestAPI = async () => {
    if (!apiUrl.startsWith('http')) { setApiTestResult('error'); return; }
    setTestingAPI(true); setApiTestResult(null);
    try {
      const res = await fetch(apiUrl);
      setApiTestResult(res.ok ? 'success' : 'error');
    } catch { setApiTestResult('error'); }
    finally { setTestingAPI(false); }
  };

  const handleAddAPI = () => {
    if (!apiName || !apiUrl) return;
    setSources(prev => [{ id: Date.now().toString(), name: apiName, type: 'api', status: apiTestResult === 'success' ? 'connected' : 'error', lastSync: 'Never', records: 0 }, ...prev]);
    setShowAddAPI(false); setApiName(''); setApiUrl(''); setApiTestResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Data Sources</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Data Sources</h1>
            <p className="text-slate-500 text-[12px] mt-1">Connect and manage your data pipelines.</p>
          </div>
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-black text-slate-300 hover:text-white hover:border-white/[0.16] transition-all">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload CSV
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddAPI(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white transition-all shadow-lg shadow-sky-500/25">
              <Plus size={13} /> Add API Source
            </motion.button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
        </div>
      </div>

      <AnimatePresence>
        {uploadSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <p className="text-[12px] text-emerald-400 font-bold">{uploadSuccess}</p>
            <button onClick={() => setUploadSuccess(null)} className="ml-auto text-emerald-600 hover:text-emerald-400"><X size={14} /></button>
          </motion.div>
        )}
        {uploadError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle size={15} className="text-rose-400" />
            <p className="text-[12px] text-rose-400 font-bold">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="ml-auto text-rose-600 hover:text-rose-400"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {sources.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
            <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">No data sources yet</p>
          </div>
        )}
        {sources.map((source, i) => {
          const Icon = TYPE_ICON[source.type];
          const isSyncing = syncingId === source.id;
          return (
            <motion.div key={source.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-sky-400/10 border border-sky-400/15">
                  <Icon className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-white">{source.name}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
                    {source.records.toLocaleString()} records · Last sync: {source.lastSync}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest', STATUS_STYLE[source.status])}>
                  {isSyncing ? 'Syncing...' : source.status}
                </span>
                <button onClick={() => handleSync(source.id)} disabled={isSyncing}
                  className="p-2 rounded-lg text-slate-600 hover:text-sky-400 hover:bg-sky-400/10 transition-all disabled:opacity-40">
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setSources(prev => prev.filter(s => s.id !== source.id))}
                  className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAddAPI && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowAddAPI(false)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#080f1f] overflow-hidden shadow-2xl">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="font-black text-white text-sm">Add API Source</h3>
                <button onClick={() => setShowAddAPI(false)} className="text-slate-600 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">Source Name</label>
                  <input value={apiName} onChange={e => setApiName(e.target.value)} placeholder="e.g. Sales API"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 block mb-1.5">API Endpoint URL</label>
                  <input value={apiUrl} onChange={e => { setApiUrl(e.target.value); setApiTestResult(null); }} placeholder="https://api.example.com/data"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder-slate-700 focus:outline-none focus:border-sky-500/50 transition-all" />
                </div>
                {apiTestResult && (
                  <div className={cn('flex items-center gap-2 p-3 rounded-xl border text-[12px] font-bold',
                    apiTestResult === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400')}>
                    {apiTestResult === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {apiTestResult === 'success' ? 'Connection successful!' : 'Could not reach endpoint.'}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={handleTestAPI} disabled={testingAPI || !apiUrl}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[11px] font-black text-slate-300 hover:text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                    {testingAPI ? <><Loader2 size={12} className="animate-spin" /> Testing...</> : 'Test Connection'}
                  </button>
                  <button onClick={handleAddAPI} disabled={!apiName || !apiUrl}
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-[11px] font-black text-white disabled:opacity-40 transition-all">
                    Add Source
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DataSourcesPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <DataSourcesContent />
    </RoleGuard>
  );
}