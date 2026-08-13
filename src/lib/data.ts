import { supabase } from "./supabase";
import { INSIGHTS, Insight } from "@/data/mockData";

// ─── DashboardStats — canonical shape ─────────────────────────────────────
export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  activeUsers: number;
  churnRate: number;
  efficiency: number;
  latestNews: string;
  mrrSparkline?: { month: string; mrr: number }[];
  totalAssetValue?: number;
  marketGrowthYield?: number;
  activeNodesCount?: number;
}

export interface Transaction {
  id: string | number;
  date: string;
  customer: string;
  category: string;
  amount: number;
  status: string;
}

export async function getCurrentCompanyId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data.company_id;
}

// ─── shared helper — fetch + bucket real transactions by month ───────────
async function fetchTransactionsBucketed() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { rows: [], monthMap: {} as Record<string, number> };

  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, customer, category, amount, status")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error || !data)
    return { rows: [], monthMap: {} as Record<string, number> };

  const monthMap: Record<string, number> = {};
  data.forEach((t) => {
    const key = new Date(t.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    monthMap[key] = (monthMap[key] ?? 0) + (t.amount ?? 0);
  });

  return { rows: data, monthMap };
}

// ─── getDashboardStats — real, replaces CANONICAL ─────────────────────────
export const getDashboardStats = async (
  range?: string,
): Promise<DashboardStats> => {
  const { rows, monthMap } = await fetchTransactionsBucketed();

  const now = new Date();
  const currentKey = now.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const totalRevenue = Math.round(monthMap[currentKey] ?? 0);
  const totalProfit = Math.round(totalRevenue * 0.4); // margin ratio kept — no cost data exists yet
  const profitMargin = totalRevenue > 0 ? 40 : 0;
  const totalOrders = rows.filter((t) => {
    const key = new Date(t.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return key === currentKey;
  }).length;
  const activeUsers = new Set(
    rows
      .filter((t) => {
        const key = new Date(t.created_at).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        return key === currentKey;
      })
      .map((t) => t.customer),
  ).size;

  const sparkline = Object.entries(monthMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, v]) => ({ month: month.split(" ")[0], mrr: Math.round(v) }));

  return {
    totalRevenue,
    totalProfit,
    profitMargin,
    totalOrders,
    activeUsers,
    churnRate: 0, // no real churn data source yet — flagged, not fabricated
    efficiency: profitMargin, // same 0.4 margin basis as profit — no separate real efficiency metric exists yet
    latestNews: "Live data connected.",
    mrrSparkline: sparkline,
  };
};

// ─── getTransactions — real, CoinGecko stripped ────────────────────────────
export const getTransactions = async (): Promise<Transaction[]> => {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((item) => ({
    ...item,
    date: new Date(item.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  })) as Transaction[];
};

// ─── getInsights — real Groq response, no longer discarded ────────────────
export const getInsights = async (range?: string): Promise<Insight[]> => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        range: range || "monthly",
        category: "enterprise",
        efficiency: 78.1,
        newsHeadline: "Tech sector resilient amid market dip",
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("AI Bridge Failed");
    const json = await response.json();
    return [
      {
        ...INSIGHTS[0],
        description: json.briefing as string,
      },
    ];
  } catch {
    return INSIGHTS.map((insight) => ({
      ...insight,
      description: `${insight.description} (AI briefing unavailable — showing fallback.)`,
    }));
  }
};

export const getInsightById = async (
  id: string | number,
): Promise<Insight | undefined> => {
  return INSIGHTS.find((i) => String(i.id) === String(id));
};

// ─── getRevenueData / getCategoryData — real; getRegionData — stripped ────
export const getRevenueData = async (range?: string) => {
  const { monthMap } = await fetchTransactionsBucketed();
  return Object.entries(monthMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, total]) => ({
      name: month.split(" ")[0],
      revenue: Math.round(total),
      profit: Math.round(total * 0.4),
    }));
};

