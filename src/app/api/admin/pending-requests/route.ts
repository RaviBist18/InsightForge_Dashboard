import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { companyId } = await req.json();
    if (!companyId) {
      return NextResponse.json(
        { error: "companyId required" },
        { status: 400 },
      );
    }

    // verify caller is actually admin/co-admin of THIS company
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (
      memErr ||
      !membership ||
      !["admin", "co-admin"].includes(membership.role)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: requests, error: reqErr } = await supabaseAdmin
      .from("join_requests")
      .select("id, user_id, company_id, status, requested_at")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false });
    if (reqErr) throw reqErr;

    const userIds = [...new Set((requests || []).map((r) => r.user_id))];
    let profileMap: Record<
      string,
      { full_name: string | null; email_id: string | null }
    > = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email_id")
        .in("id", userIds);
      if (profErr) throw profErr;
      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    }

    const mapped = (requests || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      company_id: r.company_id,
      status: r.status,
      requested_at: r.requested_at,
      requester_name: profileMap[r.user_id]?.full_name ?? null,
      requester_email: profileMap[r.user_id]?.email_id ?? null,
    }));

    return NextResponse.json({ requests: mapped });
  } catch (err: any) {
    logger.error("pending-requests route failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
