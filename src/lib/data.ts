import { supabase } from './supabase';
import { TRANSACTIONS, INSIGHTS, Transaction, Insight, REVENUE_DATA, CATEGORY_DATA, REGION_DATA } from '@/data/mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getMultiplier = (range?: string) => {
  if (range === '7d') return 0.25;
  if (range === '90d') return 3;
  return 1;
};

export const getTransactions = async (range?: string): Promise<Transaction[]> => {
  const internalMultiplier = (r?: string) => {
    if (r === '7d') return 0.2;
    if (r === '30d') return 0.5;
    return 1;
  };
  const m = internalMultiplier(range);

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1');
    if (!response.ok) throw new Error(`CoinGecko API returned ${response.status}`);
    const data = await response.json();
    const limit = Math.max(5, Math.floor((data?.length || 0) * m));
    return (data || []).map((coin: { id: string; name: string; last_updated: string; current_price: number; price_change_percentage_24h: number }) => ({
      id: coin.id,
      date: new Date(coin.last_updated || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customer: coin.name,
      category: 'Crypto',
      region: 'Global',
      amount: coin.current_price,
      status: coin.price_change_percentage_24h > 0 ? 'Completed' : 'Pending',
    })).slice(0, limit) as unknown as Transaction[];
  } catch {
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (error) return [];
      const limit = Math.max(5, Math.floor((data?.length || 0) * m));
      return (data || []).map(item => ({
        ...item,
        date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      })).slice(0, limit) as Transaction[];
    } catch {
      return [];
    }
  }
};

export const getInsights = async (range?: string): Promise<Insight[]> => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/briefing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: range || 'monthly', category: 'enterprise', efficiency: 78.1, newsHeadline: 'Tech sector resilient amid market dip' }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('AI Bridge Failed');
    return [
      { id: 1, title: 'Market Dominance', description: 'Briefing: Revenue growth of 19.7% outpaces sector volatility. Margin Impact: +4.2%. Executive Action: Squeeze Pro tier upgrades.', priority: 'high', type: 'trend' },
      { id: 2, title: 'Toxic Growth Alert', description: 'Briefing: Revenue is up but efficiency at 78.1% indicates a margin leak. Margin Impact: -1.7%. Executive Action: Audit Vercel burn.', priority: 'critical', type: 'anomaly' },
      { id: 3, title: 'Counter-Cyclical Strategy', description: 'Briefing: Tech resilience detected while SPY dips. Margin Impact: +2.4%. Executive Action: Squeeze B2B budgets.', priority: 'medium', type: 'highlight' },
    ];
  } catch {
    return INSIGHTS.map(insight => ({ ...insight, description: `Briefing: ${insight.description} Margin Impact: Neutral. Executive Action: Review internal data.` }));
  }
};

export const getInsightById = async (id: string | number): Promise<Insight | undefined> => {
  await delay(200);
  return INSIGHTS.find(i => String(i.id) === String(id));
};

export const getRevenueData = async (range?: string) => {
  await delay(400);
  const m = getMultiplier(range);
  return REVENUE_DATA.map(d => ({ ...d, revenue: d.revenue * m, profit: d.profit * m }));
};

export const getCategoryData = async (range?: string) => {
  await delay(300);
  const m = getMultiplier(range);
  return CATEGORY_DATA.map(d => ({ ...d, value: Math.floor(d.value * m) }));
};

export const getRegionData = async (range?: string) => {
  await delay(300);
  const m = getMultiplier(range);
  return REGION_DATA.map(d => ({ ...d, value: Math.floor(d.value * m) }));
};

// ─── DashboardStats — canonical shape used by WorkspaceProvider ──────────────

export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  activeUsers: number;
  churnRate: number;
  efficiency: number;
  latestNews: string;
  mrrSparkline?: number[];   // for MoM calc in KPISection
}

// ─── CANONICAL VALUES — single source of truth ────────────────────────────────
// Admin HUD + KPIDetailClient both read from here.
// REV_HIST in KPIDetailClient scales toward these exact April values.

const CANONICAL: DashboardStats = {
  totalRevenue: 1800,
  totalProfit: 720,
  profitMargin: 40,
  totalOrders: 53,
  activeUsers: 37,
  churnRate: 1.8,
  efficiency: 78.5,
  latestNews: 'SaaS sector seeing 5% growth in Enterprise renewals',
  mrrSparkline: [1240, 1380, 1520, 1610, 1680, 1740, 1800],
};

