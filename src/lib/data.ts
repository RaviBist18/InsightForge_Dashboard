import { supabase } from './supabase';
import { TRANSACTIONS, INSIGHTS, Transaction, Insight, REVENUE_DATA, CATEGORY_DATA, REGION_DATA } from '@/data/mockData';

/**
 * DATA ACCESS LAYER (DAL)
 * -----------------------
 * This layer abstracts the data fetching logic from the UI components.
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getMultiplier = (range?: string) => {
  if (range === '7d') return 0.25;
  if (range === '90d') return 3;
  return 1; // default to 30d
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
    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }
    const data = await response.json();

    const limit = Math.max(5, Math.floor((data?.length || 0) * m));

    return (data || []).map((coin: any) => ({
      id: coin.id,
      date: new Date(coin.last_updated || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      customer: coin.name,
      category: 'Crypto',
      region: 'Global',
      amount: coin.current_price,
      status: coin.price_change_percentage_24h > 0 ? 'Completed' : 'Pending'
    })).slice(0, limit) as unknown as Transaction[];

  } catch (err) {

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {

        return [];
      }

      const limit = Math.max(5, Math.floor((data?.length || 0) * m));

      return (data || []).map(item => ({
        ...item,
        date: new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      })).slice(0, limit) as Transaction[];
    } catch (supabaseErr) {
      return [];
    }
  }
};

export const getInsights = async (range?: string): Promise<Insight[]> => {
  await delay(300);
  return INSIGHTS;
};

export const getInsightById = async (id: string | number): Promise<Insight | undefined> => {
  await delay(200);
  return INSIGHTS.find(i => String(i.id) === String(id));
};

export const getRevenueData = async (range?: string) => {
  await delay(400);
  const m = getMultiplier(range);
  return REVENUE_DATA.map(d => ({
    ...d,
    revenue: d.revenue * m,
    profit: d.profit * m
  }));
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

export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  activeUsers: number;
  churnRate: number;
}

export const getDashboardStats = async (range?: string): Promise<DashboardStats> => {
  await delay(600);
  const m = getMultiplier(range);

  const baseRevenue = TRANSACTIONS.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = baseRevenue * m;
  const totalProfit = totalRevenue * 0.186;
  const totalOrders = Math.floor(TRANSACTIONS.length * m);

  return {
    totalRevenue,
    totalProfit,
    profitMargin: 18.6,
    totalOrders,
    activeUsers: Math.floor(12500 * m),
    churnRate: range === '90d' ? 2.4 : range === '7d' ? 0.8 : 1.2
  };
};

export const getAnalyticsByCategory = async (slug: string) => {
  await delay(400);
  const safeSlug = slug || 'category';
  const title = safeSlug.charAt(0).toUpperCase() + safeSlug.slice(1).replace('-', ' ');

  switch (safeSlug) {
    case 'active-users':
      return {
        title,
        totalValue: 12500,
        growthPercentage: 5.4,
        userData: [
          { id: 1, name: 'Alice Smith', email: 'alice@example.com', status: 'Active', joinDate: '2024-01-15' },
          { id: 2, name: 'Bob Jones', email: 'bob@example.com', status: 'Active', joinDate: '2024-02-10' },
          { id: 3, name: 'Charlie Davis', email: 'charlie@example.com', status: 'Inactive', joinDate: '2024-02-28' },
          { id: 4, name: 'Diana Prince', email: 'diana@example.com', status: 'Active', joinDate: '2024-03-05' },
          { id: 5, name: 'Evan Wright', email: 'evan@example.com', status: 'Active', joinDate: '2024-03-20' },
        ]
      };

    case 'profit-margin':
      return {
        title,
        totalValue: 18.6,
        growthPercentage: -2.1,
        marginPercentage: 18.6,
        expenses: [
          { category: 'Infrastructure', amount: 45000, percentage: 45 },
          { category: 'Marketing', amount: 25000, percentage: 25 },
          { category: 'Salaries', amount: 20000, percentage: 20 },
          { category: 'Software Tools', amount: 10000, percentage: 10 },
        ]
      };

    case 'total-orders':
      return {
        title,
        totalValue: 3450,
        growthPercentage: 14.7,
        chartData: [
          { name: 'Mon', value: 120 },
          { name: 'Tue', value: 150 },
          { name: 'Wed', value: 180 },
          { name: 'Thu', value: 220 },
          { name: 'Fri', value: 250 },
          { name: 'Sat', value: 300 },
          { name: 'Sun', value: 280 },
        ]
      };

    case 'churn-rate':
      return {
        title,
        totalValue: 1.2,
        growthPercentage: -0.3,
        pieData: [
          { name: 'Retained', value: 98.8, fill: '#10b981' },
          { name: 'Churned', value: 1.2, fill: '#f43f5e' }
        ]
      };

    case 'total-revenue':
      return {
        title: 'Total Revenue',
        totalValue: 45000,
        growthPercentage: 12.5,
        chartData: [
          { name: 'Jan', value: 36000 },
          { name: 'Feb', value: 38000 },
          { name: 'Mar', value: 41000 },
          { name: 'Apr', value: 39000 },
          { name: 'May', value: 43000 },
          { name: 'Jun', value: 45000 },
        ]
      };

    case 'total-profit':
      return {
        title: 'Total Profit',
        totalValue: 8370,
        growthPercentage: 8.2,
        chartData: [
          { name: 'Jan', value: 6500 },
          { name: 'Feb', value: 7100 },
          { name: 'Mar', value: 6800 },
          { name: 'Apr', value: 7400 },
          { name: 'May', value: 7900 },
          { name: 'Jun', value: 8370 },
        ]
      };

    default:
      const baseValue = (safeSlug.length * 1234) % 50000 + 10000;
      return {
        title,
        totalValue: baseValue,
        growthPercentage: (safeSlug.length % 15) + 2.5,
        chartData: [
          { name: 'Jan', value: baseValue * 0.8 },
          { name: 'Feb', value: baseValue * 1.1 },
          { name: 'Mar', value: baseValue * 0.9 },
          { name: 'Apr', value: baseValue * 1.2 },
          { name: 'May', value: baseValue * 1.5 },
          { name: 'Jun', value: baseValue * 1.3 },
        ]
      };
  }
};