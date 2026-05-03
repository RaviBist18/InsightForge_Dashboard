import { GoogleGenAI } from '@google/genai';
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

console.log('ALL ENV KEYS:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ reply: 'API key not configured.' }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const historyText = (history || [])
            .slice(-6)
            .map((m: { role: string; content: string }) =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            ).join('\n');

        const prompt = `${SYSTEM_CONTEXT}\n\n${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}User: ${message}\nAssistant:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
        });

        const reply = response.text;

        if (!reply) {
            return NextResponse.json({ reply: 'No response generated.' });
        }

        return NextResponse.json({ reply });

    } catch (err: any) {
        console.error('Gemini error:', err?.message ?? err);
        return NextResponse.json(
            { reply: 'Sorry, something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}