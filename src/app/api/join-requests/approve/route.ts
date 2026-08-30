import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { joinRequestApproveSchema, parseOrError } from "@/lib/validations";
import { logger } from "@/lib/logger";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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

    const body = await req.json();
    const { data, error: validationError } = parseOrError(
      joinRequestApproveSchema,
      body,
    );
    if (validationError) {
      return NextResponse.json(
        { error: "Invalid request", details: validationError },
        { status: 400 },
      );
    }
    const { requestId, action } = data;

    const { data: joinReq, error: reqErr } = await supabaseAdmin
      .from("join_requests")
      .select("id, user_id, company_id, status")
      .eq("id", requestId)
      .single();

    if (reqErr || !joinReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (joinReq.status !== "pending") {
      return NextResponse.json(
        { error: "Request already resolved" },
        { status: 409 },
      );
    }

    const { data: membership, error: memErr } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", joinReq.company_id)
      .single();

    if (
      memErr ||
      !membership ||
      !["admin", "co-admin"].includes(membership.role)
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "reject") {
      const { error } = await supabaseAdmin
        .from("join_requests")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", requestId);
      if (error) throw error;
      return NextResponse.json({ success: true, status: "rejected" });
    }

    const { error: insertErr } = await supabaseAdmin
      .from("memberships")
      .insert({
        company_id: joinReq.company_id,
        user_id: joinReq.user_id,
        role: "user",
      });
    if (insertErr) throw insertErr;

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ role: "user" })
      .eq("id", joinReq.user_id);
    if (profileErr) throw profileErr;

    const { error: statusErr } = await supabaseAdmin
      .from("join_requests")
      .update({
        status: "approved",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", requestId);
    if (statusErr) throw statusErr;

    return NextResponse.json({ success: true, status: "approved" });
  } catch (err: any) {
    logger.error("join-requests approve route failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
