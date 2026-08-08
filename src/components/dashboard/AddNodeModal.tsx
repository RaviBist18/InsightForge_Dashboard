"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2 } from "lucide-react";
import { ForensicNode } from "./DataTable";
import { supabase } from "@/lib/supabase";

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (node: ForensicNode) => void;
  companyId: string;
}

export function AddNodeModal({
  isOpen,
  onClose,
  onAdd,
  companyId,
}: AddNodeModalProps) {
  const [entity, setEntity] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("SaaS");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!entity.trim() || !amount.trim()) return;
    if (!companyId) {
      console.error("ADD_ENTITY_ERROR: companyId not loaded yet");
      return; // TODO: surface real error toast — "Still loading, try again"
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        company_id: companyId,
        customer: entity.trim(),
        category: category || "SaaS",
        amount: parseFloat(amount) || 0,
        status: "Settled",
      })
      .select()
      .single();

    setLoading(false);

    if (error || !data) {
      console.error("INSERT_TRANSACTION_ERROR:", error);
      return; // TODO: surface a real error toast instead of silent fail
    }

    const newNode: ForensicNode = {
      id: data.id,
      status: "Settled",
      entity: data.customer,
      category: data.category,
      amount: data.amount,
      audit: "Verified",
      type: "node_activation",
      metadata: { timestamp: data.created_at },
      briefing: {
        status: `${data.customer} added with $${Number(data.amount).toLocaleString()}.`,
        context: `Manually added ${(data.category ?? "").toLowerCase()} record.`,
        action: "Review against related transactions.",
      },
    };

    onAdd(newNode);
    setEntity("");
    setAmount("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 pt-6 pb-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--accent-subtle)" }}
                >
                  <Plus size={16} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <h3
                    className="text-[14px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Add Entity
                  </h3>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Add a new transaction record
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-6 space-y-4">
              <div>
                <label
                  className="block text-[12px] font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Entity Name
                </label>
                <input
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-[13px] focus:outline-none transition-all"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-[12px] font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Amount ($)
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    $
                  </span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-[13px] focus:outline-none transition-all"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[12px] font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-[13px] focus:outline-none transition-all cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {[
                    "SaaS",
                    "Analytics",
                    "Infrastructure",
                    "Fintech",
                    "Research",
                    "Other",
                  ].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-[12px] font-medium transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={!entity.trim() || !amount.trim() || loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl text-[12px] font-medium text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                style={{ background: "var(--accent)" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Adding...
                  </>
                ) : (
                  <>
                    <Plus size={13} /> Add Entity
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