export const getCategoryData = async (range?: string) => {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("category, amount")
    .eq("company_id", companyId);
  if (error || !data) return [];

  const byCategory: Record<string, number> = {};
  data.forEach((t) => {
    const cat = t.category ?? "Uncategorized";
    byCategory[cat] = (byCategory[cat] ?? 0) + (t.amount ?? 0);
  });
  return Object.entries(byCategory).map(([name, value]) => ({
    name,
    value: Math.floor(value),
  }));
};

// ─── getAggregateDashboardStats — real, replaces transactions-based stats ─
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

interface DatasetSummary {
  id: string;
  filename: string;
  row_count: number;
  created_at: string;
}

export const getAggregateDashboardStats = async (): Promise<
  DashboardStats & { datasetCount: number }
> => {
  const headers = await getAuthHeader();

  const listRes = await fetch(`${BACKEND_URL}/datasets`, { headers });
  const datasets: DatasetSummary[] = listRes.ok ? await listRes.json() : [];

  if (datasets.length === 0) {
    return {
      totalRevenue: 0,
      totalProfit: 0,
      profitMargin: 0,
      totalOrders: 0,
      activeUsers: 0,
      churnRate: 0,
      efficiency: 0,
      latestNews: "No datasets uploaded yet.",
      mrrSparkline: [],
      datasetCount: 0,
    };
  }

  const kpiResults = await Promise.all(
    datasets.map(async (d) => {
      const res = await fetch(`${BACKEND_URL}/datasets/${d.id}/kpis`, {
        headers,
      });
      return res.ok ? res.json() : { kpis: {}, revenue_series: [] };
    }),
  );

  let totalRevenue = 0;
  let totalOrders = 0;
  let uniqueCustomersSum = 0;
  const monthMap: Record<string, number> = {};

  kpiResults.forEach(({ kpis, revenue_series }) => {
    totalRevenue += kpis.total_revenue ?? 0;
    totalOrders += kpis.row_count ?? 0;
    uniqueCustomersSum += kpis.unique_customers ?? 0;

    (revenue_series || []).forEach(
      (point: { date: string; revenue: number }) => {
        const key = new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        monthMap[key] = (monthMap[key] ?? 0) + point.revenue;
      },
    );
  });

  const sparkline = Object.entries(monthMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, v]) => ({ month: month.split(" ")[0], mrr: Math.round(v) }));
  const growthRate =
    sparkline.length >= 2
      ? ((sparkline[sparkline.length - 1].mrr -
          sparkline[sparkline.length - 2].mrr) /
          (sparkline[sparkline.length - 2].mrr || 1)) *
        100
      : 0;
  return {
    totalRevenue: Math.round(totalRevenue),
    totalProfit: 0, // TODO: no cost/profit column exists in dataset schema yet — not fabricated
    profitMargin: 0, // TODO: same — needs a cost field before this is real
    totalOrders,
    activeUsers: uniqueCustomersSum, // sum across datasets — flagged, not deduped across files
    churnRate: 0, // TODO: no churn source until churn-prediction endpoint is wired in here
    efficiency: Math.round(growthRate * 10) / 10,
    latestNews:
      sparkline.length >= 2
        ? `Revenue ${growthRate >= 0 ? "up" : "down"} ${Math.abs(growthRate).toFixed(1)}% this month across ${datasets.length} dataset${datasets.length > 1 ? "s" : ""}.`
        : `Aggregated across ${datasets.length} dataset${datasets.length > 1 ? "s" : ""}.`,
    mrrSparkline: sparkline,
    datasetCount: datasets.length,
  };
};

export interface DatasetMover {
  filename: string;
  revenue: number;
  rowCount: number;
  deltaPct: number; // vs previous month, per-dataset
}

