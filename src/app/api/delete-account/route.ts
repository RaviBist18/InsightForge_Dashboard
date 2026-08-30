import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

    // remove all user-owned rows before deleting the auth user
    await supabaseAdmin
      .from("briefing_settings")
      .delete()
      .eq("user_id", user.id);
    await supabaseAdmin
      .from("business_entities")
      .delete()
      .eq("user_id", user.id);
    await supabaseAdmin
      .from("dashboard_layouts")
      .delete()
      .eq("user_id", user.id);
    await supabaseAdmin
      .from("forensic_snapshots")
      .delete()
      .eq("user_id", user.id);
    await supabaseAdmin.from("invitations").delete().eq("invited_by", user.id);
    await supabaseAdmin.from("join_requests").delete().eq("user_id", user.id);
    await supabaseAdmin.from("transactions").delete().eq("user_id", user.id);
    await supabaseAdmin.from("why_feed_cache").delete().eq("user_id", user.id);
    await supabaseAdmin.from("reports").delete().eq("created_by", user.id);
    await supabaseAdmin.from("memberships").delete().eq("user_id", user.id);
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
    );
    if (deleteErr) {
      return NextResponse.json(
        { error: deleteErr.message || "Failed to delete account" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("delete-account route failed", {
      error: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
