import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        const { range, category, efficiency, newsHeadline } = await req.json();

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a world-class SaaS business strategist and market analyst.

Write ONE sentence only.

Goal:
Generate a sharp, unique, filter-aware strategic insight that explains the business situation clearly.

Rules:
- Keep it under 20 words.
- Use blunt, intelligent, high-impact business language.
- Make every output feel distinct.
- Avoid generic words: overall, stable, healthy, monitor, good.
- Use strong verbs: cut, push, squeeze, unlock, protect, accelerate, defend, capture, recover, expand.
- Match the tone to the filter and tier.
- Reflect the news context in the insight.
- No filler. No explanation. No emojis.

Filter meaning:
- Daily: urgent movement, immediate risk, quick opportunity.
- Weekly: trend shift, momentum, pressure, recovery.
- Monthly: performance quality, efficiency, leak points, growth strength.
- Quarterly: strategic direction, market position, scaling, resilience.
- Annual: long-term strength, structural growth, competitive advantage.

Tier meaning:
- Starter: simple, direct, easy to understand.
- Pro: growth-focused, analytical, sharper business language.
- Enterprise: executive-level, strategic, high-value, boardroom tone.

Return only one sentence.`
                },
                {
                    role: "user",
                    content: `Context:
- Filter: ${range}
- Tier: ${category}
- Profit Efficiency: ${efficiency}%
- News Context: ${newsHeadline}

Write the sharpest possible strategic insight for this exact situation.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.35,
            top_p: 0.85,
            max_completion_tokens: 40,
        });

        const message =
            completion.choices[0]?.message?.content || "Profit engine needs a sharper move.";

        return NextResponse.json({ briefing: message });
    } catch (error) {
        console.error("Groq API Error:", error);
        return NextResponse.json(
            { briefing: "Consultant offline. Check Groq API configuration." },
            { status: 500 }
        );
    }
}