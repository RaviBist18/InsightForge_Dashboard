"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
  role: string;
  confidence: string;
}
interface UploadResult {
  id: string;
  filename: string;
  row_count: number | string;
  columns: ColumnInfo[];
  preview: Record<string, unknown>[];
  duplicate_count: number;
  duplicate_rows_preview: Record<string, unknown>[];
  outliers_by_column: Record<
    string,
    {
      count: number;
      lower_bound: number;
      upper_bound: number;
      rows: Record<string, unknown>[];
    }
  >;
}

interface DatasetSummary {
  id: string;
  filename: string;
  row_count: number;
  column_schema: ColumnInfo[];
  created_at: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not signed in — please log in again.");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function DatasetsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState<
    "selected" | "all" | null
  >(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadDatasets = useCallback(async () => {
    setDatasetsLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets`, { headers });
      if (!res.ok) throw new Error("Failed to load datasets");
      const data: DatasetSummary[] = await res.json();
      setDatasets(data);
    } catch {
      // silent — list is secondary to upload flow, don't block the page on this
      setDatasets([]);
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleViewDataset = async (id: string) => {
    setViewingId(id);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}`, { headers });
      if (!res.ok) throw new Error("Failed to load dataset");
      const data = await res.json();
      if (!data.analysis) {
        throw new Error(
          "This dataset was uploaded before analysis-saving was added — delete it and re-upload to view details.",
        );
      }
      setResult({
        id: data.id,
        filename: data.filename,
        row_count: data.row_count,
        columns: data.analysis.columns,
        preview: data.analysis.preview,
        duplicate_count: data.analysis.duplicate_count,
        duplicate_rows_preview: data.analysis.duplicate_rows_preview,
        outliers_by_column: data.analysis.outliers_by_column,
      });
    } catch (e: any) {
      setError(e.message || "Failed to load dataset");
      setViewingId(null);
    }
  };

