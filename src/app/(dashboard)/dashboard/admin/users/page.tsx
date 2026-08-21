"use client";
import Link from "next/link";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Lock,
  AlertTriangle,
  UserPlus,
  Copy,
  Check,
  Building2,
  Info,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/common/RoleGuard";

// ─── Types ─────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  full_name: string | null;
  role: "admin" | "co-admin" | "user";
}

const ROLE_STYLE: Record<
  UserRecord["role"],
  {
    ring: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    icon: any;
    label: string;
  }
> = {
  admin: {
    ring: "var(--accent)",
    badgeBg: "var(--accent-subtle)",
    badgeBorder: "var(--accent)",
    badgeText: "var(--accent)",
    icon: ShieldCheck,
    label: "Admin",
  },
  "co-admin": {
    ring: "#b45309",
    badgeBg: "rgba(180,83,9,0.08)",
    badgeBorder: "#b45309",
    badgeText: "#b45309",
    icon: Shield,
    label: "Co-Admin",
  },
  user: {
    ring: "var(--border)",
    badgeBg: "var(--bg-primary)",
    badgeBorder: "var(--border)",
    badgeText: "var(--text-secondary)",
    icon: UserIcon,
    label: "Member",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-lg text-[13px] font-medium",
        type === "success"
          ? "bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]"
          : "bg-[var(--danger-bg)] border-[var(--danger)]/30 text-[var(--danger)]",
      )}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {msg}
    </motion.div>
  );
}

function ReadOnlyBar() {
  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-6 py-2.5 border-b"
      style={{ background: "var(--warning-bg)", borderColor: "var(--warning)" }}
    >
      <Lock size={13} style={{ color: "var(--warning)" }} />
      <span
        className="text-[12px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--warning)" }}
      >
        Read-Only Mode — Viewing as Another User
      </span>
      <AlertTriangle size={13} style={{ color: "var(--warning)" }} />
    </motion.div>
  );
}

function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (msg: string, type: "success" | "error") => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "co-admin" | "user">("user");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!email.includes("@")) {
      onInvited("Enter a valid email address", "error");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: membership } = await supabase
        .from("memberships")
        .select("company_id, companies(name)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!membership?.company_id) throw new Error("No company found");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email,
          role,
          companyId: membership.company_id,
          companyName: (membership as any).companies?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      setLink(data.link);
    } catch (err: any) {
      onInvited(err.message || "Failed to create invite", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border p-6"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-subtle)" }}
            >
              <UserPlus size={15} style={{ color: "var(--accent)" }} />
            </div>
            <h2
              className="text-[15px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Invite Teammate
            </h2>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {!link ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="block text-[12px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Role
              </label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "admin" | "co-admin" | "user")
                }
                className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none cursor-pointer"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="user">User</option>
                <option value="co-admin">Co-Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              {loading ? "Sending Invite..." : "Send Invite Email"}
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="flex items-start gap-3 rounded-xl p-3.5"
              style={{
                background: "var(--success-bg)",
                border: "1px solid var(--success)",
              }}
            >
              <Check
                size={16}
                style={{ color: "var(--success)" }}
                className="flex-shrink-0 mt-0.5"
              />
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--success)" }}
              >
                Email sent to <b>{email}</b>. You can also share the link below
                directly.
              </p>
            </div>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Invite link (expires in 7 days):
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
              }}
            >
              <span
                className="flex-1 text-[12px] truncate font-mono"
                style={{ color: "var(--text-primary)" }}
              >
                {link}
              </span>
              <button
                onClick={handleCopy}
                style={{ color: copied ? "var(--success)" : "var(--accent)" }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onInvited("Invite created", "success");
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-[13px] font-medium"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
              }}
            >
              Done
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── User Card ─────────────────────────────────────────────────────────────

