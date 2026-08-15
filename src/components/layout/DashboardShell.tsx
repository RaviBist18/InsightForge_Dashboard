"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import Link from "next/link";
import { ThemeProvider } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function DashboardShell({
  children,
  companyName,
  hasCompany,
}: {
  children: React.ReactNode;
  companyName?: string | null;
  hasCompany?: boolean;
}) {
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
          <Navbar
            onMenuClick={() => setIsMobileMenuOpen(true)}
            companyName={companyName}
          />

          {hasCompany === false && (
            <div
              className="flex items-center justify-between gap-4 px-6 py-3 border-b flex-wrap"
              style={{
                background: "var(--accent-subtle)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--accent)" }}
              >
                You're not part of a company yet — join one to see live data.
              </p>

              <a
                href="/onboarding?view=join"
                className="px-4 py-1.5 rounded-xl text-[12px] font-medium text-white transition-colors flex-shrink-0"
                style={{ background: "var(--accent)" }}
              >
                Join a Company
              </a>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 md:p-8 min-h-full flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="page-content flex-1 flex flex-col"
                >
                  <div className="flex-1">{children}</div>

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
                      className="flex gap-6 text-[12px] mr-18"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Link
                        href="/privacy"
                        className="transition-colors hover:text-[color:var(--accent)]"
                      >
                        Privacy
                      </Link>
                      <Link
                        href="/terms"
                        className="transition-colors hover:text-[color:var(--accent)]"
                      >
                        Terms
                      </Link>
                      <Link
                        href="/status"
                        className="transition-colors hover:text-[color:var(--accent)]"
                      >
                        Status
                      </Link>
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
