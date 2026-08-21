"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X, FileText, Bookmark, LayoutGrid, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSavedAlerts } from "@/lib/data";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type ResultType = "nav" | "action" | "dataset" | "view";
interface SearchResult {
  type: ResultType;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Datasets", href: "/dashboard/datasets" },
  { label: "Simulator", href: "/dashboard/simulator" },
  { label: "Saved Views", href: "/dashboard/saved-views" },
  { label: "User Management", href: "/dashboard/admin/users" },
  { label: "Team", href: "/dashboard/team" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Workspace", href: "/dashboard/workspace" },
];

const QUICK_ACTIONS = [
  { label: "Upload dataset", href: "/dashboard/datasets" },
  { label: "Create alert", href: "/dashboard/saved-views" },
  { label: "Run simulation", href: "/dashboard/simulator" },
  { label: "Invite team member", href: "/dashboard/team" },
  { label: "CEO Briefing", href: "/dashboard/workspace" },
  { label: "Snapshot Archive", href: "/dashboard/workspace" },
  { label: "Live Metrics", href: "/dashboard/workspace" },
];

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export function SearchPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [datasets, setDatasets] = useState<{ id: string; filename: string }[]>(
    [],
  );
  const [savedViews, setSavedViews] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-load datasets + saved views once, on first focus
  const [loaded, setLoaded] = useState(false);
  const loadData = useCallback(async () => {
    if (loaded) return;
    setLoaded(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.map((d: any) => ({ id: d.id, filename: d.filename })));
      }
    } catch {}
    try {
      const rows = await getSavedAlerts();
      setSavedViews(rows.map((r: any) => ({ id: r.id, name: r.name })));
    } catch {}
  }, [loaded]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results: SearchResult[] = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const navMatches = NAV_ITEMS.filter((n) =>
      n.label.toLowerCase().includes(q),
    ).map((n) => ({
      type: "nav" as const,
      id: n.href,
      label: n.label,
      href: n.href,
    }));

    const actionMatches = QUICK_ACTIONS.filter((a) =>
      a.label.toLowerCase().includes(q),
    ).map((a) => ({
      type: "action" as const,
      id: a.href + a.label,
      label: a.label,
      sublabel: "Quick Action",
      href: a.href,
    }));

    const datasetMatches = datasets
      .filter((d) => d.filename.toLowerCase().includes(q))
      .slice(0, 5)
      .map((d) => ({
        type: "dataset" as const,
        id: d.id,
        label: d.filename,
        sublabel: "Dataset",
        href: `/dashboard/datasets?dataset=${d.id}`,
      }));

    const viewMatches = savedViews
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((v) => ({
        type: "view" as const,
        id: v.id,
        label: v.name,
        sublabel: "Saved View",
        href: `/dashboard/saved-views?view=${v.id}`,
      }));

    return [...navMatches, ...actionMatches, ...datasetMatches, ...viewMatches];
  })();

  const goTo = (r: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(r.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[activeIndex]) {
      goTo(results[activeIndex]);
    }
  };

  const iconFor = (type: ResultType) => {
    if (type === "nav") return <LayoutGrid size={13} />;
    if (type === "action") return <Zap size={13} />;
    if (type === "dataset") return <FileText size={13} />;
    return <Bookmark size={13} />;
  };

  return (
    <div className="relative flex-1" ref={containerRef}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors"
        style={{
          color: query ? "var(--accent)" : "var(--text-muted)",
        }}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          loadData();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search pages, datasets, or saved views..."
        className="w-full pl-9 pr-9 py-2 rounded-xl text-[13px] focus:outline-none transition-colors"
        style={{
          background: "var(--bg-primary)",
          border: `1px solid ${query ? "var(--accent)" : "var(--border)"}`,
          color: "var(--text-primary)",
        }}
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={12} />
        </button>
      )}

      {open && query && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden shadow-md z-50 max-h-80 overflow-y-auto"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {results.length === 0 ? (
            <div
              className="px-4 py-6 text-center text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              No matches for &quot;{query}&quot;
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => goTo(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors"
                style={{
                  background:
                    i === activeIndex ? "var(--bg-primary)" : "transparent",
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ color: "var(--accent)" }}>
                  {iconFor(r.type)}
                </span>
                <span className="flex-1 truncate">{r.label}</span>
                {r.sublabel && (
                  <span
                    className="text-[10px] uppercase tracking-wide"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {r.sublabel}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
