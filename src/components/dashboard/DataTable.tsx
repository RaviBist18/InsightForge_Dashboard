"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  UserPlus,
  Globe,
  ArrowUpDown,
  Clock,
  Trash2,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────

export interface ForensicNode {
  id: string;
  status: "Settled" | "Pending";
  entity: string;
  category: string;
  amount: number | string;
  prevAmount?: number;
  audit: "Verified" | "Needs Review";
  type: "transaction" | "node_activation";
  metadata: {
    timestamp: string;
  };
  briefing: {
    status: string;
    context: string;
    action: string;
  };
}

interface DataTableProps {
  nodes?: ForensicNode[];
  onDelete: (id: string) => void;
}

const AUDIT_CONFIG: Record<ForensicNode["audit"], string> = {
  Verified: "success",
  "Needs Review": "warning",
};

// ─── SUB-COMPONENT: DETAIL MODAL ────────────────────────────────────────

const NodeDetail = ({
  node,
  onClose,
}: {
  node: ForensicNode;
  onClose: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative rounded-xl w-full max-w-lg overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div
            className="flex justify-between items-start mb-6 pb-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: "var(--accent-subtle)" }}
              >
                <Info size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h4
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {node.entity}
                </h4>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  ID: {node.id}
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

          <div className="space-y-4">
            <section>
              <h5
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Status
              </h5>
              <p
                className="text-[13px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {node.briefing.status}
              </p>
            </section>
            <section>
              <h5
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Details
              </h5>
              <p
                className="text-[13px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {node.briefing.context}
              </p>
            </section>
            <div
              className="p-4 rounded-xl"
              style={{
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent)",
              }}
            >
              <h5
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--accent)" }}
              >
                Suggested Action
              </h5>
              <p
                className="text-[13px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {node.briefing.action}
              </p>
            </div>
            <div
              className="flex items-center gap-2 pt-2 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              <Clock size={11} /> {node.metadata.timestamp}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────

export const DataTable: React.FC<DataTableProps> = ({
  nodes = [],
  onDelete = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<ForensicNode | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ForensicNode | null;
    dir: "asc" | "desc";
  }>({ key: null, dir: "desc" });
  const ITEMS_PER_PAGE = 10;

  const handleSort = (key: keyof ForensicNode) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));
  };

  const filteredNodes = useMemo(() => {
    const result = nodes.filter(
      (n) =>
        n.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key!] ?? "";
        const valB = b[sortConfig.key!] ?? "";

        if (valA < valB) return sortConfig.dir === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [nodes, searchQuery, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNodes.length / ITEMS_PER_PAGE),
  );
  const paginated = filteredNodes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: "var(--accent-subtle)" }}
            >
              <Database
                className="w-5 h-5"
                style={{ color: "var(--accent)" }}
              />
            </div>
            <div>
              <h2
                className="text-[15px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Transaction Ledger
              </h2>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {nodes.length} {nodes.length === 1 ? "record" : "records"}{" "}
                tracked
              </p>
            </div>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full md:w-72 rounded-xl text-[13px] focus:outline-none transition-all"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr>
                {[
                  { label: "Entity", key: "entity" },
                  { label: "Category", key: "category" },
                  { label: "Status", key: "status" },
                  { label: "Amount", key: "amount" },
                  { label: "Audit", key: "audit" },
                  { label: "", key: null },
                ].map((col, i) => (
                  <th
                    key={i}
                    className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {col.key ? (
                      <button
                        onClick={() =>
                          handleSort(col.key as keyof ForensicNode)
                        }
                        className="flex items-center gap-1.5 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {col.label} <ArrowUpDown size={11} />
                      </button>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((node) => (
                  <tr
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer transition-colors group"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {node.type === "node_activation" ? (
                            <UserPlus
                              size={14}
                              style={{ color: "var(--success)" }}
                            />
                          ) : (
                            <Globe
                              size={14}
                              style={{ color: "var(--accent)" }}
                            />
                          )}
                        </div>
                        <span
                          className="text-[13px] font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {node.entity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2.5 py-1 rounded-xl text-[11px] font-medium"
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {node.category}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-[13px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {node.status}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          style={{
                            color:
                              Number(node.amount) >= (node.prevAmount ?? 0)
                                ? "var(--success)"
                                : "var(--danger)",
                          }}
                        >
                          {Number(node.amount) >= (node.prevAmount ?? 0)
                            ? "↑"
                            : "↓"}
                        </span>
                        <p
                          className="text-[13px] font-semibold tabular-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          $
                          {Number(node.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="px-2.5 py-1 rounded-xl text-[11px] font-medium"
                        style={{
                          background:
                            AUDIT_CONFIG[node.audit] === "success"
                              ? "var(--success-bg)"
                              : "var(--warning-bg)",
                          color:
                            AUDIT_CONFIG[node.audit] === "success"
                              ? "var(--success)"
                              : "var(--warning)",
                        }}
                      >
                        {node.audit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(node.id);
                        }}
                        className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        style={{
                          background: "var(--danger-bg)",
                          color: "var(--danger)",
                        }}
                        title="Delete record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <p
                      className="text-[13px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No transactions found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Showing {paginated.length} of {filteredNodes.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl disabled:opacity-30 transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <ChevronLeft size={15} />
            </button>
            <span
              className="px-3 text-[12px] font-medium tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl disabled:opacity-30 transition-colors"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
