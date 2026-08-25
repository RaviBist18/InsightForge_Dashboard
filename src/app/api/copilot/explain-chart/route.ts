import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { chartTitle, note, data } = await req.json();

    if (!chartTitle || !Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY_COPILOT || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { explanation: "Groq API key not configured." },
        { status: 500 },
      );
    }

    if (data.length === 0) {
      return NextResponse.json({
        explanation: "There's no data in this chart yet — nothing to explain.",
      });
    }

    const systemPrompt = `
You are a business analyst explaining a chart to a non-technical user.
Chart: "${chartTitle}"
Context: ${note || "No additional context given."}
Data points: ${JSON.stringify(data).slice(0, 3000)}

RULES:
- Respond ONLY with valid JSON, no markdown fences, no preamble: {"explanation":"your explanation here"}
- Write 2-4 full sentences, plain language, no jargon.
- Only describe what's actually in the data above — never invent trends or numbers not present.
- If the context above flags a figure as estimated, describe it as an estimate, not a precise fact.
- If the data shows no clear trend or is too sparse to say much, say that honestly instead of manufacturing a story.
`.trim();

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "system", content: systemPrompt }],
          max_tokens: 300,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (groqRes.status === 429) {
      logger.warn("Groq rate limit hit on explain-chart");
      return NextResponse.json(
        {
          explanation:
            "Explanations are in high demand right now — try again in a moment.",
          isRateLimited: true,
        },
        { status: 200 },
      );
    }

    const groqData = await groqRes.json();
    const raw = groqData?.choices?.[0]?.message?.content;

    let parsed: { explanation?: string } | null = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      explanation:
        parsed?.explanation || "Couldn't generate an explanation right now.",
    });
  } catch (err: any) {
    logger.error("explain-chart route failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { explanation: "The Forge is offline. Check API connectivity." },
      { status: 500 },
    );
  }
}
