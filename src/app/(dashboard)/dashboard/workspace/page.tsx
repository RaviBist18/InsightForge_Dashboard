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

      const membershipRes = await supabase
        .from("memberships")
        .select("company_id, companies(name)")
        .eq("user_id", user.id)
        .single();
      const companyId = membershipRes.data?.company_id ?? null;
      const companyName = (membershipRes.data as any)?.companies?.name ?? null;

      const mrr = 0;
      const signups = 0;
      const churn = 0;

      setProps({
        userId: user.id,
        userEmail: user.email ?? "",
        companyId,
        companyName,
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
