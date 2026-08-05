"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

import { ThemeProvider } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <div
        className="flex h-screen font-sans overflow-hidden selection:bg-[var(--accent-subtle)] selection:text-[var(--accent)] relative"
        style={{ background: "var(--bg-primary)" }}
      >
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
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="page-content"
                >
                  {children}

                  <footer
                    className="mt-16 pb-8 border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p
                      className="text-[12px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      &copy; 2026 InsightForge. All rights reserved.
                    </p>
                    <div
                      className="flex gap-6 text-[12px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <button className="transition-colors cursor-pointer text-left hover:text-[color:var(--accent)]">
                        Privacy
                      </button>
                      <button className="transition-colors cursor-pointer text-left hover:text-[color:var(--accent)]">
                        Terms
                      </button>
                      <button className="transition-colors cursor-pointer text-left hover:text-[color:var(--accent)]">
                        Status
                      </button>
                    </div>
                  </footer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
