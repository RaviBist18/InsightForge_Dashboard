import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_CONTEXT = `You are InsightForge AI, a smart business intelligence assistant embedded in the InsightForge dashboard.
You help users understand their business data and metrics.
Current dashboard data:
- Total Revenue: $678,460 (+12.5% this month)
- Total Profit: $126,193 (18.6% margin, -2.1%)
- Total Orders: 53 (+14.7%)
- Active Users: 12,500 (+5.4%)
- Churn Rate: 1.2% (-0.3%)
- Top regions: North America (45%), Europe (30%), Asia Pacific (15%), Latin America (10%)
- Top categories: SaaS, Infrastructure, Research, Cloud, Fintech
- Recent anomaly: Profit dropped in West region due to aggressive discounting
- Highlight: Asia Pacific showing 3x growth in hardware sales
Keep responses concise and actionable. Max 3-4 sentences or bullet points.`;

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