"use client";

import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: RoleGuardProps) {
  const { role, loading } = useUserRole();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div
          className="p-4 rounded-xl mb-4"
          style={{ background: "var(--danger-bg)" }}
        >
          <ShieldOff className="w-8 h-8 text-[var(--danger)] mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Access Restricted
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          You don't have permission to view this page.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-bold hover:bg-[var(--accent-hover)] transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
