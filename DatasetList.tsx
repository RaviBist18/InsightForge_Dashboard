"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---- Types: adjust to match your actual API response shape ----
interface Dataset {
  id: string;
  filename: string;
  uploadedAt: string; // ISO date
  rows: number;
  status: "processed" | "processing" | "error";
}

interface DatasetListResponse {
  data: Dataset[];
  total: number;
  page: number;
  pageSize: number;
}

type SortOption = "newest" | "oldest" | "name";

const PAGE_SIZE = 15;

// ---- Fetch fn: point at your real endpoint ----
async function fetchDatasets(params: {
  page: number;
  search: string;
  sort: SortOption;
}): Promise<DatasetListResponse> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(PAGE_SIZE),
    search: params.search,
    sort: params.sort,
  });
  const res = await fetch(`/api/datasets?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch datasets");
  return res.json();
}

export default function DatasetList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["datasets", page, search, sort],
    queryFn: () => fetchDatasets({ page, search, sort }),
    // keep previous page visible while fetching next — avoids layout flash
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // reset to page 1 on new search — otherwise user can land on empty page
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input
          placeholder="Search datasets..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* States */}
      {isLoading && <DatasetListSkeleton />}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load datasets. Try refreshing.
        </div>
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
          {search
            ? `No datasets match "${search}".`
            : "No datasets uploaded yet."}
        </div>
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Rows</th>
                  <th className="px-4 py-2 font-medium">Uploaded</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((ds) => (
                  <tr
                    key={ds.id}
                    className="border-t hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2 font-medium">{ds.filename}</td>
                    <td className="px-4 py-2 text-slate-500">{ds.rows}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(ds.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={ds.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {data.page} of {totalPages} · {data.total} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Dataset["status"] }) {
  const map: Record<
    Dataset["status"],
    { bg: string; fg: string; label: string }
  > = {
    processed: {
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
      label: "Processed",
    },
    processing: {
      bg: "bg-amber-50",
      fg: "text-amber-600",
      label: "Processing",
    },
    error: { bg: "bg-red-50", fg: "text-red-600", label: "Error" },
  };
  const s = map[status];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}

function DatasetListSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-t first:border-t-0 animate-pulse"
        >
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}
