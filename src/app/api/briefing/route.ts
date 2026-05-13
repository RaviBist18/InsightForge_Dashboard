import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        const { range, category, efficiency, newsHeadline } = await req.json();

        // ─── 429 PROTECTION: OPTIMIZED PROMPT ───
        // By reducing the length of the system prompt, we save tokens per minute (TPM).
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a SaaS strategist. Write ONE sentence (<20 words) explaining the business situation.
Rules:
- High-impact business language only.
- Use strong verbs: cut, push, squeeze, unlock, protect, accelerate.
- Match tone to Filter (Daily: urgent | Weekly: trend | Monthly: efficiency) and Tier.
- No filler, generic words, or emojis.`
                },
                {
                    role: "user",
                    content: `Context: Filter:${range}, Tier:${category}, Efficiency:${efficiency}%, News:${newsHeadline}`
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3, // Lowered for more consistent, sharp output
            top_p: 0.8,
            max_completion_tokens: 35, // Strict limit to prevent token waste
        });

        const message = completion.choices[0]?.message?.content || "Strategic engine requiring realignment.";

        return NextResponse.json({ briefing: message });

    } catch (error: any) {
        // ─── GRACEFUL ERROR HANDLING ───

        // Handle Groq Rate Limits (429)
        if (error.status === 429) {
            console.warn("Groq Rate Limit Hit. Returning cached fallback.");
            return NextResponse.json(
                {
                    briefing: "Strategic briefing temporarily cached due to high demand.",
                    isRateLimited: true
                },
                { status: 200 } // Return 200 so the UI doesn't crash
            );
        }

        console.error("Groq API Error:", error);
        return NextResponse.json(
            { briefing: "Intelligence consultant offline. Re-initializing..." },
            { status: 500 }
        );
    }
}