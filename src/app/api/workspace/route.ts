// src/app/api/workspace/route.ts
// Handles: why-feed, scenario simulation, entity scoring, snapshot sealing
// Optimized for direct database access to bypass cookie sync issues

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = process.env.GROQ_API_KEY!;
const MODEL = "llama-3.1-8b-instant";

async function groq(
  system: string,
  user: string,
  maxTokens = 512,
): Promise<string> {
  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
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
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "AI unavailable";
}

// ── WHY FEED ──────────────────────────────────────────────────────────────────
async function handleWhyFeed(body: {
  movers: {
    filename: string;
    revenue: number;
    rowCount: number;
    deltaPct: number;
  }[];
  mrr: number;
  churn: number;
  persona: string;
}) {
  const { movers, mrr, churn, persona } = body;

  if (!movers || movers.length === 0) {
    return NextResponse.json({ feed: [] });
  }

  const system = `You are InsightForge's Strategic Intelligence Engine.
Persona: ${persona}. You explain WHY the company's numbers are moving, based on real dataset-level activity — not external news.
Respond ONLY with a JSON array of objects: [{headline, snippet, impact_type, impact_delta, source}]
- headline: short label naming the dataset and its movement (e.g. "Sales dataset revenue up 20%")
- snippet: 1 sentence explaining the business impact, be specific, use the real numbers given.
- impact_type: one of "revenue" | "opportunity" | "risk"
- impact_delta: the dataset's actual deltaPct value, unmodified
- source: the dataset's filename
No markdown, no extra text. Only include datasets with a non-zero deltaPct.`;

  const user = `Current total MRR: $${mrr.toLocaleString()}. Churn: ${churn}%.
Dataset movement this period: ${JSON.stringify(movers.slice(0, 6))}
Explain what's driving the numbers, dataset by dataset.`;

  const raw = await groq(system, user, 800);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json({ feed: parsed });
  } catch {
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
    // service-role client — bypasses RLS. Safe because userId passed in here
    // is now the verified auth.uid() from the POST handler, not client body input.
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
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    // scoped to user_id — can only delete your own snapshots, even with service-role client
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
      // seal-snapshot writes to the DB — verify the caller's identity
      // server-side instead of trusting body.userId (client-supplied, spoofable)
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
      // same auth pattern as seal-snapshot — verify caller server-side
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
