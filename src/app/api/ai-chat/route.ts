import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // FIXED: Extract 'systemPrompt' to match what AIChat.tsx is sending
        const { message, history, systemPrompt } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ reply: 'Groq API key not configured.' }, { status: 500 });
        }

        // ─── DYNAMIC CONTEXT INJECTION ───
        // We use the full systemPrompt built in AIChat.tsx which already contains 
        // the formatted nodes and stats strings
        const SYSTEM_CONTEXT = `
ACT AS: InsightForge Lead Strategic Consultant. Boardroom-aggressive, blunt, zero-fluff.

CORE LOGIC:
1. DATA FIDELITY: Use the LIVE LEDGER DATA below to answer questions about specific entities.
2. EXTERNAL CORRELATION: Link internal revenue to market trends.
3. PRESCRIPTIVE DIRECTIVES: Use only action verbs — Squeeze, Cut, Pivot, Defend, Capture.
4. BANNED WORDS: overall, stable, healthy, monitor, good, slightly.

${systemPrompt || "No live ledger data detected."}

DASHBOARD OVERVIEW:
- MRR: $678,460 (+12.5%) | Margin: 18.6%
- Efficiency: 78.1% (-1.7% leak detected)
- Market (SPY): $723.77 (+0.8%)
`;

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
                max_tokens: 450, // Increased slightly for more detailed financial strategy
                temperature: 0.2, // Lowered to 0.2 to prevent the AI from "guessing"
            }),
        });

        const groqData = await groqRes.json();
        const reply = groqData?.choices?.[0]?.message?.content ?? 'No response generated.';

        return NextResponse.json({ reply });

    } catch (err: any) {
        return NextResponse.json({ reply: 'The Forge is offline. Check API connectivity.' }, { status: 500 });
    }
}