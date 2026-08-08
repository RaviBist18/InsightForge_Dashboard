"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  Calendar,
  BarChart2,
  TrendingUp,
  Trash2,
  Zap,
  ChevronDown,
  Info,
} from "lucide-react";
import { RoleGuard } from "@/components/common/RoleGuard";
import { getRevenueData, getTransactions, getInsights } from "@/lib/data";

// ─── Types ──────────────────────────────────────────────────────────────
interface HeatCell {
  metric: string;
  pctDelta: number;
  reasoning: string;
  loading: boolean;
}

interface Report {
  id: string;
  name: string;
  type: "revenue" | "transactions" | "insights";
  generatedAt: string;
  size: string;
  status: "ready" | "generating";
  reportId: string;
}

// ─── Illustrative-only scenario data (clearly labeled, not live) ─────────
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

// ─── Real CSV generators — pull actual data, not mocks ────────────────────
async function generateRevenueCSV(reportId: string): Promise<string> {
  const meta = `# InsightForge Report Export\n# Report ID: ${reportId}\n# Generated: ${new Date().toISOString()}\n\n`;
  const rev = await getRevenueData();
  const rows = rev
    .map((r: any) => `${r.name},$${r.revenue},$${r.profit}`)
    .join("\n");
  return `${meta}Month,Revenue,Profit (Est.)\n${rows}`;
}

async function generateTransactionsCSV(reportId: string): Promise<string> {
  const meta = `# InsightForge Report Export\n# Report ID: ${reportId}\n# Generated: ${new Date().toISOString()}\n\n`;
  const tx = await getTransactions();
  const rows = tx
    .map(
      (t: any) =>
        `${t.id},${t.date},${t.customer},${t.category},$${t.amount},${t.status}`,
    )
    .join("\n");
  return `${meta}ID,Date,Customer,Category,Amount,Status\n${rows}`;
}

async function generateInsightsCSV(reportId: string): Promise<string> {
  const meta = `# InsightForge Report Export\n# Report ID: ${reportId}\n# Generated: ${new Date().toISOString()}\n\n`;
  const insights = await getInsights();
  const rows = insights
    .map((i: any) => `"${i.title}","${i.description}"`)
    .join("\n");
  return `${meta}Title,Description\n${rows}`;
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
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
      {payload.map((p: any) => (
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
            <span className="font-semibold">${p.value.toLocaleString()}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Feature 1: Revenue Trend — real data only ─────────────────────────
function RevenueTrend() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRevenueData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return (
    <div
      id="revenue-trend"
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
            Revenue Trend
          </h2>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Real revenue by month, from your transactions
          </p>
        </div>
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
            Revenue
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[260px]">
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "var(--accent)" }}
          />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex items-center justify-center h-[260px] text-[13px]"
          style={{ color: "var(--text-muted)" }}
        >
          No revenue data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#9CA3AF", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#003366", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
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
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Feature 2: Scenario Analysis — relabeled illustrative, not live data ─
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
    const deltas = SCENARIO_MOCK[s] ?? HEATMAP_METRICS.map(() => 0);
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
    if (v <= -10)
      return {
        bg: "var(--danger-bg)",
        border: "var(--danger)",
        text: "var(--danger)",
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
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-[15px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Scenario Analysis
            </h2>
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-medium"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <Info size={10} /> Illustrative
            </span>
          </div>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Hypothetical what-if simulation — not based on live data or a real
            model
          </p>
        </div>

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
            {running ? "Running..." : "Run Simulation"}
          </button>
        </div>
      </div>

      {cells.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mt-3">
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
          className="flex flex-col items-center justify-center py-12 rounded-xl mt-3"
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
            Select a scenario and run the simulation
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Feature 3: Report Archive — real exports, no User Report ─────────────
const REPORT_TYPES = [
  {
    id: "revenue",
    label: "Revenue Report",
    icon: TrendingUp,
    description: "Real monthly revenue export",
  },
  {
    id: "transactions",
    label: "Transaction Ledger",
    icon: FileText,
    description: "Full real transaction history CSV",
  },
  {
    id: "insights",
    label: "Insights Summary",
    icon: BarChart2,
    description: "Real AI-generated briefing export",
  },
];

function ReportArchive() {
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (type: (typeof REPORT_TYPES)[0]) => {
    setGenerating(type.id);
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
        size: "—",
        status: "ready",
        reportId: generateReportId(),
      },
      ...prev,
    ]);
    setGenerating(null);
  };

  const handleDownload = async (report: Report) => {
    let csv = "";
    if (report.type === "revenue")
      csv = await generateRevenueCSV(report.reportId);
    else if (report.type === "transactions")
      csv = await generateTransactionsCSV(report.reportId);
    else if (report.type === "insights")
      csv = await generateInsightsCSV(report.reportId);

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
          Generate and download real report exports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                        {report.reportId}
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

// ─── Main Page ────────────────────────────────────────────────────────────
function ReportsContent() {
  return (
    <div className="space-y-6">
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
          Real revenue trend, illustrative scenario simulation, and exportable
          report archive
        </p>
      </div>

      <RevenueTrend />
      <ScenarioAnalysis />
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