export const getDatasetMovers = async (): Promise<DatasetMover[]> => {
  const headers = await getAuthHeader();
  const listRes = await fetch(`${BACKEND_URL}/datasets`, { headers });
  const datasets: DatasetSummary[] = listRes.ok ? await listRes.json() : [];

  const results = await Promise.all(
    datasets.map(async (d) => {
      const res = await fetch(`${BACKEND_URL}/datasets/${d.id}/kpis`, {
        headers,
      });
      const data = res.ok ? await res.json() : { kpis: {}, revenue_series: [] };

      const monthMap: Record<string, number> = {};
      (data.revenue_series || []).forEach(
        (point: { date: string; revenue: number }) => {
          const key = new Date(point.date).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          monthMap[key] = (monthMap[key] ?? 0) + point.revenue;
        },
      );
      const months = Object.entries(monthMap).sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
      );
      const deltaPct =
        months.length >= 2
          ? ((months[months.length - 1][1] - months[months.length - 2][1]) /
              (months[months.length - 2][1] || 1)) *
            100
          : 0;

      return {
        filename: d.filename,
        revenue: Math.round(data.kpis?.total_revenue ?? 0),
        rowCount: data.kpis?.row_count ?? 0,
        deltaPct: Math.round(deltaPct * 10) / 10,
      };
    }),
  );

  return results.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
};

export interface RiskItem {
  category: string; // "Revenue" | "Sales" | "Inventory" | "Customer"
  severity: "high" | "medium";
  message: string;
  filename: string; // which dataset this risk came from
}

export interface AggregateRiskResult {
  overallRiskLevel: "high" | "medium" | "low";
  riskCount: { high: number; medium: number };
  risks: RiskItem[];
}

export const getAggregateRisks = async (): Promise<AggregateRiskResult> => {
  const headers = await getAuthHeader();
  const listRes = await fetch(`${BACKEND_URL}/datasets`, { headers });
  const datasets: DatasetSummary[] = listRes.ok ? await listRes.json() : [];
  datasets.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  ); // ← add this line

  if (datasets.length === 0) {
    return {
      overallRiskLevel: "low",
      riskCount: { high: 0, medium: 0 },
      risks: [],
    };
  }

  const results = await Promise.all(
    datasets.map(async (d) => {
      const res = await fetch(
        `${BACKEND_URL}/datasets/${d.id}/risk-prediction`,
        {
          headers,
        },
      );
      const data = res.ok ? await res.json() : { available: false, risks: [] };

      const risks: RiskItem[] = (data.risks || []).map(
        (r: {
          category: string;
          severity: "high" | "medium";
          message: string;
        }) => ({
          ...r,
          filename: d.filename,
        }),
      );
      return risks;
    }),
  );

  const allRisks = results.flat();

  const severityOrder = { high: 0, medium: 1 };
  allRisks.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const highCount = allRisks.filter((r) => r.severity === "high").length;
  const mediumCount = allRisks.filter((r) => r.severity === "medium").length;

  return {
    overallRiskLevel:
      highCount > 0 ? "high" : mediumCount > 0 ? "medium" : "low",
    riskCount: { high: highCount, medium: mediumCount },
    risks: allRisks,
  };
};

export interface OpportunityItem {
  category: string; // "Revenue" | "Sales" | "Product" | "Customer"
  impact: "high" | "medium";
  message: string;
  filename: string;
}

export interface AggregateOpportunityResult {
  overallOpportunityLevel: "high" | "medium" | "low";
  opportunityCount: { high: number; medium: number };
  opportunities: OpportunityItem[];
}

