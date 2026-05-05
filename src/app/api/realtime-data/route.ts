import { NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MetricData {
    current: number;
    previous: number;
    trendPercent: number;
    sparkline: number[];
    alert: { triggered: boolean; message: string; severity: 'low' | 'medium' | 'high' } | null;
    aiInsight: string;
    lastUpdated: string;
    source: 'live' | 'cache' | 'mock';
}

export interface RealTimeData {
    revenue: MetricData;
    operationalEfficiency: MetricData;
    marketTrends: MetricData & { symbol: string; newsHeadline: string };
    timestamp: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
let cache: { data: RealTimeData; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

// ─── Mock Data ────────────────────────────────────────────────────────────────
const generateSparkline = (base: number, points = 7, volatility = 0.05) =>
    Array.from({ length: points }, (_, i) =>
        Math.round(base * (1 + (Math.random() - 0.5) * volatility) * 100) / 100
    );

const getMockData = (): RealTimeData => {
    const revenueBase = 45000 + Math.random() * 5000;
    const prevRevenue = 40000 + Math.random() * 4000;
    const effBase = 78 + Math.random() * 10;
    const prevEff = 72 + Math.random() * 8;
    const marketBase = 180 + Math.random() * 20;
    const prevMarket = 170 + Math.random() * 15;

    const revTrend = ((revenueBase - prevRevenue) / prevRevenue) * 100;
    const effTrend = ((effBase - prevEff) / prevEff) * 100;
    const mktTrend = ((marketBase - prevMarket) / prevMarket) * 100;

    return {
        revenue: {
            current: Math.round(revenueBase),
            previous: Math.round(prevRevenue),
            trendPercent: Math.round(revTrend * 10) / 10,
            sparkline: generateSparkline(revenueBase, 7, 0.08),
            alert: revTrend < -5 ? { triggered: true, message: 'Revenue dropped >5% vs last period', severity: 'high' }
                : revTrend > 15 ? { triggered: true, message: 'Revenue surge detected — verify data', severity: 'medium' }
                    : null,
            aiInsight: revTrend > 0
                ? `Revenue growing at ${revTrend.toFixed(1)}%. Strong SaaS and Infrastructure categories driving momentum.`
                : `Revenue declined ${Math.abs(revTrend).toFixed(1)}%. Review EMEA discounting strategy.`,
            lastUpdated: new Date().toISOString(),
            source: 'mock',
        },
        operationalEfficiency: {
            current: Math.round(effBase * 10) / 10,
            previous: Math.round(prevEff * 10) / 10,
            trendPercent: Math.round(effTrend * 10) / 10,
            sparkline: generateSparkline(effBase, 7, 0.04),
            alert: effBase < 70 ? { triggered: true, message: 'Efficiency below 70% threshold', severity: 'high' }
                : effBase > 90 ? { triggered: true, message: 'Efficiency at peak — monitor for sustainability', severity: 'low' }
                    : null,
            aiInsight: effBase > 80
                ? `Operational efficiency at ${effBase.toFixed(1)}% — above industry benchmark of 75%. Infrastructure optimisation paying off.`
                : `Efficiency at ${effBase.toFixed(1)}%. Salaries and infrastructure costs are the biggest drag — review vendor contracts.`,
            lastUpdated: new Date().toISOString(),
            source: 'mock',
        },
        marketTrends: {
            current: Math.round(marketBase * 100) / 100,
            previous: Math.round(prevMarket * 100) / 100,
            trendPercent: Math.round(mktTrend * 10) / 10,
            sparkline: generateSparkline(marketBase, 7, 0.06),
            alert: Math.abs(mktTrend) > 8 ? { triggered: true, message: `Market moving ${mktTrend > 0 ? 'up' : 'down'} ${Math.abs(mktTrend).toFixed(1)}% unusually fast`, severity: 'medium' }
                : null,
            symbol: 'SPY',
            newsHeadline: 'Tech sector shows resilience amid broader market uncertainty',
            aiInsight: mktTrend > 0
                ? `Market trending up ${mktTrend.toFixed(1)}%. Positive sentiment in tech sector aligns with your SaaS revenue growth.`
                : `Market down ${Math.abs(mktTrend).toFixed(1)}%. Monitor customer budgets — B2B SaaS churn may increase in 30 days.`,
            lastUpdated: new Date().toISOString(),
            source: 'mock',
        },
        timestamp: new Date().toISOString(),
    };
};

// ─── Alpha Vantage ────────────────────────────────────────────────────────────
async function fetchMarketData(symbol: string): Promise<{ price: number; prevClose: number } | null> {
    const key = process.env.ALPHA_VANTAGE_KEY;
    if (!key) return null;

    try {
        const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`,
            { next: { revalidate: 60 } }
        );
        const json = await res.json();
        const quote = json['Global Quote'];
        if (!quote || !quote['05. price']) return null;

        return {
            price: parseFloat(quote['05. price']),
            prevClose: parseFloat(quote['08. previous close']),
        };
    } catch {
        return null;
    }
}

// ─── NewsAPI ──────────────────────────────────────────────────────────────────
async function fetchNewsHeadline(): Promise<string> {
    const key = process.env.NEWS_API_KEY;
    if (!key) return 'Tech sector shows resilience amid broader market uncertainty';

    try {
        const res = await fetch(
            `https://newsapi.org/v2/top-headlines?category=business&pageSize=1&apiKey=${key}`,
            { next: { revalidate: 300 } }
        );
        const json = await res.json();
        return json?.articles?.[0]?.title ?? 'Markets steady as investors await economic data';
    } catch {
        return 'Markets steady as investors await economic data';
    }
}

// ─── Groq AI Insight ──────────────────────────────────────────────────────────
async function getAIInsight(metric: string, value: number, trend: number): Promise<string> {
    const key = process.env.GROQ_API_KEY;
    if (!key) return `${metric} at ${value} with ${trend > 0 ? '+' : ''}${trend.toFixed(1)}% trend.`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are a business intelligence analyst. Give a 1-2 sentence actionable insight. Be specific and concise.' },
                    { role: 'user', content: `${metric}: current value ${value}, trend ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%. Give insight.` }
                ],
                max_tokens: 80,
                temperature: 0.7,
            }),
        });
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? `${metric} trending ${trend > 0 ? 'positively' : 'negatively'} at ${Math.abs(trend).toFixed(1)}%.`;
    } catch {
        return `${metric} at ${value} with ${trend > 0 ? '+' : ''}${trend.toFixed(1)}% trend.`;
    }
}

