"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, User, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const SUGGESTED = [
    "Summarize this month's revenue",
    "Why might churn rate be high?",
    "Which region performs best?",
    "How can I improve profit margin?",
];

const SYSTEM_CONTEXT = `You are InsightForge AI, a smart business intelligence assistant embedded in the InsightForge dashboard. 
You help users understand their business data and metrics.
Current dashboard data:
- Total Revenue: $678,460
- Total Profit: $126,193 (18.6% margin)
- Total Orders: 53
- Active Users: 12,500
- Churn Rate: 1.2%
- Top regions: North America (45%), Europe (30%), Asia Pacific (15%)
- Top categories: SaaS, Infrastructure, Research
Keep responses concise, insightful, and actionable. Use bullet points when listing multiple items.`;

export function AIChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: "Hi! I'm InsightForge AI. Ask me anything about your dashboard data, trends, or business insights.",
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300);
    }, [open]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text.trim(),
                    history: messages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            const data = await response.json();

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply || 'Sorry, I could not process that.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([{
            id: '0',
            role: 'assistant',
            content: "Hi! I'm InsightForge AI. Ask me anything about your dashboard data, trends, or business insights.",
            timestamp: new Date(),
        }]);
    };

    return (
        <>
            {/* ── Floating Button ── */}
            < motion.button
                onClick={() => setOpen(v => !v)
                }
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-14 right-6 z-50 w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-sky-500 hover:bg-sky-400 shadow-2xl shadow-sky-500/40 flex items-center justify-center transition-colors"
            >
                <AnimatePresence mode="wait" >
                    {
                        open
                            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <X size={20} className="text-white" />
                            </motion.div>
                            : <motion.div key="spark" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                <Sparkles size={20} className="text-white" />
                            </motion.div>
                    }
                </AnimatePresence>

                {/* Unread dot */}
                {
                    !open && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#020617]" />
                    )
                }
            </motion.button>

            {/* ── Chat Panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        className="fixed bottom-[120px] right-6 z-50 w-[360px] h-[520px] rounded-2xl border border-white/[0.1] bg-[#080f1f] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Top glow */}
                        < div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />

                        {/* Header */}
                        < div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0" >
                            <div className="flex items-center gap-2.5" >
                                <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30" >
                                    <Sparkles size={13} className="text-white" />
                                </div>
                                < div >
                                    <p className="text-[12px] font-black text-white" > InsightForge AI </p>
                                    < div className="flex items-center gap-1" >
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest" > Online </p>
                                    </div>
                                </div>
                            </div>
                            < div className="flex items-center gap-1" >
                                <button onClick={handleReset}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-all" >
                                    <RotateCcw size={13} />
                                </button>
                                < button onClick={() => setOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.05] transition-all" >
                                    <X size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar" >
                            {
                                messages.map(msg => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                                    >
                                        {/* Avatar */}
                                        < div className={
                                            cn(
                                                'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                                                msg.role === 'assistant'
                                                    ? 'bg-sky-500 shadow-lg shadow-sky-500/30'
                                                    : 'bg-white/[0.08] border border-white/[0.1]'
                                            )
                                        } >
                                            {
                                                msg.role === 'assistant'
                                                    ? <Sparkles size={10} className="text-white" />
                                                    : <User size={10} className="text-slate-400" />
                                            }
                                        </div>

                                        {/* Bubble */}
                                        <div className={
                                            cn(
                                                'max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed',
                                                msg.role === 'assistant'
                                                    ? 'bg-white/[0.05] border border-white/[0.06] text-slate-300 rounded-tl-sm'
                                                    : 'bg-sky-500 text-white rounded-tr-sm'
                                            )
                                        }>
                                            {msg.content}
                                        </div>
                                    </motion.div>
                                ))}

                            {/* Loading bubble */}
                            {
                                loading && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }
                                    } className="flex gap-2.5" >
                                        <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-sky-500/30" >
                                            <Sparkles size={10} className="text-white" />
                                        </div>
                                        < div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/[0.06] flex items-center gap-1.5" >
                                            {
                                                [0, 1, 2].map(i => (
                                                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500"
                                                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                                                ))}
                                        </div>
                                    </motion.div>
                                )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Suggestions */}
                        {
                            messages.length === 1 && (
                                <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0" >
                                    {
                                        SUGGESTED.map(s => (
                                            <button key={s} onClick={() => sendMessage(s)}
                                                className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] font-bold text-slate-400 hover:text-white hover:border-sky-500/40 transition-all" >
                                                {s}
                                            </button>
                                        ))
                                    }
                                </div>
                            )}

                        {/* Input */}
                        <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] flex-shrink-0" >
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-sky-500/40 transition-all" >
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                                    placeholder="Ask about your data..."
                                    className="flex-1 bg-transparent text-[12px] text-white placeholder-slate-700 focus:outline-none"
                                />
                                <button
                                    onClick={() => sendMessage(input)}
                                    disabled={!input.trim() || loading}
                                    className="w-6 h-6 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-30 flex items-center justify-center transition-all flex-shrink-0"
                                >
                                    {loading ? <Loader2 size={11} className="animate-spin text-white" /> : <Send size={11} className="text-white" />}
                                </button>
                            </div>
                            < p className="text-[9px] text-slate-700 text-center mt-1.5 font-bold" > Powered by Gemini AI </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}