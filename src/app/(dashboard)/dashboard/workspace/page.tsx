"use client";
// src/app/(dashboard)/dashboard/workspace/page.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import WorkspaceClient from "@/app/(dashboard)/dashboard/workspace/WorkspaceClient";

export default function WorkspacePage() {
    const [ready, setReady] = useState(false);
    const [props, setProps] = useState<any>(null);

    const isReadOnly = typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("readonly") === "true";

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { window.location.href = "/auth"; return; }

            const [profileRes, briefingRes, snapshotsRes, entitiesRes, transactionsRes] =
                await Promise.all([
                    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
                    supabase.from("briefing_settings").select("*").eq("user_id", user.id).single(),
                    supabase.from("forensic_snapshots").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
                    supabase.from("business_entities").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
                    supabase.from("transactions").select("amount, status, created_at").order("created_at", { ascending: false }).limit(90),
                ]);

            const transactions = transactionsRes.data ?? [];
            const mrr = transactions.filter((t: any) => t.status === "completed").reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);

            setProps({
                userId: user.id,
                userEmail: user.email ?? "",
                profile: profileRes.data,
                briefingSettings: briefingRes.data,
                initialSnapshots: snapshotsRes.data ?? [],
                initialEntities: entitiesRes.data ?? [],
                mrr,
                churn: parseFloat((Math.random() * 3 + 1.5).toFixed(1)),
                signups: Math.floor(Math.random() * 40 + 20),
                isReadOnly,
            });
            setReady(true);
        }

        load();
    }, []);

    if (!ready) return (
        <div className="min-h-screen bg-[#050a15] flex items-center justify-center text-sky-500 font-black uppercase tracking-widest text-xs">
            Initializing War Room...
        </div>
    );

    return <WorkspaceClient {...props} />;
}