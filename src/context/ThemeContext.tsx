"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface ThemeContextType {
  compactMode: boolean;
  setCompactMode: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [compactMode, setCompactState] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("insightforge_theme");
      if (saved) {
        const { compactMode } = JSON.parse(saved);
        if (typeof compactMode === "boolean") setCompactState(compactMode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Apply compact mode to root
  useEffect(() => {
    const root = document.documentElement;
    if (compactMode) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
    }
  }, [compactMode]);

  const persist = (updates: Partial<{ compactMode: boolean }>) => {
    try {
      const current = JSON.parse(
        localStorage.getItem("insightforge_theme") || "{}",
      );
      localStorage.setItem(
        "insightforge_theme",
        JSON.stringify({ ...current, ...updates }),
      );
    } catch {
      /* ignore */
    }
  };

  const setCompactMode = (v: boolean) => {
    setCompactState(v);
    persist({ compactMode: v });
  };

  return (
    <ThemeContext.Provider value={{ compactMode, setCompactMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