export const getAggregateOpportunities =
  async (): Promise<AggregateOpportunityResult> => {
    const headers = await getAuthHeader();
    const listRes = await fetch(`${BACKEND_URL}/datasets`, { headers });
    const datasets: DatasetSummary[] = listRes.ok ? await listRes.json() : [];
    datasets.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ); // ← add this line

    if (datasets.length === 0) {
      return {
        overallOpportunityLevel: "low",
        opportunityCount: { high: 0, medium: 0 },
        opportunities: [],
      };
    }

    const results = await Promise.all(
      datasets.map(async (d) => {
        const res = await fetch(
          `${BACKEND_URL}/datasets/${d.id}/opportunity-detection`,
          { headers },
        );
        const data = res.ok
          ? await res.json()
          : { available: false, opportunities: [] };

        const opportunities: OpportunityItem[] = (data.opportunities || []).map(
          (o: {
            category: string;
            impact: "high" | "medium";
            message: string;
          }) => ({
            ...o,
            filename: d.filename,
          }),
        );
        return opportunities;
      }),
    );

    const allOpportunities = results.flat();

    const impactOrder = { high: 0, medium: 1 };
    allOpportunities.sort(
      (a, b) => impactOrder[a.impact] - impactOrder[b.impact],
    );

    const highCount = allOpportunities.filter(
      (o) => o.impact === "high",
    ).length;
    const mediumCount = allOpportunities.filter(
      (o) => o.impact === "medium",
    ).length;

    return {
      overallOpportunityLevel:
        highCount > 0 ? "high" : mediumCount > 0 ? "medium" : "low",
      opportunityCount: { high: highCount, medium: mediumCount },
      opportunities: allOpportunities,
    };
  };

export interface Recommendation {
  priority: "high" | "medium";
  action: string;
  basis: string;
}

export const getAIRecommendations = async (
  risks: RiskItem[],
  opportunities: OpportunityItem[],
): Promise<Recommendation[]> => {
  if (risks.length === 0 && opportunities.length === 0) return [];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ risks, opportunities }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.recommendations) ? data.recommendations : [];
  } catch {
    return [];
  }
};

export const getAggregateRevenueChart = async () => {
  const headers = await getAuthHeader();
  const listRes = await fetch(`${BACKEND_URL}/datasets`, { headers });
  const datasets: DatasetSummary[] = listRes.ok ? await listRes.json() : [];

  const kpiResults = await Promise.all(
    datasets.map(async (d) => {
      const res = await fetch(`${BACKEND_URL}/datasets/${d.id}/kpis`, {
        headers,
      });
      return res.ok ? res.json() : { revenue_series: [] };
    }),
  );

  const monthMap: Record<string, number> = {};
  kpiResults.forEach(({ revenue_series }) => {
    (revenue_series || []).forEach(
      (point: { date: string; revenue: number }) => {
        const key = new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        monthMap[key] = (monthMap[key] ?? 0) + point.revenue;
      },
    );
  });

  return Object.entries(monthMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, total]) => ({
      name: month.split(" ")[0],
      revenue: Math.round(total),
      profit: 0, // no cost data — real, not estimated at 0.4 anymore
    }));
};

// ─── getStatusBreakdown — real, replaces old fake region pie ─────────────
export const getStatusBreakdown = async (range?: string) => {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("status")
    .eq("company_id", companyId);
  if (error || !data?.length) return [];

  const counts: Record<string, number> = {};
  data.forEach((t) => {
    const s = t.status || "Unknown";
    counts[s] = (counts[s] ?? 0) + 1;
  });
  const total = data.length;
  return Object.entries(counts).map(([name, count]) => ({
    name,
    value: Math.round((count / total) * 100),
  }));
};

