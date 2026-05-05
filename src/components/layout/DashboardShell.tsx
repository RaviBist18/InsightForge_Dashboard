"use client";

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AIChat } from './AIChat';
import { ThemeProvider } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <div className="flex h-screen font-sans overflow-hidden selection:bg-sky-500/30 selection:text-white relative"
        style={{ background: 'var(--bg-primary, #020617)' }}>
        <div className="mesh-bg" />
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={isMobileMenuOpen}
          setMobileOpen={setIsMobileMenuOpen}
        />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />

          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="page-content"
                >
                  {children}

                  <footer className="mt-16 pb-8 border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      &copy; 2026 InsightForge Intelligence Systems. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <button className="hover:text-sky-400 transition-colors cursor-pointer text-left">Privacy</button>
                      <button className="hover:text-sky-400 transition-colors cursor-pointer text-left">Terms</button>
                      <button className="hover:text-sky-400 transition-colors cursor-pointer text-left">Status</button>
                    </div>
                  </footer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        <AIChat />
      </div>
    </ThemeProvider>
  );
}