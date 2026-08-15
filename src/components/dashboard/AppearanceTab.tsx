"use client";

import { motion } from "framer-motion";
import { Save, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface AppearanceTabProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

export function AppearanceTab({ showToast }: AppearanceTabProps) {
  const { compactMode, setCompactMode, theme, setTheme } = useTheme();

  const handleSave = () => {
    showToast("Appearance settings saved!", "success");
  };

  return (
    <div className="p-6 space-y-6">
      <h2
        className="text-[15px] font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        Appearance
      </h2>

      {/* ── Theme ── */}
      <div
        className="flex items-center justify-between py-4 rounded-xl px-4"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Theme
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Switch between light and dark mode
          </p>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setTheme("light")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{
              background: theme === "light" ? "var(--accent)" : "transparent",
              color: theme === "light" ? "#fff" : "var(--text-secondary)",
            }}
          >
            <Sun size={13} /> Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{
              background: theme === "dark" ? "var(--accent)" : "transparent",
              color: theme === "dark" ? "#fff" : "var(--text-secondary)",
            }}
          >
            <Moon size={13} /> Dark
          </button>
        </div>
      </div>

      {/* ── Compact Mode ── */}
      <div
        className="flex items-center justify-between py-4 rounded-xl px-4"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Compact Mode
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Reduce spacing for more data density
          </p>
        </div>
        <motion.button
          onClick={() => setCompactMode(!compactMode)}
          whileTap={{ scale: 0.95 }}
          className="relative w-11 h-[24px] rounded-full transition-all duration-300 flex-shrink-0"
          style={{
            background: compactMode ? "var(--accent)" : "var(--border-strong)",
          }}
        >
          <motion.div
            animate={{ x: compactMode ? 20 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow"
          />
        </motion.button>
      </div>

      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-white transition-colors"
        style={{ background: "var(--accent)" }}
      >
        <Save size={13} /> Save Appearance
      </motion.button>
    </div>
  );
}