function UserCard({
  user,
  index,
  currentUserId,
  currentUserRole,
  isReadOnly,
  updatingId,
  onRoleChange,
}: {
  user: UserRecord;
  index: number;
  currentUserId: string | null;
  currentUserRole: "admin" | "co-admin" | "user";
  isReadOnly: boolean;
  updatingId: string | null;
  onRoleChange: (id: string, role: "admin" | "co-admin" | "user") => void;
}) {
  const isCurrentUser = user.id === currentUserId;
  const isUpdating = updatingId === user.id;
  const style = ROLE_STYLE[user.role] ?? ROLE_STYLE.user;
  const RoleIcon = style.icon;

  return (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-semibold text-white flex-shrink-0"
          style={{
            background: "var(--accent)",
            boxShadow: `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${style.ring}`,
          }}
        >
          {(user.full_name || "U")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[14px] font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {user.full_name || "Unnamed User"}
            </p>
            {isCurrentUser && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{
                  background: "var(--accent-subtle)",
                  color: "var(--accent)",
                }}
              >
                You
              </span>
            )}
          </div>
          <span
            className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium"
            style={{
              background: style.badgeBg,
              borderColor: style.badgeBorder,
              color: style.badgeText,
            }}
          >
            <RoleIcon size={11} /> {style.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReadOnly = searchParams.get("readonly") === "true";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    "admin" | "co-admin" | "user"
  >("user");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<
    {
      id: string;
      user_id: string;
      company_id: string;
      status: string;
      requested_at: string;
      requester_name: string | null;
      requester_email: string | null;
    }[]
  >([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setCurrentUserRole(
          (myProfile?.role as "admin" | "co-admin" | "user") || "user",
        );

        const { data: membership } = await supabase
          .from("memberships")
          .select("companies(name)")
          .eq("user_id", user.id)
          .single();
        setCompanyName((membership as any)?.companies?.name ?? null);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("role", { ascending: false });

      if (error) throw error;

      setUsers(
        (data || []).map((profile: any) => ({
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role || "user",
        })),
      );
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: membership, error: memErr } = await supabase
        .from("memberships")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (memErr || !membership?.company_id)
        throw new Error("No company found");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/pending-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ companyId: membership.company_id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load");

      setPendingRequests(result.requests);
    } catch (err: any) {
      showToast(err.message || "Failed to load join requests", "error");
    }
  };

  const handleResolveRequest = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    setResolvingId(requestId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/join-requests/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve request");

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast(
        action === "approve" ? "Request approved" : "Request rejected",
        "success",
      );
      if (action === "approve") fetchUsers();
    } catch (err: any) {
      showToast(err.message || "Failed to resolve request", "error");
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingRequests();
  }, []);

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "co-admin" | "user",
  ) => {
    if (isReadOnly) return;
    if (userId === currentUserId && newRole !== currentUserRole) {
      showToast("Cannot change your own role", "error");
      return;
    }
    if (newRole === "admin" && currentUserRole !== "admin") {
      showToast("Only admins can grant admin access", "error");
      return;
    }
    setUpdatingId(userId);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (profileErr) throw profileErr;

      const { error: membershipErr } = await supabase
        .from("memberships")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (membershipErr) throw membershipErr;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      showToast(`Role updated to ${newRole}`, "success");
    } catch {
      showToast("Failed to update role", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewPortfolio = (userId: string) => {
    router.push(`/?readonly=true&userId=${userId}`);
  };

  const ROLE_RANK: Record<UserRecord["role"], number> = {
    admin: 0,
    "co-admin": 1,
    user: 2,
  };

  const filtered = users
    .filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      // 1) role rank: admin, then co-admin, then member
      const roleDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
      if (roleDiff !== 0) return roleDiff;

      // 2) within same role, logged-in user goes first
      const aIsCurrent = a.id === currentUserId;
      const bIsCurrent = b.id === currentUserId;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1;

      // 3) rest alphabetically by name
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    coAdmins: users.filter((u) => u.role === "co-admin").length,
    members: users.filter((u) => u.role === "user").length,
  };

  return (
    <div className={cn("space-y-6", isReadOnly && "pt-14")}>
      {isReadOnly && <ReadOnlyBar />}

      <div>
        <div
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Link href="/dashboard" className="hover:underline cursor-pointer">
            Dashboard
          </Link>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>User Management</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1
                className="text-2xl font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                User Management
              </h1>
              {companyName && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold uppercase tracking-wide"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  <Building2 size={12} /> {companyName}
                </span>
              )}
            </div>
            <p
              className="text-[13px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {stats.total} {stats.total === 1 ? "person has" : "people have"}{" "}
              access — manage roles below
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowRoleInfo((v) => !v)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-all"
              style={{
                background: showRoleInfo
                  ? "var(--accent-subtle)"
                  : "var(--bg-surface)",
                borderColor: showRoleInfo ? "var(--accent)" : "var(--border)",
                color: showRoleInfo ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Info size={14} />
            </motion.button>
            <motion.button
              onClick={() => setShowInvite(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white transition-all"
              style={{ background: "var(--accent)" }}
            >
              <UserPlus size={14} />
              Invite Teammate
            </motion.button>
            <motion.button
              onClick={fetchUsers}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              Refresh
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRoleInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-1">
              {[
                {
                  role: "admin" as const,
                  desc: "Full control — manages billing, invites teammates, changes anyone's role, sees all company data.",
                },
                {
                  role: "co-admin" as const,
                  desc: "Trusted operator — can invite and manage members, but can't grant admin access or touch billing.",
                },
                {
                  role: "user" as const,
                  desc: "Standard access — views company dashboards and their own workspace, can't manage other accounts.",
                },
              ].map(({ role, desc }) => {
                const style = ROLE_STYLE[role];
                const RoleIcon = style.icon;
                return (
                  <div
                    key={role}
                    className="rounded-xl p-4"
                    style={{
                      background: style.badgeBg,
                      border: `1px solid ${style.badgeBorder}`,
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 mb-1.5 text-[12px] font-bold"
                      style={{ color: style.badgeText }}
                    >
                      <RoleIcon size={13} /> {style.label}
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingRequests.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--warning)",
          }}
        >
          <div
            className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {pendingRequests.length} pending join request
              {pendingRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
          <AnimatePresence>
            {pendingRequests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 flex-wrap px-5 py-4 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                  style={{ background: "var(--warning)" }}
                >
                  {(req.requester_name ||
                    req.requester_email ||
                    "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {req.requester_name || "Unnamed User"}
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {req.requester_email || "No email"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={resolvingId === req.id}
                    onClick={() => handleResolveRequest(req.id, "approve")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white disabled:opacity-50 transition-all"
                    style={{ background: "var(--success)" }}
                  >
                    {resolvingId === req.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Approve
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={resolvingId === req.id}
                    onClick={() => handleResolveRequest(req.id, "reject")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium disabled:opacity-50 transition-all"
                    style={{
                      background: "var(--bg-primary)",
                      borderColor: "var(--danger)",
                      color: "var(--danger)",
                    }}
                  >
                    <X size={12} />
                    Reject
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: Users,
            color: "var(--text-primary)",
          },
          {
            label: "Admins",
            value: stats.admins,
            icon: ShieldCheck,
            color: "var(--accent)",
          },
          {
            label: "Co-Admins",
            value: stats.coAdmins,
            icon: Shield,
            color: "#b45309",
          },
          {
            label: "Members",
            value: stats.members,
            icon: UserIcon,
            color: "var(--text-secondary)",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
              <Icon size={13} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </span>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or role..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] focus:outline-none transition-all"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: "var(--accent)" }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl py-20 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <Users
            className="w-8 h-8 mx-auto mb-2"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            No users found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((user, i) => (
              <UserCard
                key={user.id}
                user={user}
                index={i}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                isReadOnly={isReadOnly}
                updatingId={updatingId}
                onRoleChange={handleRoleChange}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>

      <AnimatePresence>
        {showInvite && (
          <InviteModal
            onClose={() => setShowInvite(false)}
            onInvited={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin", "co-admin"]}>
      <AdminUsersContent />
    </RoleGuard>
  );
}
