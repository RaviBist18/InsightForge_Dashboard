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
  mrrSparkline?: number[];
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

// ─── shared helper — fetch + bucket real transactions by month ───────────
async function fetchTransactionsBucketed() {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, customer, category, amount, status")
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
    .map(([, v]) => Math.round(v));

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
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
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
  const { data, error } = await supabase
    .from("transactions")
    .select("category, amount");
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
// ─── getStatusBreakdown — real, replaces old fake region pie ─────────────
export const getStatusBreakdown = async (range?: string) => {
  const { data, error } = await supabase.from("transactions").select("status");
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
  const { data, error } = await supabase
    .from("transactions")
    .select("created_at, amount")
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
