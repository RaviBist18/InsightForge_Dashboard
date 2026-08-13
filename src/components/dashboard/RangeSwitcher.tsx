"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const RANGES: { value: string; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export function RangeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") || "monthly";

  const setRange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // scroll chart into view after route + re-render settle
    setTimeout(() => {
      document
        .getElementById("revenue-trend-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-xl sticky top-4 z-20"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
      }}
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => setRange(r.value)}
          className="px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors"
          style={{
            background:
              activeRange === r.value ? "var(--accent)" : "transparent",
            color: activeRange === r.value ? "#fff" : "var(--text-secondary)",
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
