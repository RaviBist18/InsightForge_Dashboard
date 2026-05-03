import { INSIGHTS } from '@/data/mockData';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function InsightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const insight = INSIGHTS.find((i) => String(i.id) === id);

  if (!insight) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link 
        href="/"
        className="flex items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors text-[10px] font-bold uppercase tracking-widest mb-8 group"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className={cn(
        "glass p-8 md:p-12 relative overflow-hidden",
        insight.priority === 'critical' ? "border-rose-500/20 bg-rose-500/5" :
        insight.priority === 'high' ? "border-sky-500/20 bg-sky-500/5" :
        "border-emerald-500/20 bg-emerald-500/5"
      )}>
        <div className="flex items-center gap-4 mb-6">
          <div className={cn(
            "p-3 rounded-2xl",
            insight.priority === 'critical' ? "bg-rose-500/10 text-rose-400" :
            insight.priority === 'high' ? "bg-sky-500/10 text-sky-400" :
            "bg-emerald-500/10 text-emerald-400"
          )}>
            {insight.type === 'trend' ? <TrendingUp size={24} /> :
             insight.type === 'anomaly' ? <AlertTriangle size={24} /> :
             <Lightbulb size={24} />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-[2px] px-2 py-0.5 rounded border",
                insight.priority === 'critical' ? "border-rose-500/20 text-rose-400 bg-rose-500/10" :
                insight.priority === 'high' ? "border-sky-500/20 text-sky-400 bg-sky-500/10" :
                "border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
              )}>
                {insight.priority} Priority
              </span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Analytics Engine IF-402
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{insight.title}</h1>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            {insight.description}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-12 border-t border-white/5">
            <div>
              <h4 className="text-white font-bold uppercase text-xs tracking-widest mb-4">Telemetric Context</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-slate-400 italic">
                  <div className="w-1 h-1 rounded-full bg-sky-500" />
                  Detected variance exceeds standard deviation by 2.4x
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-400 italic">
                  <div className="w-1 h-1 rounded-full bg-sky-500" />
                  Correlated with segment {String(insight.id).slice(0, 4)} data points
                </li>
              </ul>
            </div>
            <div className="glass p-6 bg-white/5 border-white/5">
              <h4 className="text-sky-400 font-bold uppercase text-xs tracking-widest mb-2">Recommended Action</h4>
              <p className="text-sm text-slate-300">
                Execute systemic optimization of processing pipeline to mitigate {insight.type} risk factors.
              </p>
              <button className="mt-6 w-full py-3 bg-sky-500 text-white font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20">
                Generate Full Technical Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
