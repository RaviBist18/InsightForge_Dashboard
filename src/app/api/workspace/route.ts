// src/app/api/workspace/route.ts
// Handles: why-feed, scenario simulation, entity scoring, snapshot sealing
// Optimized for direct database access to bypass cookie sync issues

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

async function groq(
  system: string,
  user: string,
  maxTokens = 512,
): Promise<string> {
  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY_INTERACTIVE!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("GROQ_API_ERROR:", res.status, errText);
    throw new Error(`Groq API failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("GROQ_EMPTY_RESPONSE:", JSON.stringify(data));
    throw new Error("Groq returned no content");
  }
  return content;
}

// ── WHY FEED ──────────────────────────────────────────────────────────────────
async function handleWhyFeed(body: {
  movers: {
    filename: string;
    revenue: number;
    rowCount: number;
    deltaPct: number;
  }[];
  risks?: {
    category: string;
    severity: string;
    message: string;
    filename: string;
    value_pct?: number;
  }[];
  opportunities?: {
    category: string;
    impact: string;
    message: string;
    filename: string;
    value_pct?: number;
  }[];
  mrr: number;
  churn: number;
  persona: string;
}) {
  const { movers, risks = [], opportunities = [], mrr, churn, persona } = body;

  const hasSignal =
    (movers && movers.length > 0) ||
    risks.length > 0 ||
    opportunities.length > 0;

  if (!hasSignal) {
    return NextResponse.json({ feed: [] });
  }

  const system = `You are InsightForge's Strategic Intelligence Engine.
Persona: ${persona}. You explain WHAT'S HAPPENING in the company's data and WHY it matters — trend movement, risks, and opportunities alike — based on real dataset-level activity.
Respond ONLY with a JSON array of objects: [{headline, snippet, impact_type, impact_delta, source}]
- headline: short label naming the dataset/signal (e.g. "Sales dataset revenue up 20%", "Low stock risk detected")
- snippet: 1 sentence explaining the business impact, specific, use real numbers/messages given.
- impact_type: one of "revenue" | "opportunity" | "risk"
- impact_delta: use the numeric value_pct field from the matching risk/opportunity item when present; for revenue movers use their deltaPct value, unmodified; otherwise 0
- source: the dataset filename
No markdown, no extra text. Use whatever real signals are given — revenue movement, risks, or opportunities. If revenue movement is flat/unavailable, lead with risks/opportunities instead. Always return at least 1 item if any signal exists.`;

  const user = `Current total MRR: $${mrr.toLocaleString()}. Churn: ${churn}%.
Dataset revenue movement: ${JSON.stringify(movers.slice(0, 6))}
Detected risks: ${JSON.stringify(risks.slice(0, 6))}
Detected opportunities: ${JSON.stringify(opportunities.slice(0, 6))}
For each risk/opportunity item, copy its value_pct field directly into impact_delta — do not output 0 if value_pct is present.
Explain what's driving the numbers, what's working, what's not — dataset by dataset.`;

  try {
    const raw = await groq(system, user, 800);
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Don't trust the model to copy numbers correctly — match each feed item
    // back to its source signal and inject the real value_pct ourselves.
    const enriched = (Array.isArray(parsed) ? parsed : []).map((item: any) => {
      if (item.impact_type === "revenue") {
        const match = movers.find((m) => m.filename === item.source);
        return { ...item, impact_delta: match ? match.deltaPct : 0 };
      }
      if (item.impact_type === "risk") {
        const match =
          risks.find(
            (r) =>
              r.filename === item.source &&
              item.headline?.toLowerCase().includes(r.category.toLowerCase()),
          ) || risks.find((r) => r.filename === item.source);
        return { ...item, impact_delta: match?.value_pct ?? 0 };
      }
      if (item.impact_type === "opportunity") {
        const match =
          opportunities.find(
            (o) =>
              o.filename === item.source &&
              item.headline?.toLowerCase().includes(o.category.toLowerCase()),
          ) || opportunities.find((o) => o.filename === item.source);
        return { ...item, impact_delta: match?.value_pct ?? 0 };
      }
      return item;
    });

    return NextResponse.json({ feed: enriched });
  } catch (error) {
    console.error("WHY_FEED_ERROR:", error);
    return NextResponse.json({ feed: [] });
  }
}

// ── ENTITY SCORING ────────────────────────────────────────────────────────────
async function handleEntityScore(body: {
  entities: { id: string; name: string; type: string }[];
  marketConditions: Record<string, number>;
}) {
  const { entities, marketConditions } = body;

  const system = `You are InsightForge's Entity Risk Scoring engine.
Given business nodes and current market conditions, calculate a Market Sensitivity Score (0-100) for each entity.
Higher = more vulnerable to global shifts.
Respond ONLY with JSON array: [{id, score, rationale}]
- score: integer 0-100
- rationale: 1 short sentence
No markdown, no extra text.`;

  const user = `Entities: ${JSON.stringify(entities)}
Market conditions: ${JSON.stringify(marketConditions)}
Score each entity.`;

  const raw = await groq(system, user, 600);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json({ scores: parsed });
  } catch {
    return NextResponse.json({ scores: [] });
  }
}

