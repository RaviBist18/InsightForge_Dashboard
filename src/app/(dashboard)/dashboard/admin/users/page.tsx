"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Eye,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/common/RoleGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  full_name: string | null;
  role: "admin" | "user";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Read-Only Bar ────────────────────────────────────────────────────────────

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

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  index,
  currentUserId,
  isReadOnly,
  updatingId,
  onRoleChange,
  onViewPortfolio,
}: {
  user: UserRecord;
  index: number;
  currentUserId: string | null;
  isReadOnly: boolean;
  updatingId: string | null;
  onRoleChange: (id: string, role: "admin" | "user") => void;
  onViewPortfolio: (id: string) => void;
}) {
  const isCurrentUser = user.id === currentUserId;
  const isUpdating = updatingId === user.id;

  return (
    <motion.div
      key={user.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-4 flex-wrap px-5 py-4 border-b last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
        style={{ background: "var(--accent)" }}
      >
        {(user.full_name || "U")[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="text-[13px] font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {user.full_name || "Unnamed User"}
          </p>
          {isCurrentUser && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
              }}
            >
              You
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium"
          style={{
            background:
              user.role === "admin"
                ? "var(--accent-subtle)"
                : "var(--bg-primary)",
            borderColor:
              user.role === "admin" ? "var(--accent)" : "var(--border)",
            color:
              user.role === "admin" ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          <Shield size={11} /> {user.role}
        </span>

        <div className="relative">
          <select
            value={user.role}
            onChange={(e) =>
              onRoleChange(user.id, e.target.value as "admin" | "user")
            }
            disabled={isUpdating || isCurrentUser || isReadOnly}
            className={cn(
              "appearance-none px-3 py-1.5 pr-7 rounded-xl border text-[12px] font-medium focus:outline-none cursor-pointer transition-all",
              (isUpdating || isCurrentUser || isReadOnly) &&
                "opacity-50 cursor-not-allowed",
            )}
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown
            size={11}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
        </div>

        {isUpdating && (
          <Loader2
            size={14}
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          />
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onViewPortfolio(user.id)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all flex-shrink-0"
        style={{
          background: "var(--accent-subtle)",
          borderColor: "var(--accent)",
          color: "var(--accent)",
        }}
      >
        <Eye size={12} /> View
      </motion.button>
    </motion.div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReadOnly = searchParams.get("readonly") === "true";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

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

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("role", { ascending: false });

      if (error) throw error;

      const merged: UserRecord[] = (data || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role || "user",
      }));

      setUsers(merged);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "user",
  ) => {
    if (isReadOnly) return;
    if (userId === currentUserId && newRole === "user") {
      showToast("Cannot demote yourself", "error");
      return;
    }
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
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

  const filtered = users.filter((u) => {
    return (
      (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className={cn("space-y-6", isReadOnly && "pt-14")}>
      {isReadOnly && <ReadOnlyBar />}

      <div>
        <div
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span>Dashboard</span>
          <span className="opacity-40">/</span>
          <span style={{ color: "var(--accent)" }}>User Management</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              User Management
            </h1>
            <p
              className="text-[13px] mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              View accounts and manage role access
            </p>
          </div>
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

      <div className="grid grid-cols-2 gap-3 max-w-md">
        {[
          {
            label: "Total Users",
            value: stats.total,
            icon: <Users size={14} />,
          },
          { label: "Admins", value: stats.admins, icon: <Shield size={14} /> },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex items-center gap-1.5 mb-2"
              style={{ color: "var(--accent)" }}
            >
              {icon}
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </span>
            </div>
            <p
              className="text-2xl font-semibold"
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

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="px-5 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: "var(--accent)" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
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
          <div>
            <AnimatePresence>
              {filtered.map((user, i) => (
                <UserRow
                  key={user.id}
                  user={user}
                  index={i}
                  currentUserId={currentUserId}
                  isReadOnly={isReadOnly}
                  updatingId={updatingId}
                  onRoleChange={handleRoleChange}
                  onViewPortfolio={handleViewPortfolio}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminUsersContent />
    </RoleGuard>
  );
}
