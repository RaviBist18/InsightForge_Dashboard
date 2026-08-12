import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sectionALabelMap: Record<string, string> = {
  defensive: "Risks",
  aggressive: "Opportunities",
  balanced: "Risks",
};
const sectionBLabelMap: Record<string, string> = {
  defensive: "Mitigation",
  aggressive: "Next Moves",
  balanced: "Opportunities",
};

export async function POST(req: Request) {
  try {
    const { range, category, efficiency, newsHeadline, persona, personaFocus } =
      await req.json();

    // ─── 429 PROTECTION: OPTIMIZED PROMPT ───
    // By reducing the length of the system prompt, we save tokens per minute (TPM).
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a SaaS strategist. Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
  {"summary":"ONE sentence <20 words","sectionA_items":["item 1","item 2"],"sectionB_items":["item 1","item 2"]}
  Rules:
  - High-impact business language only. Use strong verbs: cut, push, squeeze, unlock, protect, accelerate.
  - Match tone to Filter (Daily: urgent | Weekly: trend | Monthly: efficiency), Tier, and the Persona description given.
  - sectionA_items = 1 to 3 items matching the FIRST section instruction below. sectionB_items = 1 to 3 items matching the SECOND. Never leave both empty — always generate at least 1 item per section based on the data given, even if minor.
  - Each item under 8 words. No filler, generic words, emojis, or markdown.`,
        },
        {
          role: "user",
          content: `Context: Filter:${range}, Tier:${category}, Efficiency:${efficiency}%, News:${newsHeadline}
  Section A = ${sectionALabelMap[persona] || "Risks"}: list threats/problems facing the business.
  Section B = ${sectionBLabelMap[persona] || "Opportunities"}: list growth levers or concrete actions to take.`,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3, // Lowered for more consistent, sharp output
      top_p: 0.8,
      max_completion_tokens: 200, // Raised for JSON structure (summary + risks + opportunities)
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    const resolvedALabel = sectionALabelMap[persona] || "Risks";
    const resolvedBLabel = sectionBLabelMap[persona] || "Opportunities";
    if (!parsed?.summary) {
      return NextResponse.json({
        briefing: "Strategic engine requiring realignment.",
        sectionALabel: resolvedALabel,
        sectionAItems: [],
        sectionBLabel: resolvedBLabel,
        sectionBItems: [],
      });
    }
    return NextResponse.json({
      briefing: parsed.summary,
      sectionALabel: resolvedALabel,
      sectionAItems: Array.isArray(parsed.sectionA_items)
        ? parsed.sectionA_items
        : [],
      sectionBLabel: resolvedBLabel,
      sectionBItems: Array.isArray(parsed.sectionB_items)
        ? parsed.sectionB_items
        : [],
    });
  } catch (error: any) {
    // ─── GRACEFUL ERROR HANDLING ───

    // Handle Groq Rate Limits (429)
    if (error.status === 429) {
      console.warn("Groq Rate Limit Hit. Returning cached fallback.");
      return NextResponse.json(
        {
          briefing: "Strategic briefing temporarily cached due to high demand.",
          isRateLimited: true,
          sectionALabel: "Risks",
          sectionAItems: [],
          sectionBLabel: "Opportunities",
          sectionBItems: [],
        },
        { status: 200 }, // Return 200 so the UI doesn't crash
      );
    }

    console.error("Groq API Error:", error);
    return NextResponse.json(
      {
        briefing: "Intelligence consultant offline. Re-initializing...",
        sectionALabel: "Risks",
        sectionAItems: [],
        sectionBLabel: "Opportunities",
        sectionBItems: [],
      },
      { status: 500 },
    );
  }
}