// ─── Alert Checker ────────────────────────────────────────────────────────────
const checkAlert = (value: number, prev: number, trend: number, type: string) => {
    if (type === 'revenue' && trend < -5) return { triggered: true, message: 'Revenue dropped >5% vs last period', severity: 'high' as const };
    if (type === 'revenue' && trend > 15) return { triggered: true, message: 'Revenue surge — verify data integrity', severity: 'medium' as const };
    if (type === 'efficiency' && value < 70) return { triggered: true, message: 'Efficiency below 70% threshold', severity: 'high' as const };
    if (type === 'market' && Math.abs(trend) > 8) return { triggered: true, message: `Market moving ${trend > 0 ? 'up' : 'down'} ${Math.abs(trend).toFixed(1)}% unusually fast`, severity: 'medium' as const };
    return null;
};

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function GET() {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
        return NextResponse.json({ ...cache.data, _cached: true });
    }

    const mock = getMockData();

    try {
        // Try Alpha Vantage for market data
        const marketLive = await fetchMarketData('SPY');
        const newsHeadline = await fetchNewsHeadline();

        let marketData = mock.marketTrends;

        if (marketLive) {
            const mktTrend = ((marketLive.price - marketLive.prevClose) / marketLive.prevClose) * 100;
            const mktAlert = checkAlert(marketLive.price, marketLive.prevClose, mktTrend, 'market');
            const insight = await getAIInsight('S&P 500 (SPY)', marketLive.price, mktTrend);

            marketData = {
                current: marketLive.price,
                previous: marketLive.prevClose,
                trendPercent: Math.round(mktTrend * 100) / 100,
                sparkline: generateSparkline(marketLive.price, 7, 0.02),
                alert: mktAlert,
                aiInsight: insight,
                lastUpdated: new Date().toISOString(),
                source: 'live',
                symbol: 'SPY',
                newsHeadline,
            };
        }

        // Revenue + Efficiency from Supabase mock (real Supabase query can be added here)
        const revTrend = mock.revenue.trendPercent;
        const effTrend = mock.operationalEfficiency.trendPercent;

        const [revInsight, effInsight] = await Promise.all([
            getAIInsight('Revenue', mock.revenue.current, revTrend),
            getAIInsight('Operational Efficiency', mock.operationalEfficiency.current, effTrend),
        ]);

        const result: RealTimeData = {
            revenue: { ...mock.revenue, aiInsight: revInsight },
            operationalEfficiency: { ...mock.operationalEfficiency, aiInsight: effInsight },
            marketTrends: marketData,
            timestamp: new Date().toISOString(),
        };

        cache = { data: result, ts: Date.now() };
        return NextResponse.json(result);

    } catch {
        // Full fallback to mock
        cache = { data: mock, ts: Date.now() };
        return NextResponse.json(mock);
    }
}