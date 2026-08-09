import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { inviteSchema, parseOrError } from "@/lib/validations";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

    const body = await req.json();
    const { data, error: validationError } = parseOrError(inviteSchema, body);
    if (validationError) {
      return NextResponse.json(
        { error: "Invalid input", details: validationError },
        { status: 400 },
      );
    }
    const { email, role, companyId, companyName } = data;

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

    // only full admins can invite someone as admin (spec: promote/admin-grant stays admin-only)
    if (role === "admin" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can invite new admins" },
        { status: 403 },
      );
    }

    const { data: invite, error: insertError } = await supabaseAdmin
      .from("invitations")
      .insert({
        company_id: companyId,
        email,
        role,
        invited_by: user.id,
      })
      .select("token")
      .single();

    if (insertError || !invite) {
      return NextResponse.json(
        { error: insertError?.message || "Failed to create invite" },
        { status: 500 },
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${origin}/auth?invite=${invite.token}`;

    await transporter.sendMail({
      from: `"InsightForge" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `You're invited to InsightForge`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #003366;">You're invited to InsightForge</h2>
          <p>You've been invited to InsightForge as a <strong>${role}</strong>.</p>
          <a href="${link}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #003366; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Accept Invitation
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 13px;">This link expires in 7 days.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, link });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    );
  }
}
