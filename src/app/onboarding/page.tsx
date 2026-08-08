"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Search,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Users,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type View = "choice" | "create" | "join" | "pending";

interface CompanyMatch {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create company state
  const [companyName, setCompanyName] = useState("");

  // Join company state
  const [searchMode, setSearchMode] = useState<"name" | "email">("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyMatch | null>(
    null,
  );

  const handleSkip = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: skipErr } = await supabase
        .from("profiles")
        .update({ onboarding_skipped: true })
        .eq("id", user.id);
      if (skipErr) throw skipErr;

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to skip");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      setError("Enter a company name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: company, error: companyErr } = await supabase
        .from("companies")
        .insert({
          name: companyName.trim(),
          plan: "starter",
          sector: "unspecified",
        })
        .select("id")
        .single();
      if (companyErr) throw companyErr;

      const { error: membershipErr } = await supabase
        .from("memberships")
        .insert({ company_id: company.id, user_id: user.id, role: "admin" });
      if (membershipErr) throw membershipErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    setMatches([]);
    try {
      if (searchMode === "name") {
        const { data, error: searchErr } = await supabase
          .from("companies")
          .select("id, name")
          .ilike("name", `%${searchQuery.trim()}%`)
          .limit(5);
        if (searchErr) throw searchErr;
        setMatches(data || []);
        if (!data || data.length === 0)
          setError("No companies found with that name");
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const res = await fetch("/api/onboarding/find-company", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: searchQuery.trim() }),
        });
        const result = await res.json();

        if (!res.ok) {
          setError(result.error || "Search failed");
          return;
        }
        setMatches([{ id: result.id, name: result.name }]);
      }
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing, error: existingErr } = await supabase
        .from("join_requests")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("company_id", selectedCompany.id)
        .maybeSingle();
      if (existingErr) throw existingErr;

      if (existing?.status === "pending") {
        setView("pending");
        return;
      }

      if (existing) {
        const { error: updErr } = await supabase
          .from("join_requests")
          .update({ status: "pending" })
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: reqErr } = await supabase.from("join_requests").insert({
          user_id: user.id,
          company_id: selectedCompany.id,
          status: "pending",
        });
        if (reqErr) throw reqErr;
      }

      setView("pending");
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-white text-base mb-3"
                style={{ background: "var(--accent)" }}
              >
                IF
              </div>
              <h1
                className="text-[19px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Welcome to InsightForge
              </h1>
              <p
                className="text-[13px] mt-1 text-center"
                style={{ color: "var(--text-secondary)" }}
              >
                {view === "choice" && "Let's get your workspace set up"}
                {view === "create" && "Name your company"}
                {view === "join" && "Find your company"}
                {view === "pending" && "Request sent"}
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-xl p-3.5 mb-5"
                  style={{
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger)",
                  }}
                >
                  <AlertCircle
                    size={16}
                    style={{ color: "var(--danger)" }}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--danger)" }}
                  >
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* ── Choice screen ── */}
              {view === "choice" && (
                <motion.div
                  key="choice"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <button
                    onClick={() => {
                      setView("create");
                      setError(null);
                    }}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg-primary)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border)")
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent-subtle)" }}
                    >
                      <Sparkles size={18} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Create a Company
                      </p>
                      <p
                        className="text-[12px] mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Start fresh and become the admin of a new workspace
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="flex-shrink-0 mt-2"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </button>

                  <button
                    onClick={() => {
                      setView("join");
                      setError(null);
                    }}
                    className="w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg-primary)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border)")
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent-subtle)" }}
                    >
                      <Users size={18} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Join a Company
                      </p>
                      <p
                        className="text-[12px] mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Request access to an existing team's workspace
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="flex-shrink-0 mt-2"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </button>

                  <button
                    onClick={handleSkip}
                    disabled={loading}
                    className="w-full py-2.5 text-[12px] font-medium text-center transition-colors disabled:opacity-50"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {loading ? "..." : "Skip for now"}
                  </button>
                </motion.div>
              )}

              {/* ── Create company ── */}
              {view === "create" && (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label
                      className="block text-[12px] font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Analytics"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors"
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "var(--accent)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "var(--border)")
                        }
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCreateCompany}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)" }}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {loading ? "Creating..." : "Create Company"}
                  </button>

                  <button
                    onClick={() => {
                      setView("choice");
                      setError(null);
                      setCompanyName("");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                </motion.div>
              )}

              {/* ── Join company ── */}
              {view === "join" && (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div
                    className="flex gap-2 p-1 rounded-xl"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <button
                      onClick={() => {
                        setSearchMode("name");
                        setMatches([]);
                        setSelectedCompany(null);
                        setError(null);
                      }}
                      className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                      style={
                        searchMode === "name"
                          ? {
                              background: "var(--bg-surface)",
                              color: "var(--text-primary)",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }
                          : { color: "var(--text-secondary)" }
                      }
                    >
                      By Company Name
                    </button>
                    <button
                      onClick={() => {
                        setSearchMode("email");
                        setMatches([]);
                        setSelectedCompany(null);
                        setError(null);
                      }}
                      className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                      style={
                        searchMode === "email"
                          ? {
                              background: "var(--bg-surface)",
                              color: "var(--text-primary)",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            }
                          : { color: "var(--text-secondary)" }
                      }
                    >
                      By Admin Email
                    </button>
                  </div>

                  <div className="relative">
                    {searchMode === "name" ? (
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder={
                        searchMode === "name"
                          ? "Search company name..."
                          : "admin@company.com"
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border)")
                      }
                      autoFocus
                    />
                  </div>

                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium border transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {searching ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    {searching ? "Searching..." : "Search"}
                  </button>

                  <AnimatePresence>
                    {matches.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {matches.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCompany(c)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                            style={
                              selectedCompany?.id === c.id
                                ? {
                                    borderColor: "var(--accent)",
                                    background: "var(--accent-subtle)",
                                  }
                                : {
                                    borderColor: "var(--border)",
                                    background: "var(--bg-primary)",
                                  }
                            }
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "var(--accent-subtle)" }}
                            >
                              <Building2
                                size={14}
                                style={{ color: "var(--accent)" }}
                              />
                            </div>
                            <span
                              className="text-[13px] font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selectedCompany && (
                    <button
                      onClick={handleSendRequest}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "var(--accent)" }}
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ArrowRight size={14} />
                      )}
                      {loading
                        ? "Sending..."
                        : `Request to Join ${selectedCompany.name}`}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setView("choice");
                      setError(null);
                      setSearchQuery("");
                      setMatches([]);
                      setSelectedCompany(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                </motion.div>
              )}

              {/* ── Pending confirmation ── */}
              {view === "pending" && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "var(--success-bg)" }}
                  >
                    <CheckCircle2
                      size={26}
                      style={{ color: "var(--success)" }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-[14px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Request sent to {selectedCompany?.name}
                    </p>
                    <p
                      className="text-[12px] mt-1.5 leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      An admin will review your request. You'll get access once
                      approved — check back soon.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-2.5 rounded-xl text-[13px] font-medium border transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Refresh Status
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p
          className="text-center text-[12px] mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          © 2026 InsightForge
        </p>
      </motion.div>
    </div>
  );
}
