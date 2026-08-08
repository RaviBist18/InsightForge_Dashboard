"use client";
// src/app/(dashboard)/dashboard/workspace/page.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceClient from "@/app/(dashboard)/dashboard/workspace/WorkspaceClient";

export default function WorkspacePage() {
  const [ready, setReady] = useState(false);
  const [props, setProps] = useState<any>(null);

  const isReadOnly =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("readonly") === "true";

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }

      const [profileRes, snapshotsRes, entitiesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("forensic_snapshots")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("business_entities")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const briefingRes = await supabase
        .from("briefing_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const transactionsRes = await supabase
        .from("transactions")
        .select("amount, status, customer, created_at")
        .order("created_at", { ascending: true }); // ascending — needed to find each customer's FIRST transaction

      const transactions = transactionsRes.data ?? [];

      // bug fix: real status value is "Completed" (capital C) — lowercase filter never matched, mrr was always 0
      const mrr = transactions
        .filter((t: any) => t.status?.toLowerCase() === "completed")
        .reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);

      // real signups/churn — no dedicated table exists, so both are derived
      // honestly from transaction history instead of faked with Math.random().
      // Small dataset = noisy numbers, but real, not invented.
      const now = new Date();
      const monthKey = (d: string) =>
        new Date(d).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      const currentMonthKey = now.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = prevMonth.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const firstSeenByCustomer: Record<string, string> = {};
      const customersByMonth: Record<string, Set<string>> = {};
      transactions.forEach((t: any) => {
        if (!t.customer) return;
        const key = monthKey(t.created_at);
        if (!firstSeenByCustomer[t.customer])
          firstSeenByCustomer[t.customer] = key;
        if (!customersByMonth[key]) customersByMonth[key] = new Set();
        customersByMonth[key].add(t.customer);
      });

      const signups = Object.values(firstSeenByCustomer).filter(
        (k) => k === currentMonthKey,
      ).length;

      const prevCustomers = customersByMonth[prevMonthKey] ?? new Set();
      const currCustomers = customersByMonth[currentMonthKey] ?? new Set();
      const retained = [...prevCustomers].filter((c) =>
        currCustomers.has(c),
      ).length;
      const churn =
        prevCustomers.size > 0
          ? parseFloat(
              (
                ((prevCustomers.size - retained) / prevCustomers.size) *
                100
              ).toFixed(1),
            )
          : 0;

      setProps({
        userId: user.id,
        userEmail: user.email ?? "",
        profile: profileRes.data,
        briefingSettings: briefingRes.data,
        initialSnapshots: snapshotsRes.data ?? [],
        initialEntities: entitiesRes.data ?? [],
        mrr,
        churn,
        signups,
        isReadOnly,
        role: (profileRes.data?.role as "admin" | "user") ?? "user",
      });
      setReady(true);
    }

    load();
  }, []);

  if (!ready)
    return (
      <div
        className="min-h-screen flex items-center justify-center text-[var(--accent)] font-bold text-sm"
        style={{ background: "var(--bg-primary)" }}
      >
        Loading...
      </div>
    );

  return <WorkspaceClient {...props} />;
}
