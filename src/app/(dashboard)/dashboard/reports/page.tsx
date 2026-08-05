"use client";

import { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  Calendar,
  BarChart2,
  Users,
  TrendingUp,
  Trash2,
  Zap,
  Activity,
  AlertTriangle,
  Brain,
  ChevronDown,
} from "lucide-react";
import { TRANSACTIONS, INSIGHTS } from "@/data/mockData";
import { RoleGuard } from "@/components/common/RoleGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventPin {
  date: string;
  label: string;
  impact: "positive" | "negative";
  description: string;
}

interface HeatCell {
  metric: string;
  pctDelta: number;
  reasoning: string;
  loading: boolean;
}

interface Report {
  id: string;
  name: string;
  type: "revenue" | "transactions" | "users" | "insights";
  generatedAt: string;
  size: string;
  status: "ready" | "generating";
  reportId: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MRR_MARKET_DATA = [
  { month: "Oct", mrr: 31000, spy: 432 },
  { month: "Nov", mrr: 34000, spy: 441 },
  { month: "Dec", mrr: 36000, spy: 449 },
  { month: "Jan", mrr: 38000, spy: 462 },
  { month: "Feb", mrr: 35000, spy: 438 },
  { month: "Mar", mrr: 41000, spy: 471 },
  { month: "Apr", mrr: 43000, spy: 485 },
  { month: "May", mrr: 45000, spy: 491 },
];

const EVENT_PINS: EventPin[] = [
  {
    date: "Nov",
    label: "Rate Hike",
    impact: "negative",
    description:
      "A rate increase slowed SMB software spending; MRR growth lagged for roughly two weeks.",
  },
  {
    date: "Feb",
    label: "Market Shock",
    impact: "negative",
    description:
      "A liquidity event affected several enterprise customers, causing 3 contracts to pause.",
  },
  {
    date: "Mar",
    label: "Sector Rally",
    impact: "positive",
    description:
      "A broader tech sector rally coincided with a 31% surge in new B2B deal flow.",
  },
];

const SCENARIOS = [
  "If crypto markets drop 20%",
  "If the market index dips 10%",
  "If interest rates rise 50bps",
  "If a recession is declared",
  "If a competitor raises $100M",
];

const HEATMAP_METRICS = [
  "MRR",
  "Churn",
  "ARR",
  "CAC",
  "LTV",
  "NPS",
  "Burn",
  "Pipeline",
  "Headcount",
];

const SCENARIO_MOCK: Record<string, number[]> = {
  "If crypto markets drop 20%": [-4, +18, -3, +7, -6, -12, +8, -9, -2],
  "If the market index dips 10%": [-11, +22, -9, +14, -13, -18, +15, -21, -5],
  "If interest rates rise 50bps": [-7, +15, -6, +9, -8, -10, +11, -14, -3],
  "If a recession is declared": [-24, +41, -20, +28, -31, -35, +38, -44, -12],
  "If a competitor raises $100M": [-8, +19, -7, +11, -9, -7, +6, -16, +2],
};

const generateReportId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  return `RPT-${Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")}`;
};

