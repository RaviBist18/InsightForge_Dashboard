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
  X,
  Building2,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

function TeamCard({
  user,
  index,
  isYou,
}: {
  user: UserRecord;
  index: number;
  isYou: boolean;
}) {
  const style = ROLE_STYLE[user.role] ?? ROLE_STYLE.user;
  const RoleIcon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl p-5 flex items-center gap-4 transition-shadow"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
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
          {isYou && (
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
    </motion.div>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearch] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: membership } = await supabase
        .from("memberships")
        .select("company_id, companies(name)")
        .eq("user_id", user.id)
        .single();

      if (!membership?.company_id) return;
      setCompanyName((membership as any).companies?.name ?? null);

      const { data: memberRows } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("company_id", membership.company_id);

      const userIds = (memberRows || []).map((m) => m.user_id);
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", userIds)
        .order("role", { ascending: false });

      if (error) throw error;

      setUsers(
        (data || []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          role: p.role || "user",
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    <div className="space-y-6">
      <div>
        <div
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Link href="dashboard/" className="hover:underline cursor-pointer">
            Dashboard
          </Link>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>Team</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1
                className="text-2xl font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Team
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
              access to this workspace
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

      {/* Stat strip */}
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
            No teammates found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((user, i) => (
              <TeamCard
                key={user.id}
                user={user}
                index={i}
                isYou={user.id === currentUserId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
