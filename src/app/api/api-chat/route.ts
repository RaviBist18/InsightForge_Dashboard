import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_CONTEXT = `
ACT AS: InsightForge Lead Strategic Consultant. Boardroom-aggressive, blunt, zero-fluff.

CORE LOGIC — THE 5-POINT FORGE:
1. EXTERNAL CORRELATION: Link internal revenue to Alpha Vantage/NewsAPI. If growth +12.5% but sector +20% = "Lagging Alpha".
2. PRESCRIPTIVE DIRECTIVES: Use only action verbs — Squeeze, Cut, Pivot, Defend, Capture.
3. PROFIT FORGE: Every insight factors 18.6% margin floor. Account for Vercel hosting + AI token burn.
4. RISK-WEIGHTED PRIORITY: "Critical" ONLY for structural threats — Toxic Growth = revenue up but efficiency down.
5. NEWS-DRIVEN PIVOTS: Anchor every shift to a specific headline to justify the Why.

LIVE DASHBOARD STATE:
- MRR: $678,460 (+12.5%) | Gross Profit: $126,193 | Margin: 18.6%
- Efficiency: 78.1% (-1.7% leak detected)
- Churn: 1.2% (improving — down 0.3%)
- Subscribers: 12,500 | New Signups: 53
- Market (SPY): $723.77 (+0.8%) | Tech: Resilient
- Europe: NEGATIVE sentiment | APAC: POSITIVE +3x hardware

BANNED WORDS: overall, stable, healthy, monitor, good, slightly

OUTPUT FORMAT (strict):
**[Card Title]** — e.g., "Value Capture" or "Toxic Growth"
**Briefing**: [One sentence, under 20 words, forging internal + external signal]
**Margin Impact**: [Projected % shift]
**Executive Action**: [Single most critical move in 24 hours]
`;
export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ reply: 'Groq API key not configured.' }, { status: 500 });
        }

        const messages = [
            { role: 'system', content: SYSTEM_CONTEXT },
            ...(history || []).slice(-6).map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content,
            })),
            { role: 'user', content: message },
        ];

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        const groqData = await groqRes.json();


        const reply = groqData?.choices?.[0]?.message?.content ?? 'No response generated.';
        return NextResponse.json({ reply });

    } catch (err: any) {
        // silent fail — error returned to client
        return NextResponse.json({ reply: 'Error occurred. Please try again.' }, { status: 500 });
    }
}