const generateCSV = (type: string, reportId: string): string => {
  const meta = `# InsightForge Report Export\n# Report ID: ${reportId}\n# Generated: ${new Date().toISOString()}\n\n`;
  switch (type) {
    case "revenue":
      return (
        meta +
        "Month,MRR,Market_Index,Correlation\nOct,$31000,432,0.84\nNov,$34000,441,0.81\nDec,$36000,449,0.79\nJan,$38000,462,0.83\nFeb,$35000,438,0.76\nMar,$41000,471,0.88\nApr,$43000,485,0.91\nMay,$45000,491,0.92"
      );
    case "transactions":
      return (
        meta +
        "ID,Date,Customer,Category,Region,Amount,Status\n" +
        TRANSACTIONS.map(
          (t) =>
            `${t.id},${t.date},${t.customer},${t.category},${t.region},$${t.amount},${t.status}`,
        ).join("\n")
      );
    case "users":
      return (
        meta +
        "Metric,Value\nTotal Active Users,12500\nNew This Month,1240\nChurn Rate,1.2%\nRetention Rate,94.2%\nAvg Session,8.4 mins"
      );
    case "insights":
      return (
        meta +
        "Title,Type,Priority,Description\n" +
        INSIGHTS.map(
          (i) => `"${i.title}","${i.type}","${i.priority}","${i.description}"`,
        ).join("\n")
      );
    default:
      return meta;
  }
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 shadow-md"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-[12px] font-medium mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span
            className="text-[12px]"
            style={{ color: "var(--text-primary)" }}
          >
            {p.name}:{" "}
            <span className="font-semibold">
              {typeof p.value === "number" && p.name === "MRR"
                ? `$${p.value.toLocaleString()}`
                : p.value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature 1: Revenue vs Market Trend ──────────────────────────────────────

function RevenueMarketTrend() {
  const [activePin, setActivePin] = useState<EventPin | null>(null);

  return (
    <div
      id="revenue-market-trend"
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Revenue vs Market Trend
          </h2>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Internal MRR compared with a broad market index — last 8 months
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl"
            style={{ background: "var(--accent-subtle)" }}
          >
            <div
              className="w-3 h-0.5 rounded"
              style={{ background: "var(--accent)" }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              MRR
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="w-3 h-0.5 rounded"
              style={{ background: "#94A3B8" }}
            />
            <span
              className="text-[11px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Market Index
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={MRR_MARKET_DATA}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="mrr"
            orientation="left"
            tick={{ fill: "#003366", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            yAxisId="spy"
            orientation="right"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[420, 500]}
          />
          <Tooltip content={<ChartTooltip />} />

          {EVENT_PINS.map((pin) => (
            <ReferenceLine
              key={pin.date}
              x={pin.date}
              yAxisId="mrr"
              stroke={
                pin.impact === "positive" ? "var(--success)" : "var(--danger)"
              }
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: pin.label,
                position: "top",
                style: {
                  fill:
                    pin.impact === "positive"
                      ? "var(--success)"
                      : "var(--danger)",
                  fontSize: 10,
                  fontWeight: 600,
                },
              }}
            />
          ))}

          <Line
            yAxisId="mrr"
            type="monotone"
            dataKey="mrr"
            name="MRR"
            stroke="#003366"
            strokeWidth={2}
            dot={{ fill: "#003366", r: 3, strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: "#003366",
              strokeWidth: 2,
              stroke: "#fff",
            }}
          />
          <Line
            yAxisId="spy"
            type="monotone"
            dataKey="spy"
            name="Market Index"
            stroke="#94A3B8"
            strokeWidth={1.5}
            dot={{ fill: "#94A3B8", r: 3, strokeWidth: 0 }}
            strokeDasharray="6 3"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Event Pin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {EVENT_PINS.map((pin) => (
          <button
            key={pin.date}
            onClick={() =>
              setActivePin(activePin?.date === pin.date ? null : pin)
            }
            className="text-left p-3 rounded-xl transition-colors"
            style={{
              background:
                pin.impact === "positive"
                  ? "var(--success-bg)"
                  : "var(--danger-bg)",
              border: `1px solid ${pin.impact === "positive" ? "var(--success)" : "var(--danger)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {pin.date}
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-xl capitalize"
                style={{
                  color:
                    pin.impact === "positive"
                      ? "var(--success)"
                      : "var(--danger)",
                }}
              >
                {pin.impact}
              </span>
            </div>
            <p
              className="text-[13px] font-medium"
              style={{
                color:
                  pin.impact === "positive"
                    ? "var(--success)"
                    : "var(--danger)",
              }}
            >
              {pin.label}
            </p>
            <AnimatePresence>
              {activePin?.date === pin.date && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[12px] mt-1.5 leading-relaxed overflow-hidden"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {pin.description}
                </motion.p>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Feature 2: Scenario Analysis ────────────────────────────────────────────

function ScenarioAnalysis() {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  const runScenario = async (s: string) => {
    setRunning(true);
    setCells(
      HEATMAP_METRICS.map((m) => ({
        metric: m,
        pctDelta: 0,
        reasoning: "",
        loading: true,
      })),
    );
    const deltas =
      SCENARIO_MOCK[s] ??
      HEATMAP_METRICS.map(() => Math.round((Math.random() - 0.5) * 30));
    for (let i = 0; i < HEATMAP_METRICS.length; i++) {
      await new Promise((r) => setTimeout(r, 180 + i * 60));
      setCells((prev) =>
        prev.map((c, idx) =>
          idx === i
            ? {
                metric: c.metric,
                pctDelta: deltas[i],
                reasoning:
                  deltas[i] < -15
                    ? "Significant exposure — review recommended."
                    : deltas[i] < 0
                      ? "Moderate impact — monitor closely."
                      : "Marginal upside — opportunistic.",
                loading: false,
              }
            : c,
        ),
      );
    }
    setRunning(false);
  };

  const cellStyle = (v: number) => {
    if (v <= -20)
      return {
        bg: "var(--danger-bg)",
        border: "var(--danger)",
        text: "var(--danger)",
      };
    if (v <= -10)
      return {
        bg: "var(--danger-bg)",
        border: "var(--danger)",
        text: "var(--danger)",
      };
    if (v <= -5)
      return {
        bg: "var(--warning-bg)",
        border: "var(--warning)",
        text: "var(--warning)",
      };
    if (v < 0)
      return {
        bg: "var(--warning-bg)",
        border: "var(--warning)",
        text: "var(--warning)",
      };
    return {
      bg: "var(--success-bg)",
      border: "var(--success)",
      text: "var(--success)",
    };
  };

  return (
    <div
      id="scenario-analysis"
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h2
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Scenario Analysis
          </h2>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Estimated impact across key metrics for a given macro scenario
          </p>
        </div>

        {/* Scenario dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setOpen((p) => !p)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-colors min-w-[220px] justify-between"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <span>{scenario}</span>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
              </motion.div>
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl overflow-hidden shadow-md"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {SCENARIOS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setScenario(s);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-[12px] font-medium transition-colors"
                      style={{
                        color:
                          s === scenario
                            ? "var(--accent)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => runScenario(scenario)}
            disabled={running}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {running ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Zap size={13} />
            )}
            {running ? "Running..." : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* 3x3 Heatmap */}
      {cells.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {cells.map((cell, i) => {
            const style = cellStyle(cell.pctDelta);
            return (
              <motion.div
                key={cell.metric}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-xl p-3"
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                }}
              >
                {cell.loading ? (
                  <div className="flex items-center justify-center h-14">
                    <Loader2
                      size={14}
                      className="animate-spin"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="text-[11px] mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {cell.metric}
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-[18px] font-semibold"
                      style={{ color: style.text }}
                    >
                      {cell.pctDelta > 0 ? "+" : ""}
                      {cell.pctDelta}%
                    </motion.div>
                    <p
                      className="text-[11px] mt-1 leading-snug"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {cell.reasoning}
                    </p>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-xl"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <Zap
            size={22}
            style={{ color: "var(--text-muted)" }}
            className="mb-2"
          />
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Select a scenario and run the analysis
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Feature 3: Market Exposure Score ────────────────────────────────────────

function MarketExposureScore() {
  const SCORE = 72; // 0-100 exposure score
  const springScore = useSpring(0, { stiffness: 40, damping: 12 });
  const needleRotation = useTransform(springScore, [0, 100], [-90, 90]);

  useEffect(() => {
    springScore.set(SCORE);
  }, [springScore]);

  const gaugeColor =
    SCORE >= 60 ? "#DC2626" : SCORE >= 30 ? "#D97706" : "#059669";
  const gaugeLabel =
    SCORE >= 60
      ? "High Exposure"
      : SCORE >= 30
        ? "Moderate Exposure"
        : "Low Exposure";

  const RECOMMENDATIONS = [
    "Diversify into non-correlated revenue streams to reduce single-market dependency.",
    "Consider annual-lock contracts for a portion of the pipeline to reduce exposure to macro shocks.",
    "Review top enterprise accounts for market-sensitive budgets; balance with less cyclical buyers.",
  ];

  return (
    <div
      id="market-exposure-score"
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <h2
        className="text-[15px] font-semibold mb-0.5"
        style={{ color: "var(--text-primary)" }}
      >
        Market Exposure Score
      </h2>
      <p
        className="text-[12px] mb-5"
        style={{ color: "var(--text-secondary)" }}
      >
        Estimated sensitivity of the business to broad market conditions
      </p>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Gauge SVG */}
        <div className="relative w-56 h-32 flex-shrink-0">
          <svg viewBox="0 0 200 110" width="224" height="128">
            <path
              d="M 10 100 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="var(--border)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 10 100 A 90 90 0 0 1 72 22"
              fill="none"
              stroke="#05966930"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 72 22 A 90 90 0 0 1 128 22"
              fill="none"
              stroke="#D9770630"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 128 22 A 90 90 0 0 1 190 100"
              fill="none"
              stroke="#DC262630"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <text x="18" y="118" fill="#059669" fontSize="9" fontWeight="600">
              0
            </text>
            <text
              x="89"
              y="14"
              fill="#D97706"
              fontSize="9"
              fontWeight="600"
              textAnchor="middle"
            >
              50
            </text>
            <text x="174" y="118" fill="#DC2626" fontSize="9" fontWeight="600">
              100
            </text>
            <text
              x="100"
              y="90"
              fill="#1A1A1A"
              fontSize="26"
              fontWeight="600"
              textAnchor="middle"
            >
              {SCORE}
            </text>
            <text
              x="100"
              y="106"
              fill={gaugeColor}
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              {gaugeLabel}
            </text>
          </svg>
          <motion.div
            className="absolute bottom-0 left-1/2 origin-bottom"
            style={{
              rotate: needleRotation,
              translateX: "-50%",
              translateY: "-8px",
              width: 2,
              height: 70,
              background: gaugeColor,
              borderRadius: 2,
            }}
          />
        </div>

        {/* Recommendations */}
        {SCORE >= 60 && (
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} style={{ color: "var(--danger)" }} />
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--danger)" }}
              >
                Recommended Actions
              </span>
            </div>
            <div className="space-y-2">
              {RECOMMENDATIONS.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger)",
                  }}
                >
                  <span
                    className="text-[12px] font-semibold shrink-0"
                    style={{ color: "var(--danger)" }}
                  >
                    0{i + 1}
                  </span>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {d}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feature 4: Report Archive ───────────────────────────────────────────────

const REPORT_TYPES = [
  {
    id: "revenue",
    label: "Revenue Report",
    icon: TrendingUp,
    description: "MRR and market trend export",
  },
  {
    id: "transactions",
    label: "Transaction Ledger",
    icon: FileText,
    description: "Full transaction history CSV",
  },
  {
    id: "users",
    label: "User Report",
    icon: Users,
    description: "Churn, retention, and LTV data",
  },
  {
    id: "insights",
    label: "Insights Summary",
    icon: BarChart2,
    description: "AI-generated strategic insights",
  },
];

function ReportArchive() {
  const [reports, setReports] = useState<Report[]>([
    {
      id: "1",
      name: "Revenue Report",
      type: "revenue",
      generatedAt: "May 2, 2026",
      size: "4.2 KB",
      status: "ready",
      reportId: generateReportId(),
    },
    {
      id: "2",
      name: "Transaction Ledger",
      type: "transactions",
      generatedAt: "May 1, 2026",
      size: "18.7 KB",
      status: "ready",
      reportId: generateReportId(),
    },
  ]);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (type: (typeof REPORT_TYPES)[0]) => {
    setGenerating(type.id);
    await new Promise((r) => setTimeout(r, 1400));
    setReports((prev) => [
      {
        id: Date.now().toString(),
        name: type.label,
        type: type.id as Report["type"],
        generatedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        size: `${(Math.random() * 20 + 2).toFixed(1)} KB`,
        status: "ready",
        reportId: generateReportId(),
      },
      ...prev,
    ]);
    setGenerating(null);
  };

  const handleDownload = (report: Report) => {
    const csv = generateCSV(report.type, report.reportId);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insightforge_${report.type}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="report-archive" className="space-y-4">
      <div>
        <h2
          className="text-[15px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Report Archive
        </h2>
        <p
          className="text-[12px] mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Generate and download report exports
        </p>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const isGenerating = generating === type.id;
          return (
            <button
              key={type.id}
              onClick={() => handleGenerate(type)}
              disabled={!!generating}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-colors disabled:opacity-50"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{ background: "var(--accent-subtle)" }}
              >
                {isGenerating ? (
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "var(--accent)" }}
                  />
                ) : (
                  <Icon
                    className="w-4 h-4"
                    style={{ color: "var(--accent)" }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {type.label}
                </p>
                <p
                  className="text-[12px] mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {type.description}
                </p>
              </div>
              <span
                className="text-[12px] font-medium shrink-0"
                style={{ color: "var(--accent)" }}
              >
                {isGenerating ? "Generating..." : "Generate →"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Report list */}
      <div className="space-y-2">
        <AnimatePresence>
          {reports.map((report, i) => {
            const Icon =
              REPORT_TYPES.find((t) => t.id === report.type)?.icon ?? FileText;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl px-5 py-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: "var(--text-secondary)" }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-[13px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {report.name}
                      </p>
                      <p
                        className="text-[12px] mt-0.5 flex items-center gap-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Calendar size={11} /> {report.generatedAt} ·{" "}
                        {report.size} · {report.reportId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium"
                      style={{
                        background: "var(--success-bg)",
                        color: "var(--success)",
                      }}
                    >
                      <CheckCircle2 size={11} /> Ready
                    </span>
                    <button
                      onClick={() => handleDownload(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors"
                      style={{
                        background: "var(--accent-subtle)",
                        color: "var(--accent)",
                      }}
                    >
                      <Download size={12} /> Download
                    </button>
                    <button
                      onClick={() =>
                        setReports((prev) =>
                          prev.filter((r) => r.id !== report.id),
                        )
                      }
                      className="p-1.5 rounded-xl transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {reports.length === 0 && (
          <div
            className="py-12 text-center rounded-xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <FileText
              className="w-7 h-7 mx-auto mb-2"
              style={{ color: "var(--text-muted)" }}
            />
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              No reports yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ReportsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div
          className="flex items-center gap-2 text-[12px] mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span>Dashboard</span>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>Reports</span>
        </div>
        <h1
          className="text-[22px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Reports
        </h1>
        <p
          className="text-[13px] mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Trend analysis, scenario planning, and exportable report archive
        </p>
      </div>

      <RevenueMarketTrend />
      <ScenarioAnalysis />
      <MarketExposureScore />
      <ReportArchive />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}