  const handleDeleteDataset = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeleteConfirmId(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete dataset");
      if (viewingId === id) {
        setResult(null);
        setViewingId(null);
      }
      loadDatasets();
    } catch (e: any) {
      setError(e.message || "Failed to delete dataset");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulkDelete = async () => {
    const idsToDelete =
      deleteConfirmBulk === "all"
        ? datasets.map((d) => d.id)
        : Array.from(selectedIds);
    setDeleteConfirmBulk(null);

    try {
      const headers = await getAuthHeader();
      await Promise.all(
        idsToDelete.map((id) =>
          fetch(`${BACKEND_URL}/datasets/${id}`, {
            method: "DELETE",
            headers,
          }),
        ),
      );
      if (viewingId && idsToDelete.includes(viewingId)) {
        setResult(null);
        setViewingId(null);
      }
      setSelectedIds(new Set());
      loadDatasets();
    } catch (e: any) {
      setError(e.message || "Failed to delete datasets");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers = await getAuthHeader();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        headers, // don't set Content-Type manually — browser sets multipart boundary automatically
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data: UploadResult = await res.json();
      setResult(data);
      setViewingId(null); // fresh upload, not viewing a saved one
      loadDatasets(); // refresh saved list now that a new one exists
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1
        className="text-xl font-semibold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        Datasets
      </h1>
      <p
        className="text-[13px] mb-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Upload a CSV or Excel file to preview and analyze your data.
      </p>

      <div
        className="flex items-center gap-3 mb-6 p-4 rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <label
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-colors"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <UploadCloud size={14} />
          {file ? file.name : "Choose file"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-[13px]"
          style={{
            background: "var(--danger-bg, rgba(220,38,38,0.08))",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Saved datasets list */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Saved Datasets
          </p>
          {datasets.length > 0 && (
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setDeleteConfirmBulk("selected")}
                  className="text-[12px] font-medium transition-colors"
                  style={{ color: "var(--danger, #dc2626)" }}
                >
                  Delete Selected ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => setDeleteConfirmBulk("all")}
                className="text-[12px] font-medium transition-colors"
                style={{ color: "var(--danger, #dc2626)" }}
              >
                Delete All
              </button>
            </div>
          )}
        </div>
        {datasetsLoading ? (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Loading...
          </p>
        ) : datasets.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            No datasets saved yet — upload one above.
          </p>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            {datasets.map((d) => (
              <div
                key={d.id}
                onClick={() => handleViewDataset(d.id)}
                className="flex items-center gap-3 px-3 py-2.5 text-[13px] cursor-pointer transition-colors hover:brightness-95"
                style={{
                  borderTop: "1px solid var(--border)",
                  background:
                    viewingId === d.id ? "var(--bg-primary)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(d.id)}
                  className="cursor-pointer"
                />
                <FileText size={14} style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-primary)" }}>
                  {d.filename}
                </span>
                <span
                  className="ml-auto text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {d.row_count} rows ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDataset(d.id);
                  }}
                  className="ml-2 p-1.5 rounded-lg transition-colors hover:bg-red-50"
                  style={{ color: "var(--danger, #dc2626)" }}
                  title="Delete dataset"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div>
          <h2
            className="text-[15px] font-medium mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {result.filename}
          </h2>
          <p
            className="text-[12px] mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Rows: {result.row_count}
          </p>

          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Columns
          </p>
          <div
            className="rounded-xl overflow-hidden mb-6"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "var(--bg-primary)" }}>
                  <th
                    className="text-left px-3 py-2 font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Name
                  </th>
                  <th
                    className="text-left px-3 py-2 font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Type
                  </th>
                  <th
                    className="text-left px-3 py-2 font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Missing
                  </th>
                  <th
                    className="text-left px-3 py-2 font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Detected Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((col) => (
                  <tr
                    key={col.name}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {col.name}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {col.dtype}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {col.null_count}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {col.role === "unknown" ? "—" : col.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.duplicate_count > 0 && (
            <div className="mb-6">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--danger, #dc2626)" }}
              >
                Duplicates Found: {result.duplicate_count}
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "var(--bg-primary)" }}>
                      {result.columns.map((col) => (
                        <th
                          key={col.name}
                          className="text-left px-3 py-2 font-medium whitespace-nowrap"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.duplicate_rows_preview.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {result.columns.map((col) => (
                          <td
                            key={col.name}
                            className="px-3 py-2 whitespace-nowrap"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {row[col.name] === null
                              ? "—"
                              : String(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Object.entries(result.outliers_by_column).map(([colName, info]) => (
            <div key={colName} className="mb-6">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--warning, #d97706)" }}
              >
                Outliers in "{colName}": {info.count} (expected range:{" "}
                {info.lower_bound} – {info.upper_bound})
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "var(--bg-primary)" }}>
                      {result.columns.map((col) => (
                        <th
                          key={col.name}
                          className="text-left px-3 py-2 font-medium whitespace-nowrap"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.rows.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {result.columns.map((col) => (
                          <td
                            key={col.name}
                            className="px-3 py-2 whitespace-nowrap"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {row[col.name] === null
                              ? "—"
                              : String(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Preview
          </p>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "var(--bg-primary)" }}>
                  {result.columns.map((col) => (
                    <th
                      key={col.name}
                      className="text-left px-3 py-2 font-medium whitespace-nowrap"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    {result.columns.map((col) => (
                      <td
                        key={col.name}
                        className="px-3 py-2 whitespace-nowrap"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row[col.name] === null ? "—" : String(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {deleteConfirmBulk && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeleteConfirmBulk(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 p-5 rounded-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {deleteConfirmBulk === "all"
                ? `Delete all ${datasets.length} datasets?`
                : `Delete ${selectedIds.size} selected dataset${selectedIds.size > 1 ? "s" : ""}?`}
            </h3>
            <p
              className="text-[13px] mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              This can't be undone. Files and their analysis will be permanently
              removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmBulk(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors"
                style={{ background: "var(--danger, #dc2626)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 p-5 rounded-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Delete dataset?
            </h3>
            <p
              className="text-[13px] mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              This can't be undone. The file and its analysis will be
              permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors"
                style={{ background: "var(--danger, #dc2626)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
