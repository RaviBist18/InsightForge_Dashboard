"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  compactMode: boolean;
  setCompactMode: (v: boolean) => void;
  theme: Theme;
  setTheme: (v: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [compactMode, setCompactState] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("insightforge_theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.compactMode === "boolean")
          setCompactState(parsed.compactMode);
        if (parsed.theme === "light" || parsed.theme === "dark")
          setThemeState(parsed.theme);
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

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const persist = (
    updates: Partial<{ compactMode: boolean; theme: Theme }>,
  ) => {
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

  const setTheme = (v: Theme) => {
    setThemeState(v);
    persist({ theme: v });
  };

  return (
    <ThemeContext.Provider
      value={{ compactMode, setCompactMode, theme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