// ── SEAL SNAPSHOT (UPDATED WITH ROBUST LOGGING) ──────────────────────────────
async function handleSealSnapshot(
  body: {
    label: string;
    mrr: number;
    churn: number;
    signups: number;
    marketConditions: Record<string, unknown>;
    persona: string;
  },
  userId: string,
) {
  try {
    if (!userId) throw new Error("userId is missing");

    const supabaseAdmin = getSupabaseAdmin();
    const { label, mrr, churn, signups, marketConditions, persona } = body;

    const system = `You are InsightForge's Strategic Archivist.
Write a concise 2-3 sentence strategic advisory for a CEO sealing this decision moment.
Be direct and specific. No fluff.`;

    const user = `Sealing snapshot: "${label}"
MRR: $${mrr}, Churn: ${churn}%, New Signups: ${signups}
Market: ${JSON.stringify(marketConditions)}
Persona: ${persona}`;

    const aiAdvice = await groq(system, user, 300);

    const payload = JSON.stringify({
      label,
      mrr,
      churn,
      signups,
      marketConditions,
      aiAdvice,
      timestamp: Date.now(),
    });
    const hash = crypto.createHash("sha256").update(payload).digest("hex");
    const { data, error } = await supabaseAdmin
      .from("forensic_snapshots")
      .insert({
        user_id: userId,
        label,
        hash,
        mrr: Number(mrr),
        churn: Number(churn),
        signups: Number(signups),
        market_conditions: marketConditions,
        ai_advice: aiAdvice,
        persona,
      })
      .select()
      .single();

    if (error) {
      console.error("SNAPSHOT_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snapshot: data });
  } catch (err: any) {
    logger.error("workspace snapshot failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

// ── DELETE SNAPSHOTS ──────────────────────────────────────────────────────────
async function handleDeleteSnapshots(body: { ids: string[] }, userId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("forensic_snapshots")
      .delete()
      .in("id", ids)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      console.error("SNAPSHOT_DELETE_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deletedIds: (data ?? []).map((d) => d.id) });
  } catch (err: any) {
    logger.error("workspace snapshot delete failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "why-feed":
      return handleWhyFeed(body);
    case "score-entities":
      return handleEntityScore(body);
    case "seal-snapshot": {
      const supabaseAdmin = getSupabaseAdmin();
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!token) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }
      const {
        data: { user },
        error: authErr,
      } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }
      return handleSealSnapshot(body, user.id);
    }
    case "delete-snapshots": {
      const supabaseAdmin = getSupabaseAdmin();
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!token) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }
      const {
        data: { user },
        error: authErr,
      } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }
      return handleDeleteSnapshots(body, user.id);
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
