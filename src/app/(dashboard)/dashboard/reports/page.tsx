"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Loader2, CheckCircle2, Calendar, BarChart2, Users, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRANSACTIONS, INSIGHTS } from '@/data/mockData';
import { RoleGuard } from '@/components/common/RoleGuard';

interface Report {
  id: string;
  name: string;
  type: 'revenue' | 'transactions' | 'users' | 'insights';
  generatedAt: string;
  size: string;
  status: 'ready' | 'generating';
}

const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenue Report', icon: TrendingUp, description: 'Monthly revenue & profit breakdown', color: '#38bdf8' },
  { id: 'transactions', label: 'Transaction Export', icon: FileText, description: 'Full transaction history as CSV', color: '#34d399' },
  { id: 'users', label: 'User Activity Report', icon: Users, description: 'Active users and churn analysis', color: '#a78bfa' },
  { id: 'insights', label: 'AI Insights Summary', icon: BarChart2, description: 'AI-generated business insights', color: '#fb923c' },
];

const generateCSV = (type: string): string => {
  switch (type) {
    case 'revenue':
      return 'Month,Revenue,Profit,Margin\nJan,$36000,$6500,18.1%\nFeb,$38000,$7100,18.7%\nMar,$41000,$6800,16.6%\nApr,$39000,$7400,19.0%\nMay,$43000,$7900,18.4%\nJun,$45000,$8370,18.6%';
    case 'transactions':
      return 'ID,Date,Customer,Category,Region,Amount,Status\n' +
        TRANSACTIONS.map(t => `${t.id},${t.date},${t.customer},${t.category},${t.region},$${t.amount},${t.status}`).join('\n');
    case 'users':
      return 'Metric,Value\nTotal Active Users,12500\nNew This Month,1240\nChurn Rate,1.2%\nRetention Rate,94.2%\nAvg Session,8.4 mins';
    case 'insights':
      return 'Title,Type,Priority,Description\n' +
        INSIGHTS.map(i => `"${i.title}","${i.type}","${i.priority}","${i.description}"`).join('\n');
    default: return '';
  }
};

const TYPE_ICON_MAP = { revenue: TrendingUp, transactions: FileText, users: Users, insights: BarChart2 };

function ReportsContent() {
  const [reports, setReports] = useState<Report[]>([
    { id: '1', name: 'Revenue Report', type: 'revenue', generatedAt: 'May 2, 2026', size: '4.2 KB', status: 'ready' },
    { id: '2', name: 'Transaction Export', type: 'transactions', generatedAt: 'May 1, 2026', size: '18.7 KB', status: 'ready' },
  ]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');

  const handleGenerate = async (type: typeof REPORT_TYPES[0]) => {
    setGenerating(type.id);
    await new Promise(r => setTimeout(r, 1600));
    setReports(prev => [{
      id: Date.now().toString(), name: type.label,
      type: type.id as Report['type'],
      generatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      size: `${(Math.random() * 20 + 2).toFixed(1)} KB`, status: 'ready',
    }, ...prev]);
    setGenerating(null);
  };

  const handleDownload = (report: Report) => {
    const csv = generateCSV(report.type);
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 mb-3">
          <span>Dashboard</span><span className="opacity-30">/</span>
          <span className="text-sky-400">Reports</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Reports</h1>
            <p className="text-slate-500 text-[12px] mt-1">Generate and download data reports.</p>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1">
            {['7d', '30d', '90d'].map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={cn('px-3 py-1.5 rounded-lg text-[11px] font-black transition-all',
                  dateRange === r ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-white')}>
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REPORT_TYPES.map(type => {
            const Icon = type.icon;
            const isGenerating = generating === type.id;
            return (
              <motion.button key={type.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => handleGenerate(type)} disabled={!!generating}
                className="flex items-center gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] text-left transition-all disabled:opacity-50 group">
                <div className="p-2.5 rounded-xl border flex-shrink-0" style={{ background: `${type.color}15`, borderColor: `${type.color}25` }}>
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: type.color }} /> : <Icon className="w-4 h-4" style={{ color: type.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-white">{type.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{type.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-sky-400 transition-colors flex-shrink-0">
                  {isGenerating ? 'Building...' : <><Plus size={12} /> Generate</>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Generated Reports ({reports.length})</h2>
        <div className="space-y-2">
          <AnimatePresence>
            {reports.map((report, i) => {
              const Icon = TYPE_ICON_MAP[report.type] ?? FileText;
              return (
                <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <Icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-white">{report.name}</p>
                      <p className="text-[10px] text-slate-600 font-bold mt-0.5 flex items-center gap-2">
                        <Calendar size={9} /> {report.generatedAt} · {report.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400">
                      <CheckCircle2 size={9} /> Ready
                    </span>
                    <button onClick={() => handleDownload(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-400 hover:bg-sky-500/20 transition-all">
                      <Download size={11} /> Download
                    </button>
                    <button onClick={() => setReports(prev => prev.filter(r => r.id !== report.id))}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {reports.length === 0 && (
            <div className="py-12 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-bold">No reports yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <ReportsContent />
    </RoleGuard>
  );
}