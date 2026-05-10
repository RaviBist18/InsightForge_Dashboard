import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // Now extracting contextData which contains your Forensic Ledger
        const { message, history, contextData } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ reply: 'Groq API key not configured.' }, { status: 500 });
        }

        // ─── DYNAMIC CONTEXT INJECTION ───
        // This gives the AI 'eyes' to see your Bitcoin/Ethereum fuel and audit status
        const LEDGER_CONTEXT = contextData
            ? `LIVE FORENSIC LEDGER DATA: ${JSON.stringify(contextData)}`
            : "No ledger data provided.";

        const SYSTEM_CONTEXT = `
ACT AS: InsightForge Lead Strategic Consultant. Boardroom-aggressive, blunt, zero-fluff.

CORE LOGIC:
1. DATA FIDELITY: Use the provided LEDGER DATA to answer questions about specific entities (Bitcoin, Ethereum, etc.).
2. EXTERNAL CORRELATION: Link internal revenue to Alpha Vantage/NewsAPI.
3. PRESCRIPTIVE DIRECTIVES: Use only action verbs — Squeeze, Cut, Pivot, Defend, Capture.
4. BANNED WORDS: overall, stable, healthy, monitor, good, slightly.

${LEDGER_CONTEXT}

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
                max_tokens: 350,
                temperature: 0.5, // Lower temperature for more accurate data reporting
            }),
        });

        const groqData = await groqRes.json();
        const reply = groqData?.choices?.[0]?.message?.content ?? 'No response generated.';

        return NextResponse.json({ reply });

    } catch (err: any) {
        return NextResponse.json({ reply: 'The Forge is offline. Check API connectivity.' }, { status: 500 });
    }
}