"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'midnight' | 'slate' | 'abyss' | 'aurora';
export type AccentColor = '#38bdf8' | '#34d399' | '#a78bfa' | '#fb923c' | '#f472b6' | '#fbbf24';

interface ThemeConfig {
    name: ThemeName;
    label: string;
    bg: string;
    surface: string;
    border: string;
    description: string;
    preview: string[];
}

export const THEMES: ThemeConfig[] = [
    {
        name: 'midnight',
        label: 'Midnight',
        bg: '#020617',
        surface: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.08)',
        description: 'Classic deep navy dark',
        preview: ['#020617', '#0f172a', '#1e293b'],
    },
    {
        name: 'slate',
        label: 'Slate',
        bg: '#0a0f1e',
        surface: 'rgba(148,163,184,0.04)',
        border: 'rgba(148,163,184,0.1)',
        description: 'Cool blue-grey dark',
        preview: ['#0a0f1e', '#111827', '#1f2937'],
    },
    {
        name: 'abyss',
        label: 'Abyss',
        bg: '#000000',
        surface: 'rgba(255,255,255,0.02)',
        border: 'rgba(255,255,255,0.06)',
        description: 'Pure deep black',
        preview: ['#000000', '#0a0a0a', '#141414'],
    },
    {
        name: 'aurora',
        label: 'Aurora',
        bg: '#0d0a1e',
        surface: 'rgba(139,92,246,0.04)',
        border: 'rgba(139,92,246,0.12)',
        description: 'Dark with purple tint',
        preview: ['#0d0a1e', '#130d2e', '#1a1040'],
    },
];

interface ThemeContextType {
    theme: ThemeName;
    accentColor: AccentColor;
    compactMode: boolean;
    setTheme: (t: ThemeName) => void;
    setAccentColor: (c: AccentColor) => void;
    setCompactMode: (v: boolean) => void;
    currentTheme: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeName>('midnight');
    const [accentColor, setAccentState] = useState<AccentColor>('#38bdf8');
    const [compactMode, setCompactState] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('insightforge_theme');
            if (saved) {
                const { theme, accentColor, compactMode } = JSON.parse(saved);
                if (theme) setThemeState(theme);
                if (accentColor) setAccentState(accentColor);
                if (typeof compactMode === 'boolean') setCompactState(compactMode);
            }
        } catch { /* ignore */ }
    }, []);

    // Apply theme to CSS variables
    useEffect(() => {
        const cfg = THEMES.find(t => t.name === theme) ?? THEMES[0];
        const root = document.documentElement;
        root.style.setProperty('--bg-primary', cfg.bg);
        root.style.setProperty('--surface', cfg.surface);
        root.style.setProperty('--border-color', cfg.border);
        root.style.setProperty('--accent', accentColor);
        document.body.style.background = cfg.bg;

        // Compact mode
        if (compactMode) {
            root.classList.add('compact');
        } else {
            root.classList.remove('compact');
        }
    }, [theme, accentColor, compactMode]);

    const persist = (updates: Partial<{ theme: ThemeName; accentColor: AccentColor; compactMode: boolean }>) => {
        try {
            const current = JSON.parse(localStorage.getItem('insightforge_theme') || '{}');
            localStorage.setItem('insightforge_theme', JSON.stringify({ ...current, ...updates }));
        } catch { /* ignore */ }
    };

    const setTheme = (t: ThemeName) => { setThemeState(t); persist({ theme: t }); };
    const setAccentColor = (c: AccentColor) => { setAccentState(c); persist({ accentColor: c }); };
    const setCompactMode = (v: boolean) => { setCompactState(v); persist({ compactMode: v }); };

    const currentTheme = THEMES.find(t => t.name === theme) ?? THEMES[0];

    return (
        <ThemeContext.Provider value={{ theme, accentColor, compactMode, setTheme, setAccentColor, setCompactMode, currentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}