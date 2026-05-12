// src/app/api/workspace/route.ts
// Handles: why-feed, scenario simulation, entity scoring, snapshot sealing
// Optimized for direct database access to bypass cookie sync issues

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = process.env.GROQ_API_KEY!;
const MODEL = "llama-3.1-8b-instant";

async function groq(system: string, user: string, maxTokens = 512): Promise<string> {
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
    headlines: string[];
    mrr: number;
    churn: number;
    persona: string;
}) {
    const { headlines, mrr, churn, persona } = body;

    const system = `You are InsightForge's Strategic Intelligence Engine.
Persona: ${persona}. You analyze global news through the lens of a B2B SaaS CEO's metrics.
Respond ONLY with a JSON array of objects: [{headline, snippet, impact_type, impact_delta, source}]
- snippet: 1 sentence explaining business impact (be specific, use numbers).
- impact_type: one of "churn" | "revenue" | "opportunity" | "risk"
- impact_delta: float between -30 and +30 (negative = bad)
- source: short source label
No markdown, no extra text.`;

    const user = `Current MRR: $${mrr.toLocaleString()}. Churn: ${churn}%.
Headlines: ${headlines.slice(0, 5).join(" | ")}
Map each headline to a business impact snippet.`;

    const raw = await groq(system, user, 800);

    try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        return NextResponse.json({ feed: parsed });
    } catch {
        return NextResponse.json({ feed: [] });
    }
}

// ── SCENARIO SIMULATION ───────────────────────────────────────────────────────
async function handleSimulation(body: {
    shocks: Record<string, number>;
    mrr: number;
    burn: number;
    subscribers: number;
    persona: string;
}) {
    const { shocks, mrr, burn, subscribers, persona } = body;

    const system = `You are InsightForge's What-If Forge engine.
Persona: ${persona}. Given macro shocks, project business impact and suggest a Counter-Forge strategy.
Respond ONLY with JSON: {mrr_delta_pct, burn_delta_pct, subscriber_delta_pct, runway_months, risk_level, counter_forge, summary}
- All deltas are floats (negative = decrease).
- risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
- counter_forge: 2-3 sentence actionable strategy.
- summary: 1 sentence executive summary.
No markdown, no extra text.`;

    const user = `Current state — MRR: $${mrr}, Monthly Burn: $${burn}, Subscribers: ${subscribers}.
Applied shocks: ${JSON.stringify(shocks)}
Project the impact.`;

    const raw = await groq(system, user, 600);

    try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        return NextResponse.json({ simulation: parsed });
    } catch {
        return NextResponse.json({
            simulation: {
                mrr_delta_pct: -10,
                burn_delta_pct: 5,
                subscriber_delta_pct: -8,
                runway_months: 14,
                risk_level: "MEDIUM",
                counter_forge: "Shift focus to enterprise tier. Reduce SMB exposure.",
                summary: "Moderate impact. Action required within 30 days.",
            },
        });
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
    userId: string
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

        const payload = JSON.stringify({ label, mrr, churn, signups, marketConditions, aiAdvice, timestamp: Date.now() });
        const hash = crypto.createHash("sha256").update(payload).digest("hex");

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.from("forensic_snapshots").insert({
            user_id: userId,
            label,
            hash,
            mrr: Number(mrr),
            churn: Number(churn),
            signups: Number(signups),
            market_conditions: marketConditions,
            ai_advice: aiAdvice,
            persona,
        }).select().single();

        if (error) {
            console.error("SNAPSHOT_ERROR:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ snapshot: data });
    } catch (err: any) {
        console.error("SNAPSHOT_ERROR:", err);
        return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
    }
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { action, userId } = body;

    // Optional: Internal logging for Forensic Audit Trail
    console.log(`[FORENSIC_AUDIT] Action: ${action} | UserID: ${userId} | Timestamp: ${new Date().toISOString()}`);

    switch (action) {
        case "why-feed": return handleWhyFeed(body);
        case "simulate": return handleSimulation(body);
        case "score-entities": return handleEntityScore(body);
        case "seal-snapshot": return handleSealSnapshot(body, userId);
        default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
}