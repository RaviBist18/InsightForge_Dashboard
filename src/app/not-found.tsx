import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-bold text-white mb-4">404 - Not Found</h2>
      <p className="text-slate-400 mb-8 tracking-tight">
        The intelligence module you are looking for does not exist or has been relocated.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 glass bg-sky-500/10 border-sky-500/50 text-sky-400 font-bold uppercase tracking-widest text-xs hover:bg-sky-500/20 transition-all"
      >
        Return to Command Center
      </Link>
    </div>
  );
}
