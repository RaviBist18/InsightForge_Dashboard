import { notFound } from "next/navigation";
import { KPIDetailClient } from "@/components/dashboard/KPIDetailClient";
import { getDashboardStats } from "@/lib/data";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const VALID_SLUGS = [
  "total-revenue",
  "total-profit",
  "profit-margin",
  "total-orders",
  "active-users",
  "churn-rate",
];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

async function getUserRoleAndId(): Promise<{
  role: "admin" | "user";
  userId: string | null;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {}, // no-op: server component can't set cookies
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { role: "user", userId: null };
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return {
      role: profile?.role === "admin" ? "admin" : "user",
      userId: user.id,
    };
  } catch {
    return { role: "user", userId: null };
  }
}

export default async function KPIDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) notFound();

  const [stats, { role, userId }] = await Promise.all([
    getDashboardStats("30d"),
    getUserRoleAndId(),
  ]);

  return (
    <KPIDetailClient
      slug={slug}
      analytics={{}}
      stats={stats}
      role={role}
      persona="balanced"
      userId={userId ?? undefined}
    />
  );
}
