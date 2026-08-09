import { NextResponse } from "next/server";
import { getRevenueData } from "@/lib/data";
import { logger } from "@/lib/logger";

export interface MetricData {
  current: number;
  previous: number;
  trendPercent: number;
  alert: {
    triggered: boolean;
    message: string;
    severity: "low" | "medium" | "high";
  } | null;
  aiInsight: string;
  lastUpdated: string;
  source: "live" | "unavailable";
}

export interface RealTimeData {
  revenue: MetricData;
  operationalEfficiency: MetricData;
  marketTrends: MetricData & { symbol: string; newsHeadline: string };
  timestamp: string;
}

let cache: { data: RealTimeData; ts: number } | null = null;
const CACHE_TTL = 60 * 1000;

async function fetchMarketData(
  symbol: string,
): Promise<{ price: number; prevClose: number } | null> {
  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`,
      { next: { revalidate: 60 } },
    );
    const json = await res.json();
    const quote = json["Global Quote"];
    if (!quote || !quote["05. price"]) return null;
    return {
      price: parseFloat(quote["05. price"]),
      prevClose: parseFloat(quote["08. previous close"]),
    };
  } catch {
    return null;
  }
}

async function fetchNewsHeadline(): Promise<string> {
  const key = process.env.NEWS_API_KEY;
  if (!key) return "News feed unavailable — NEWS_API_KEY not set.";
  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&pageSize=1&apiKey=${key}`,
      { next: { revalidate: 300 } },
    );
    const json = await res.json();
    return json?.articles?.[0]?.title ?? "No headline available.";
  } catch {
    return "News feed temporarily unavailable.";
  }
}

async function getAIInsight(
  metric: string,
  value: number,
  trend: number,
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key)
    return `${metric} at ${value} with ${trend > 0 ? "+" : ""}${trend.toFixed(1)}% trend.`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a business intelligence analyst. Give a 1-2 sentence actionable insight. Be specific and concise.",
          },
          {
            role: "user",
            content: `${metric}: current value ${value}, trend ${trend > 0 ? "+" : ""}${trend.toFixed(1)}%. Give insight.`,
          },
        ],
        max_tokens: 80,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    return (
      data?.choices?.[0]?.message?.content ??
      `${metric} trending ${trend > 0 ? "positively" : "negatively"} at ${Math.abs(trend).toFixed(1)}%.`
    );
  } catch {
    return `${metric} at ${value} with ${trend > 0 ? "+" : ""}${trend.toFixed(1)}% trend.`;
  }
}

const checkAlert = (
  value: number,
  prev: number,
  trend: number,
  type: string,
) => {
  if (type === "revenue" && trend < -5)
    return {
      triggered: true,
      message: "Revenue dropped >5% vs last period",
      severity: "high" as const,
    };
  if (type === "revenue" && trend > 15)
    return {
      triggered: true,
      message: "Revenue surge — verify data integrity",
      severity: "medium" as const,
    };
  if (type === "efficiency" && value < 30)
    return {
      triggered: true,
      message: "Efficiency below 30% threshold",
      severity: "high" as const,
    };
  if (type === "market" && Math.abs(trend) > 8)
    return {
      triggered: true,
      message: `Market moving ${trend > 0 ? "up" : "down"} ${Math.abs(trend).toFixed(1)}% unusually fast`,
      severity: "medium" as const,
    };
  return null;
};

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ...cache.data, _cached: true });
  }

  try {
    const monthly = await getRevenueData();
    const currentM = monthly[monthly.length - 1];
    const prevM = monthly[monthly.length - 2];

    const currentRevenue = currentM?.revenue ?? 0;
    const previousRevenue = prevM?.revenue ?? 0;
    const revTrend =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
    const revInsight = await getAIInsight("Revenue", currentRevenue, revTrend);

    // Efficiency: same flat profit/revenue estimate used elsewhere in the app —
    // no real cost-tracking table exists yet. Labeled "(Est.)" in the UI, not
    // randomly jittered like the old mock version.
    const currentEff = currentM
      ? (currentM.profit / Math.max(currentM.revenue, 1)) * 100
      : 0;
    const prevEff = prevM
      ? (prevM.profit / Math.max(prevM.revenue, 1)) * 100
      : 0;
    const effTrend = prevEff > 0 ? ((currentEff - prevEff) / prevEff) * 100 : 0;
    const effInsight = await getAIInsight(
      "Operational Efficiency (Est.)",
      currentEff,
      effTrend,
    );

    const marketLive = await fetchMarketData("SPY");
    const newsHeadline = await fetchNewsHeadline();

    const marketData: RealTimeData["marketTrends"] = marketLive
      ? (() => {
          const mktTrend =
            ((marketLive.price - marketLive.prevClose) / marketLive.prevClose) *
            100;
          return {
            current: marketLive.price,
            previous: marketLive.prevClose,
            trendPercent: Math.round(mktTrend * 100) / 100,
            alert: checkAlert(
              marketLive.price,
              marketLive.prevClose,
              mktTrend,
              "market",
            ),
            aiInsight: "",
            lastUpdated: new Date().toISOString(),
            source: "live" as const,
            symbol: "SPY",
            newsHeadline,
          };
        })()
      : {
          current: 0,
          previous: 0,
          trendPercent: 0,
          alert: null,
          aiInsight:
            "Market data unavailable — check ALPHA_VANTAGE_KEY or rate limit.",
          lastUpdated: new Date().toISOString(),
          source: "unavailable" as const,
          symbol: "SPY",
          newsHeadline,
        };

    if (marketLive) {
      marketData.aiInsight = await getAIInsight(
        "S&P 500 (SPY)",
        marketData.current,
        marketData.trendPercent,
      );
    }

    const result: RealTimeData = {
      revenue: {
        current: Math.round(currentRevenue),
        previous: Math.round(previousRevenue),
        trendPercent: Math.round(revTrend * 10) / 10,
        alert: checkAlert(currentRevenue, previousRevenue, revTrend, "revenue"),
        aiInsight: revInsight,
        lastUpdated: new Date().toISOString(),
        source: monthly.length > 0 ? "live" : "unavailable",
      },
      operationalEfficiency: {
        current: Math.round(currentEff * 10) / 10,
        previous: Math.round(prevEff * 10) / 10,
        trendPercent: Math.round(effTrend * 10) / 10,
        alert: checkAlert(currentEff, prevEff, effTrend, "efficiency"),
        aiInsight: effInsight,
        lastUpdated: new Date().toISOString(),
        source: monthly.length > 0 ? "live" : "unavailable",
      },
      marketTrends: marketData,
      timestamp: new Date().toISOString(),
    };

    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("realtime-data route failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: "Failed to fetch real-time data" },
      { status: 500 },
    );
  }
}
