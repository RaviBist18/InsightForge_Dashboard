"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadCloud, Loader2, AlertCircle, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
}

interface UploadResult {
  id: string;
  filename: string;
  row_count: number | string;
  columns: ColumnInfo[];
  preview: Record<string, unknown>[];
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
        <p
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Saved Datasets
        </p>
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
                className="flex items-center gap-3 px-3 py-2.5 text-[13px]"
                style={{ borderTop: "1px solid var(--border)" }}
              >
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
    </div>
  );
}
