import { DashboardShell } from "@/components/layout/DashboardShell";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Double-lock: server-side check in addition to middleware
  if (!session) {
    redirect("/auth");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, companies(name)")
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_skipped")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile?.onboarding_skipped) {
      redirect("/onboarding");
    }
  }

  const companyName = (membership as any)?.companies?.name ?? null;

  return (
    <WorkspaceProvider>
      <DashboardShell companyName={companyName} hasCompany={!!membership}>
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  );
}
