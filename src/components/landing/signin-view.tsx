"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { BrandName } from "@/components/landing/brand-name";

const perks = [
  "AI tutor aligned to Oman MoE Grades 9–12",
  "Upload textbooks and ask chapter-specific questions",
  "Track mastery across Basic Education and the GED",
];

function SignInContent() {
  const { signInWithEmail, signUpWithEmail, authConfigured, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    const map: Record<string, string> = {
      auth_failed: "Sign-in failed. Please try again.",
      no_email: "Your account has no email address.",
      access_denied: "Sign-in was cancelled.",
    };
    if (errorParam) setError(map[errorParam] || "Sign-in failed.");
  }, [errorParam]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        window.location.replace("/dashboard");
        return;
      }
      const result = await signUpWithEmail(email, password, displayName);
      if (result.needsEmailConfirmation) {
        setInfo(
          "Account created. Check your email to confirm, then sign in."
        );
        setMode("signin");
        return;
      }
      window.location.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp-signin">
      <div className="lp-signin-visual">
        <Image
          src="/images/oman/coast-signin.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          quality={90}
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent max-lg:bg-gradient-to-b max-lg:from-black/40 max-lg:via-transparent max-lg:to-black/90"
          aria-hidden
        />

        <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between p-8 sm:p-10 lg:min-h-full lg:p-12">
          <Link href="/" className="lp-brand">
            <BrandName />
          </Link>

          <div className="hidden max-w-md lg:block">
            <p className="lp-kicker">Oman MoE pathway</p>
            <h1 className="lp-title" style={{ fontSize: "2.5rem" }}>
              Your study partner for Oman&apos;s curriculum.
            </h1>
            <p className="lp-lede" style={{ color: "rgba(237,237,237,0.7)" }}>
              From Grade 9 Basic Education through the Grade 12 General
              Education Diploma.
            </p>
            <ul
              style={{
                marginTop: "2rem",
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              {perks.map((text) => (
                <li
                  key={text}
                  style={{
                    fontSize: "0.9375rem",
                    color: "rgba(237,237,237,0.85)",
                    letterSpacing: "-0.01em",
                    display: "flex",
                    gap: "0.65rem",
                  }}
                >
                  <span style={{ color: "var(--lp-green)" }}>✓</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <span className="hidden lg:block" />
        </div>
      </div>

      <div className="lp-signin-panel relative">
        <Link
          href="/"
          className="absolute left-5 top-5 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="lp-signin-card">
          <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
          <p className="sub">
            {mode === "signin"
              ? "Sign in with your email to continue studying."
              : "Join GED MADE EZ — Oman Grades 9–12, powered by your books."}
          </p>

          <div style={{ marginTop: "1.75rem" }}>
            {!authConfigured && (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                Supabase Auth is not configured. Add{" "}
                <code className="rounded bg-black/30 px-1">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="rounded bg-black/30 px-1">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                to <code className="rounded bg-black/30 px-1">.env.local</code>.
              </div>
            )}

            <div
              className="mb-5 grid grid-cols-2 gap-1 rounded-full p-1"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setInfo(null);
                }}
                className="rounded-full px-3 py-2 text-sm font-medium transition"
                style={{
                  background:
                    mode === "signin" ? "rgba(255,255,255,0.12)" : "transparent",
                  color: mode === "signin" ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfo(null);
                }}
                className="rounded-full px-3 py-2 text-sm font-medium transition"
                style={{
                  background:
                    mode === "signup" ? "rgba(255,255,255,0.12)" : "transparent",
                  color: mode === "signup" ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs text-white/50">
                    Display name
                  </span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs text-white/50">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu.om"
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs text-white/50">
                  Password
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup" ? "At least 6 characters" : "Your password"
                    }
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                  />
                </div>
              </label>

              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full !rounded-full !font-medium"
                disabled={!authConfigured || busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : mode === "signin" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            {info && (
              <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {info}
              </p>
            )}

            <p
              style={{
                marginTop: "1.5rem",
                textAlign: "center",
                fontSize: "0.75rem",
                color: "var(--lp-faint)",
              }}
            >
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SignInView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/50">
          Loading…
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
