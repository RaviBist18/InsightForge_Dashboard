import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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
    const { email, role, companyId, invitedBy, companyName } = await req.json();

    if (!email || !role || !companyId || !invitedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data: invite, error: insertError } = await supabaseAdmin
      .from("invitations")
      .insert({
        company_id: companyId,
        email,
        role,
        invited_by: invitedBy,
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