export const getDashboardStats = async (range?: string): Promise<DashboardStats> => {
  await delay(300);

  // Range scaling — keeps relative shape, final value always canonical
  const scale: Record<string, number> = { '7d': 0.25, '30d': 1, '90d': 1, 'monthly': 1, 'quarterly': 1, 'annual': 1 };
  const m = scale[range ?? '30d'] ?? 1;

  if (m === 1) return CANONICAL;

  return {
    ...CANONICAL,
    totalRevenue: Math.round(CANONICAL.totalRevenue * m),
    totalProfit: Math.round(CANONICAL.totalProfit * m),
    totalOrders: Math.round(CANONICAL.totalOrders * m),
    activeUsers: Math.round(CANONICAL.activeUsers * m),
    churnRate: range === '7d' ? 0.8 : CANONICAL.churnRate,
    mrrSparkline: CANONICAL.mrrSparkline?.map(v => Math.round(v * m)),
  };
};

// ─── getAnalyticsByCategory — slug detail data ────────────────────────────────
// totalValue MUST match CANONICAL values — no legacy $45k/$8k mocks.

export const getAnalyticsByCategory = async (slug: string) => {
  await delay(300);

  switch (slug) {
    case 'total-revenue':
      return {
        title: 'Total Revenue',
        totalValue: CANONICAL.totalRevenue,   // $1,800
        growthPercentage: 12.5,
        chartData: [
          { name: 'Oct', value: 1240 },
          { name: 'Nov', value: 1380 },
          { name: 'Dec', value: 1520 },
          { name: 'Jan', value: 1610 },
          { name: 'Feb', value: 1680 },
          { name: 'Mar', value: 1740 },
          { name: 'Apr', value: 1800 },
        ],
      };

    case 'total-profit':
      return {
        title: 'Total Profit',
        totalValue: CANONICAL.totalProfit,    // $720
        growthPercentage: 8.2,
        chartData: [
          { name: 'Oct', value: 496 },
          { name: 'Nov', value: 552 },
          { name: 'Dec', value: 608 },
          { name: 'Jan', value: 644 },
          { name: 'Feb', value: 672 },
          { name: 'Mar', value: 696 },
          { name: 'Apr', value: 720 },
        ],
      };

    case 'profit-margin':
      return {
        title: 'Profit Margin',
        totalValue: CANONICAL.profitMargin,   // 40
        growthPercentage: -2.1,
        marginPercentage: CANONICAL.profitMargin,
        expenses: [
          { category: 'Hosting (Vercel)', amount: 180, percentage: 17 },
          { category: 'Groq API tokens', amount: 240, percentage: 22 },
          { category: 'Alpha Vantage', amount: 60, percentage: 6 },
          { category: 'NewsAPI', amount: 50, percentage: 5 },
          { category: 'Supabase', amount: 45, percentage: 4 },
          { category: 'Other OpEx', amount: 505, percentage: 46 },
        ],
      };

    case 'total-orders':
      return {
        title: 'Total Orders',
        totalValue: CANONICAL.totalOrders,    // 53
        growthPercentage: 14.7,
        chartData: [
          { name: 'Mon', value: 6 },
          { name: 'Tue', value: 8 },
          { name: 'Wed', value: 7 },
          { name: 'Thu', value: 9 },
          { name: 'Fri', value: 11 },
          { name: 'Sat', value: 8 },
          { name: 'Sun', value: 4 },
        ],
      };

    case 'active-users':
      return {
        title: 'Active Users',
        totalValue: CANONICAL.activeUsers,    // 37
        growthPercentage: 5.4,
        userData: [
          { id: 1, name: 'Alice Smith', email: 'alice@example.com', status: 'Active', joinDate: '2026-01-15' },
          { id: 2, name: 'Bob Jones', email: 'bob@example.com', status: 'Active', joinDate: '2026-02-10' },
          { id: 3, name: 'Charlie Davis', email: 'charlie@example.com', status: 'Inactive', joinDate: '2026-02-28' },
          { id: 4, name: 'Diana Prince', email: 'diana@example.com', status: 'Active', joinDate: '2026-03-05' },
          { id: 5, name: 'Evan Wright', email: 'evan@example.com', status: 'Active', joinDate: '2026-03-20' },
        ],
      };

    case 'churn-rate':
      return {
        title: 'Churn Rate',
        totalValue: CANONICAL.churnRate,      // 1.8
        growthPercentage: -0.3,
        pieData: [
          { name: 'Retained', value: 98.2, fill: '#10b981' },
          { name: 'Churned', value: 1.8, fill: '#f43f5e' },
        ],
      };

    default:
      return {
        title: slug,
        totalValue: 0,
        growthPercentage: 0,
        chartData: [],
      };
  }
};