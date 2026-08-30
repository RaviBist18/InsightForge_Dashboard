import Groq from "groq-sdk";
import { NextResponse } from "next/server";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: Request) {
  try {
    const groq = getGroq();
    const { risks, opportunities } = await req.json();

    if (
      (!risks || risks.length === 0) &&
      (!opportunities || opportunities.length === 0)
    ) {
      return NextResponse.json({ recommendations: [] });
    }

    const riskSummary = (risks || [])
      .slice(0, 6)
      .map(
        (r: any) =>
          `${r.severity.toUpperCase()} risk (${r.category}): ${r.message}`,
      )
      .join("\n");
    const oppSummary = (opportunities || [])
      .slice(0, 6)
      .map(
        (o: any) =>
          `${o.impact.toUpperCase()} opportunity (${o.category}): ${o.message}`,
      )
      .join("\n");

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a business strategy advisor. Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{"recommendations":[{"priority":"high|medium","action":"imperative sentence, under 12 words","basis":"which risk/opportunity this addresses, under 8 words"}]}
Rules:
- Synthesize across ALL items given — do not just restate one item's message.
- Return 3 to 5 recommendations, ordered by priority (high first).
- Prioritize items that address multiple risks/opportunities at once, or the highest-severity risk.
- Concrete, specific actions only. No generic filler like "monitor closely" or "review data."`,
        },
        {
          role: "user",
          content: `Current risks:\n${riskSummary || "None"}\n\nCurrent opportunities:\n${oppSummary || "None"}`,
        },
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
      top_p: 0.8,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      recommendations: Array.isArray(parsed?.recommendations)
        ? parsed.recommendations
        : [],
    });
  } catch (error: any) {
    if (error.status === 429) {
      console.warn("Groq Rate Limit Hit — recommendations unavailable.");
      return NextResponse.json(
        { recommendations: [], isRateLimited: true },
        { status: 200 },
      );
    }
    console.error("Groq API Error (recommendations):", error);
    return NextResponse.json({ recommendations: [] }, { status: 500 });
  }
}
