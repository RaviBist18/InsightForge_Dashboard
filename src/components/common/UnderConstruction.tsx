import Link from 'next/link';
import { ChevronLeft, Construction } from 'lucide-react';

export default function UnderConstruction() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Link 
        href="/"
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest mb-12 group"
      >
        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Return to Intelligence Hub
      </Link>
      
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-sky-500/20 blur-3xl rounded-full" />
        <Construction className="w-24 h-24 text-sky-500 relative" strokeWidth={1} />
      </div>
      
      <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Module Under Development</h2>
      <p className="text-slate-400 max-w-md mx-auto leading-relaxed mb-10">
        Our intelligence systems are currently calibrating this data segment. 
        Deep neural processing is underway to provide real-time telemetry.
      </p>
      
      <div className="flex gap-4">
        <div className="h-1 w-12 bg-sky-500/30 rounded-full" />
        <div className="h-1 w-12 bg-sky-500/60 rounded-full" />
        <div className="h-1 w-12 bg-sky-500/30 rounded-full" />
      </div>
    </div>
  );
}
