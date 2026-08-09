import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface SourceHealth {
  id: string;
  status: "connected" | "error";
  latencyMs: number;
  recordCount: number | null;
  message: string;
  checkedAt: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{
  ms: number;
  ok: boolean;
  result: T | null;
  error: string | null;
}> {
  const start = Date.now();
  try {
    const result = await fn();
    return { ms: Date.now() - start, ok: true, result, error: null };
  } catch (e: any) {
    logger.warn("data source health check failed", { error: e.message });
    return {
      ms: Date.now() - start,
      ok: false,
      result: null,
      error: e?.message ?? "Unknown error",
    };
  }
}

async function pingSupabase(): Promise<SourceHealth> {
  const { ms, ok, result, error } = await timed(async () => {
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count;
  });
  return {
    id: "supabase",
    status: ok ? "connected" : "error",
    latencyMs: ms,
    recordCount: ok ? (result as number | null) : null,
    message: ok
      ? `${result ?? 0} records verified`
      : (error ?? "Connection failed"),
    checkedAt: new Date().toISOString(),
  };
}

async function pingGroq(): Promise<SourceHealth> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      id: "groq",
      status: "error",
      latencyMs: 0,
      recordCount: null,
      message: "GROQ_API_KEY not set",
      checkedAt: new Date().toISOString(),
    };
  }
  const { ms, ok, error } = await timed(async () => {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
  return {
    id: "groq",
    status: ok ? "connected" : "error",
    latencyMs: ms,
    recordCount: null,
    message: ok ? "Model list reachable" : (error ?? "Connection failed"),
    checkedAt: new Date().toISOString(),
  };
}

async function pingAlphaVantage(): Promise<SourceHealth> {
  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key) {
    return {
      id: "alphavantage",
      status: "error",
      latencyMs: 0,
      recordCount: null,
      message: "ALPHA_VANTAGE_KEY not set",
      checkedAt: new Date().toISOString(),
    };
  }
  const { ms, ok, result, error } = await timed(async () => {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${key}`,
    );
    const json = await res.json();
    if (json?.Note || json?.Information) throw new Error("Rate limit hit");
    if (!json?.["Global Quote"]?.["05. price"])
      throw new Error("No quote returned");
    return json["Global Quote"]["05. price"] as string;
  });
  return {
    id: "alphavantage",
    status: ok ? "connected" : "error",
    latencyMs: ms,
    recordCount: null,
    message: ok ? `SPY quote $${result}` : (error ?? "Connection failed"),
    checkedAt: new Date().toISOString(),
  };
}

async function pingNewsApi(): Promise<SourceHealth> {
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    return {
      id: "newsapi",
      status: "error",
      latencyMs: 0,
      recordCount: null,
      message: "NEWS_API_KEY not set",
      checkedAt: new Date().toISOString(),
    };
  }
  const { ms, ok, result, error } = await timed(async () => {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&pageSize=1&apiKey=${key}`,
    );
    const json = await res.json();
    if (json.status !== "ok") throw new Error(json.message ?? "NewsAPI error");
    return json.totalResults as number;
  });
  return {
    id: "newsapi",
    status: ok ? "connected" : "error",
    latencyMs: ms,
    recordCount: ok ? result : null,
    message: ok
      ? `${result} headlines available`
      : (error ?? "Connection failed"),
    checkedAt: new Date().toISOString(),
  };
}

// 20s cache — AlphaVantage free tier is 25 calls/day, NewsAPI free tier is 100/day.
// Client does NOT auto-poll; this only guards against rapid manual double-clicks.
let cache: { data: SourceHealth[]; ts: number } | null = null;
const CACHE_TTL = 20_000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ sources: cache.data, cached: true });
  }

  const sources = await Promise.all([
    pingSupabase(),
    pingGroq(),
    pingAlphaVantage(),
    pingNewsApi(),
  ]);
  cache = { data: sources, ts: Date.now() };
  return NextResponse.json({ sources, cached: false });
}
