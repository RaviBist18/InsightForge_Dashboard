"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Zap, ShieldCheck, Fingerprint, Loader2 } from 'lucide-react';
import { ForensicNode } from './DataTable';

interface AddNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (node: ForensicNode) => void;
}

const generateHash = () =>
    `0x${Array.from({ length: 10 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...`;

export function AddNodeModal({ isOpen, onClose, onAdd }: AddNodeModalProps) {
    const [entity, setEntity] = useState('');
    const [alpha, setAlpha] = useState('');
    const [intent, setIntent] = useState('Strategic Function');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!entity.trim() || !alpha.trim()) return;
        setLoading(true);
        await new Promise(r => setTimeout(r, 600)); // simulate processing

        const newNode: ForensicNode = {
            id: `node-${Date.now()}`,
            hash: generateHash(),
            velocity: 'Real-time',
            entity: entity.trim().toUpperCase(),
            intent: intent || 'Strategic Function',
            correlation: 'Optimizing Portfolio',
            alpha: parseFloat(alpha) || 0,
            audit: 'Verified',
            type: 'node_activation',
            metadata: {
                iso_timestamp: new Date().toISOString(),
                shutter_speed: '1/200',
                network_load: 'Optimal',
                gas_fee: '$0.0012',
                block_depth: Math.floor(Math.random() * 9000) + 1000,
            },
            briefing: {
                status: `New node ${entity.trim().toUpperCase()} activated with $${parseFloat(alpha).toLocaleString()} growth fuel.`,
                context: 'Forging internal node data with live market signals.',
                action: 'Monitor node performance against market benchmarks.',
            },
        };

        onAdd(newNode);
        setLoading(false);
        setEntity('');
        setAlpha('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#080f1f] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                    >
                        {/* CRT scanline texture */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_3px] pointer-events-none opacity-10" />

                        {/* Top glow */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-sky-400/5 blur-2xl pointer-events-none" />

                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 border-b border-white/[0.06] flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                                        <Plus size={18} className="text-sky-400" />
                                    </div>
                                    <div className="absolute inset-0 bg-sky-400/10 blur-xl" />
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.35em]">Quick Node Injection</h3>
                                    <p className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">Forensic Ledger · Live</p>
                                </div>
                            </div>
                            <button onClick={onClose}
                                className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-500 hover:text-white transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-8 py-7 space-y-5 relative z-10">
                            {/* Entity/Node */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">
                                    Entity / Node Name
                                </label>
                                <input
                                    value={entity}
                                    onChange={e => setEntity(e.target.value)}
                                    placeholder="e.g. ENTERPRISE_NODE_7"
                                    autoFocus
                                    className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-[12px] font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.05] transition-all uppercase tracking-wider"
                                />
                            </div>

                            {/* Growth Fuel */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">
                                    Growth Fuel ($)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[12px] font-black">$</span>
                                    <input
                                        value={alpha}
                                        onChange={e => setAlpha(e.target.value)}
                                        placeholder="0.00"
                                        type="number"
                                        min="0"
                                        className="w-full pl-8 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-[12px] font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.05] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Strategic Function */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">
                                    Strategic Function
                                </label>
                                <select
                                    value={intent}
                                    onChange={e => setIntent(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-[11px] font-black text-slate-300 focus:outline-none focus:border-sky-500/50 transition-all appearance-none cursor-pointer uppercase tracking-widest"
                                >
                                    {['Strategic Function', 'Crypto', 'Analytics', 'Infrastructure', 'SaaS', 'Fintech', 'Research'].map(o => (
                                        <option key={o} value={o} className="bg-[#080f1f]">{o}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Auto-generated fields preview */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Auto-Generated Fields</p>
                                {[
                                    { label: 'Forensic Hash', value: 'Auto · 0x...random', icon: Fingerprint },
                                    { label: 'Audit Integrity', value: 'VERIFIED', icon: ShieldCheck },
                                    { label: 'Settlement Velocity', value: 'Real-time', icon: Zap },
                                ].map(f => (
                                    <div key={f.label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <f.icon size={9} className="text-slate-600" />
                                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{f.label}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 pb-8 flex gap-3 relative z-10">
                            <button onClick={onClose}
                                className="flex-1 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                                Abort
                            </button>
                            <motion.button
                                onClick={handleSubmit}
                                disabled={!entity.trim() || !alpha.trim() || loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex-1 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-sky-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <><Loader2 size={13} className="animate-spin" /> Injecting...</>
                                    : <><Plus size={13} /> Inject Node</>
                                }
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}