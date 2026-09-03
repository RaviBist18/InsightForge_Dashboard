"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { runSimulation, type SimulationResult } from "@/lib/data";
import { Megaphone, Tag, Users, RotateCcw, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LEVERS = [
  { key: "marketing_spend", label: "Marketing Spend", icon: Megaphone },
  { key: "price", label: "Price", icon: Tag },
  { key: "headcount", label: "Headcount", icon: Users },
];

const PRESETS = [
  {
    label: "Boost Marketing",
    deltas: { marketing_spend: 25, price: 0, headcount: 0 },
  },
  {
    label: "Raise Prices",
    deltas: { marketing_spend: 0, price: 12, headcount: 0 },
  },
  {
    label: "Cut Costs",
    deltas: { marketing_spend: -20, price: 0, headcount: -15 },
  },
  {
    label: "Scale Up",
    deltas: { marketing_spend: 20, price: 0, headcount: 20 },
  },
];

const ZERO_DELTAS = { marketing_spend: 0, price: 0, headcount: 0 };

// animated count-up number
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    const duration = 400;
    const start = performance.now();

    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else prev.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{Math.round(display).toLocaleString()}</>;
}

// Now vs Projected comparison bar — the signature element
function CompareBar({
  label,
  baseline,
  projected,
  deltaPct,
}: {
  label: string;
  baseline: number;
  projected: number;
  deltaPct: number;
}) {
  const max = Math.max(baseline, projected, 1);
  const baselinePct = (baseline / max) * 100;
  const projectedPct = (projected / max) * 100;
  const positive = deltaPct >= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[15px] font-semibold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedNumber value={projected} />
          </span>
          {deltaPct !== 0 && (
            <span
              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums"
              style={{
                color: positive ? "var(--success)" : "var(--danger)",
                background: positive
                  ? "color-mix(in srgb, var(--success) 12%, transparent)"
                  : "color-mix(in srgb, var(--danger) 12%, transparent)",
              }}
            >
              {positive ? "+" : ""}
              {deltaPct}%
            </span>
          )}
        </div>
      </div>

      {/* baseline bar */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] w-12 uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Now
          </span>
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${baselinePct}%`,
                background: "var(--text-muted)",
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] w-12 uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Projected
          </span>
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{ width: `${projectedPct}%` }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              style={{
                background: positive ? "var(--success)" : "var(--danger)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  const [deltas, setDeltas] = useState<Record<string, number>>(ZERO_DELTAS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const runSim = useCallback(async (currentDeltas: Record<string, number>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runSimulation(currentDeltas);
      setResult(res);
    } catch {
      setError("Simulation failed — check backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSim(deltas), 300);
    return () => clearTimeout(timer);
  }, [deltas, runSim]);

  const handleSliderChange = (key: string, value: number[]) => {
    setActivePreset(null);
    setDeltas((prev) => ({ ...prev, [key]: value[0] }));
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setActivePreset(preset.label);
    setDeltas(preset.deltas);
  };

  const reset = () => {
    setActivePreset(null);
    setDeltas(ZERO_DELTAS);
  };

  const hasChanges = Object.values(deltas).some((v) => v !== 0);
  const baseline = result
    ? {
        revenue: result.projected.revenue / (1 + result.deltaPct.revenue / 100),
        orders:
          result.deltaPct.orders !== -100
            ? result.projected.orders / (1 + result.deltaPct.orders / 100)
            : result.projected.orders,
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Scenario Simulator
        </h1>
        <p
          className="text-[13px] mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          See the impact of a decision before you make it. Move a lever, watch
          the projection update.
        </p>
      </div>

      {/* Quick scenarios */}
      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--accent)" }}
        >
          Try a scenario
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors"
              style={{
                borderColor:
                  activePreset === preset.label
                    ? "var(--accent)"
                    : "var(--border)",
                background:
                  activePreset === preset.label
                    ? "var(--accent-subtle)"
                    : "var(--bg-surface)",
                color:
                  activePreset === preset.label
                    ? "var(--accent)"
                    : "var(--text-secondary)",
              }}
            >
              {preset.label}
            </button>
          ))}
          {hasChanges && (
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Levers */}
      <div
        className="rounded-2xl p-5 space-y-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {LEVERS.map((lever) => {
          const val = deltas[lever.key];
          const positive = val > 0;
          const negative = val < 0;
          return (
            <div key={lever.key} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                    }}
                  >
                    <lever.icon size={14} />
                  </div>
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {lever.label}
                  </span>
                </div>
                <span
                  className="text-[13px] font-semibold tabular-nums px-2 py-0.5 rounded-md"
                  style={{
                    color: positive
                      ? "var(--success)"
                      : negative
                        ? "var(--danger)"
                        : "var(--text-muted)",
                    background:
                      positive || negative
                        ? `color-mix(in srgb, ${positive ? "var(--success)" : "var(--danger)"} 10%, transparent)`
                        : "transparent",
                  }}
                >
                  {positive ? "+" : ""}
                  {val}%
                </span>
              </div>
              <Slider
                min={-30}
                max={50}
                step={1}
                value={[val]}
                onValueChange={(v) => handleSliderChange(lever.key, v)}
              />
            </div>
          );
        })}
      </div>

      {/* Results */}
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Projected impact
          </p>
          {loading && (
            <span
              className="text-[11px] animate-pulse"
              style={{ color: "var(--text-muted)" }}
            >
              Calculating…
            </span>
          )}
        </div>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {result && baseline && (
          <AnimatePresence mode="wait">
            <motion.div
              key={JSON.stringify(deltas)}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <CompareBar
                label="Revenue"
                baseline={baseline.revenue}
                projected={result.projected.revenue}
                deltaPct={result.deltaPct.revenue}
              />
              <CompareBar
                label="Orders"
                baseline={baseline.orders}
                projected={result.projected.orders}
                deltaPct={result.deltaPct.orders}
              />
              <div className="flex items-center justify-between pt-1">
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Profit
                </span>
                <span
                  className="text-[15px] font-semibold tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  <AnimatedNumber value={result.projected.profit} />
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        <div
          className="flex items-start gap-2 text-[11px] pt-3 border-t"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <span
            className="font-semibold flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
          >
            Estimated model.
          </span>
          <span>{result?.basis}</span>
        </div>
      </div>
    </div>
  );
}
