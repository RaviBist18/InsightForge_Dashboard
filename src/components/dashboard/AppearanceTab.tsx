"use client";

// Replace the APPEARANCE TAB section in settings/page.tsx with this component
// Also add these imports at top of settings/page.tsx:
// import { useTheme, THEMES, ThemeName, AccentColor } from '@/context/ThemeContext';

import { motion } from 'framer-motion';
import { Save, Check } from 'lucide-react';
import { useTheme, THEMES, ThemeName, AccentColor } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const ACCENT_COLORS: AccentColor[] = [
    '#38bdf8', '#34d399', '#a78bfa', '#fb923c', '#f472b6', '#fbbf24'
];

const ACCENT_LABELS: Record<string, string> = {
    '#38bdf8': 'Sky',
    '#34d399': 'Emerald',
    '#a78bfa': 'Violet',
    '#fb923c': 'Orange',
    '#f472b6': 'Pink',
    '#fbbf24': 'Amber',
};

interface AppearanceTabProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export function AppearanceTab({ showToast }: AppearanceTabProps) {
    const { theme, accentColor, compactMode, setTheme, setAccentColor, setCompactMode } = useTheme();

    const handleSave = () => {
        showToast('Appearance settings saved!', 'success');
    };

    return (
        <div className="p-6 space-y-7">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Appearance</h2>

            {/* ── Theme Selection ── */}
            <div>
                <p className="text-[13px] font-black text-white mb-1">Theme</p>
                <p className="text-[11px] text-slate-500 mb-4">Choose your dashboard theme.</p>
                <div className="grid grid-cols-2 gap-3">
                    {THEMES.map(t => (
                        <motion.button
                            key={t.name}
                            onClick={() => setTheme(t.name as ThemeName)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className={cn(
                                'relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                                theme === t.name
                                    ? 'border-sky-500/50 bg-sky-500/5'
                                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]'
                            )}
                        >
                            {/* Preview swatches */}
                            <div className="flex gap-1 flex-shrink-0 mt-0.5">
                                {t.preview.map((color, i) => (
                                    <div key={i} className="w-4 h-8 rounded-md first:rounded-l-lg last:rounded-r-lg"
                                        style={{ background: color }} />
                                ))}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black text-white">{t.label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{t.description}</p>
                            </div>

                            {theme === t.name && (
                                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                                    <Check size={9} className="text-white" />
                                </div>
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* ── Accent Color ── */}
            <div>
                <p className="text-[13px] font-black text-white mb-1">Accent Color</p>
                <p className="text-[11px] text-slate-500 mb-4">Personalise your dashboard highlight color.</p>
                <div className="flex gap-3 flex-wrap">
                    {ACCENT_COLORS.map(c => (
                        <div key={c} className="flex flex-col items-center gap-1.5">
                            <motion.button
                                onClick={() => setAccentColor(c)}
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    'w-9 h-9 rounded-full border-2 transition-all relative',
                                    accentColor === c ? 'border-white scale-110' : 'border-transparent'
                                )}
                                style={{ background: c }}
                            >
                                {accentColor === c && (
                                    <Check size={12} className="absolute inset-0 m-auto text-white font-black" />
                                )}
                            </motion.button>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                {ACCENT_LABELS[c]}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Live preview */}
                <div className="mt-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
                    <p className="text-[11px] text-slate-400">Preview: accent color applied live across dashboard</p>
                    <div className="ml-auto px-3 py-1 rounded-lg text-[10px] font-black text-white" style={{ background: accentColor }}>
                        Button
                    </div>
                </div>
            </div>

            {/* ── Compact Mode ── */}
            <div className="flex items-center justify-between py-4 border-t border-white/[0.05]">
                <div>
                    <p className="text-[13px] font-bold text-white">Compact Mode</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Reduce spacing for more data density</p>
                </div>
                <motion.button
                    onClick={() => setCompactMode(!compactMode)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                        'relative w-11 h-[24px] rounded-full transition-all duration-300 flex-shrink-0',
                        compactMode ? 'bg-sky-500' : 'bg-white/[0.1]'
                    )}
                >
                    <motion.div
                        animate={{ x: compactMode ? 20 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow"
                    />
                </motion.button>
            </div>

            <motion.button
                onClick={handleSave}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black text-white transition-all shadow-lg"
                style={{ background: accentColor }}
            >
                <Save size={12} /> Save Appearance
            </motion.button>
        </div>
    );
}