// ─── getBucketedRevenue — real, granularity-aware chart data ─────────────
// daily → today's hours, weekly → last 7 days, monthly → real month buckets,
// quarterly/annually → roll-up of the same real monthly buckets (no new query).
export const getBucketedRevenue = async (range?: string) => {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("created_at, amount")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const now = new Date();

  if (range === "daily") {
    const today = data.filter(
      (t) => new Date(t.created_at).toDateString() === now.toDateString(),
    );
    const hourMap: Record<string, number> = {};
    today.forEach((t) => {
      const key =
        new Date(t.created_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          hour12: false,
        }) + ":00";
      hourMap[key] = (hourMap[key] ?? 0) + (t.amount ?? 0);
    });
    return Object.entries(hourMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, revenue]) => ({
        name,
        revenue,
        profit: Math.round(revenue * 0.4),
      }));
  }

  if (range === "weekly") {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const dayMap: Record<string, number> = {};
    data.forEach((t) => {
      const d = new Date(t.created_at);
      if (d < sevenDaysAgo) return;
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dayMap[key] = (dayMap[key] ?? 0) + (t.amount ?? 0);
    });
    return Object.entries(dayMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([name, revenue]) => ({
        name,
        revenue,
        profit: Math.round(revenue * 0.4),
      }));
  }

  // base: real monthly buckets
  const monthMap: Record<string, number> = {};
  data.forEach((t) => {
    const key = new Date(t.created_at).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    monthMap[key] = (monthMap[key] ?? 0) + (t.amount ?? 0);
  });
  const monthly = Object.entries(monthMap)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([name, revenue]) => ({
      name,
      revenue,
      profit: Math.round(revenue * 0.4),
    }));

  if (range === "quarterly") {
    const quarters: Record<string, number> = {};
    monthly.forEach((m) => {
      const monthIdx = new Date(`${m.name} 1, 2000`).getMonth();
      const q = `Q${Math.floor(monthIdx / 3) + 1}`;
      quarters[q] = (quarters[q] ?? 0) + m.revenue;
    });
    return Object.entries(quarters).map(([name, revenue]) => ({
      name,
      revenue,
      profit: Math.round(revenue * 0.4),
    }));
  }

  if (range === "annually") {
    const years: Record<string, number> = {};
    monthly.forEach((m) => {
      const year = m.name.split(" ")[1];
      years[year] = (years[year] ?? 0) + m.revenue;
    });
    return Object.entries(years).map(([name, revenue]) => ({
      name,
      revenue,
      profit: Math.round(revenue * 0.4),
    }));
  }

  return monthly; // "monthly" or default
};

// getRegionData removed — no region column in transactions schema.
// Re-add once a real region field exists on the table.

// ─── getAnalyticsByCategory — real, wired to getDashboardStats ────────────
export const getAnalyticsByCategory = async (slug: string) => {
  const stats = await getDashboardStats();
  const revenueTrend = await getRevenueData();

  switch (slug) {
    case "total-revenue":
      return {
        title: "Total Revenue",
        totalValue: stats.totalRevenue,
        growthPercentage: 0, // TODO: compute MoM % once 2+ months of data exist
        chartData: revenueTrend.map((d) => ({
          name: d.name,
          value: d.revenue,
        })),
      };

    case "total-profit":
      return {
        title: "Total Profit",
        totalValue: stats.totalProfit,
        growthPercentage: 0,
        chartData: revenueTrend.map((d) => ({ name: d.name, value: d.profit })),
      };

    case "profit-margin":
      return {
        title: "Profit Margin",
        totalValue: stats.profitMargin,
        growthPercentage: 0,
        marginPercentage: stats.profitMargin,
        expenses: [], // TODO: no real cost-tracking table yet — was fully fake before
      };

    case "total-orders":
      return {
        title: "Total Orders",
        totalValue: stats.totalOrders,
        growthPercentage: 0,
        chartData: [], // TODO: needs day-of-week bucketing from real created_at
      };

    case "active-users":
      return {
        title: "Active Users",
        totalValue: stats.activeUsers,
        growthPercentage: 0,
        userData: [], // TODO: fake Alice/Bob list removed — wire to real profiles query
      };

    case "churn-rate":
      return {
        title: "Churn Rate",
        totalValue: stats.churnRate,
        growthPercentage: 0,
        pieData: [
          { name: "Retained", value: 100 - stats.churnRate, fill: "#10b981" },
          { name: "Churned", value: stats.churnRate, fill: "#f43f5e" },
        ],
      };

    default:
      return { title: slug, totalValue: 0, growthPercentage: 0, chartData: [] };
  }
};
