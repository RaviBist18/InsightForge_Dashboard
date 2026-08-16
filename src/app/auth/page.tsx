"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

const VERCEL_URL = "https://insight-forge-dashboard.vercel.app";

// ─── Google Icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// ─── Input Field ──────────────────────────────────────────────────────────────
const InputField = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  rightElement,
  error,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  rightElement?: React.ReactNode;
  error?: string;
}) => (
  <div className="space-y-1.5">
    <label
      htmlFor={id}
      className="block text-[12px] font-medium"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors duration-150"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
        }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = "var(--border)";
        }}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-[12px] font-medium flex items-center gap-1"
          style={{ color: "var(--danger)" }}
        >
          <AlertCircle size={11} /> {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    <span
      className="text-[11px] font-medium uppercase tracking-wide"
      style={{ color: "var(--text-muted)" }}
    >
      {label}
    </span>
    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
  </div>
);

// ─── Auth Page ────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setFieldErrors({});
    setSuccessMsg(null);
    setPassword("");
    setConfirmPassword("");
  }, [mode]);

  const getRedirectURL = () => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost";
      return isLocal
        ? "http://localhost:3000/auth/callback"
        : `${VERCEL_URL}/auth/callback`;
    }
    return `${VERCEL_URL}/auth/callback`;
  };

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!email.includes("@")) errs.email = "Enter a valid email address";
    if (password.length < 6)
      errs.password = "Password must be at least 6 characters";
    if (mode === "signup" && password !== confirmPassword)
      errs.confirm = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Google OAuth ──
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getRedirectURL()}?next=/dashboard`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // ── Email/Password ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "forgot") {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${getRedirectURL()}?next=/dashboard/settings`,
        });
        if (error) throw error;
        setSuccessMsg("Check your email for a password reset link.");
      } catch (err: any) {
        setError(err.message || "Failed to send reset email.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const inviteToken =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("invite")
            : null;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || undefined,
              ...(inviteToken ? { invite_token: inviteToken } : {}),
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setSuccessMsg(
            "Account created. Check your email to confirm before signing in.",
          );
        }
      }
    } catch (err: any) {
      const msg = err.message || "Authentication failed.";
      if (msg.toLowerCase().includes("invalid login"))
        setError("Wrong email or password.");
      else if (msg.toLowerCase().includes("already registered"))
        setError("This email is already registered. Try signing in.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="transition-colors p-0.5"
      style={{ color: "var(--text-muted)" }}
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-md"
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
              <Link
                href="/"
                className="flex flex-col items-center cursor-pointer"
              >
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
                  InsightForge
                </h1>
              </Link>
              <p
                className="text-[13px] mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {mode === "login" && "Sign in to your account"}
                {mode === "signup" && "Create your account"}
                {mode === "forgot" && "Reset your password"}
              </p>
            </div>

            {/* Success */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-xl p-3.5 mb-5"
                  style={{
                    background: "var(--success-bg)",
                    border: "1px solid var(--success)",
                  }}
                >
                  <CheckCircle2
                    size={16}
                    style={{ color: "var(--success)" }}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--success)" }}
                  >
                    {successMsg}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
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
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "forgot" ? (
                  <div className="space-y-5">
                    <p
                      className="text-[13px] leading-relaxed text-center"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Enter your email and we'll send you a reset link.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <InputField
                        id="forgot-email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="you@example.com"
                        autoComplete="email"
                        error={fieldErrors.email}
                        rightElement={
                          <Mail
                            size={14}
                            style={{ color: "var(--text-muted)" }}
                          />
                        }
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: "var(--accent)" }}
                      >
                        {loading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />{" "}
                            Sending...
                          </>
                        ) : (
                          "Send Reset Link"
                        )}
                      </button>
                    </form>
                    <button
                      onClick={() => setMode("login")}
                      className="w-full text-center text-[13px] font-medium transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Google */}
                    <button
                      type="button"
                      onClick={handleGoogle}
                      disabled={googleLoading || loading}
                      className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {googleLoading ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                          style={{ color: "var(--text-muted)" }}
                        />
                      ) : (
                        <GoogleIcon />
                      )}
                      {googleLoading
                        ? "Redirecting..."
                        : "Continue with Google"}
                    </button>

                    <Divider label="or" />

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {mode === "signup" && (
                        <InputField
                          id="fullName"
                          label="Full Name"
                          type="text"
                          value={fullName}
                          onChange={setFullName}
                          placeholder="Enter your full name"
                          autoComplete="name"
                        />
                      )}
                      <InputField
                        id="email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="you@example.com"
                        autoComplete="email"
                        error={fieldErrors.email}
                      />
                      <InputField
                        id="password"
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={setPassword}
                        placeholder="••••••••"
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        error={fieldErrors.password}
                        rightElement={eyeBtn(showPassword, () =>
                          setShowPassword((v) => !v),
                        )}
                      />
                      {mode === "signup" && (
                        <InputField
                          id="confirm"
                          label="Confirm Password"
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          error={fieldErrors.confirm}
                          rightElement={eyeBtn(showConfirm, () =>
                            setShowConfirm((v) => !v),
                          )}
                        />
                      )}
                      {mode === "login" && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setMode("forgot")}
                            className="text-[12px] font-medium transition-colors"
                            style={{ color: "var(--accent)" }}
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={loading || googleLoading}
                        className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                        style={{ background: "var(--accent)" }}
                      >
                        {loading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />{" "}
                            {mode === "login"
                              ? "Signing in..."
                              : "Creating account..."}
                          </>
                        ) : (
                          <>
                            {mode === "login" ? "Sign In" : "Create Account"}{" "}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </form>

                    {mode === "signup" && (
                      <p
                        className="text-[12px] text-center leading-relaxed"
                        style={{ color: "var(--text-muted)" }}
                      >
                        By creating an account, you agree to our{" "}
                        <span
                          className="cursor-pointer hover:underline"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Terms of Service
                        </span>{" "}
                        and{" "}
                        <span
                          className="cursor-pointer hover:underline"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Privacy Policy
                        </span>
                        .
                      </p>
                    )}

                    <div
                      className="pt-3 border-t text-center"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {mode === "login"
                          ? "Don't have an account? "
                          : "Already have an account? "}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMode(mode === "login" ? "signup" : "login")
                        }
                        className="text-[13px] font-medium transition-colors"
                        style={{ color: "var(--accent)" }}
                      >
                        {mode === "login" ? "Sign up" : "Sign in"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
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
