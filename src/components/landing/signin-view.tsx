"use client";

import { Suspense, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, GoogleIcon } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { BrandName } from "@/components/landing/brand-name";

const perks = [
  "AI tutor aligned to Oman MoE Grades 9–12",
  "Upload textbooks and ask chapter-specific questions",
  "Track mastery across Basic Education and the GED",
];

function SignInContent() {
  const { signInWithGoogle, googleConfigured, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const errorMessages: Record<string, string> = {
    access_denied: "Google sign-in was cancelled.",
    invalid_state: "Sign-in session expired. Please try again.",
    auth_failed: "Google sign-in failed. Please try again.",
    no_email: "Your Google account has no email address.",
  };

  const error = errorParam
    ? errorMessages[errorParam] || "Sign-in failed."
    : null;

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
          <h2>Welcome back</h2>
          <p className="sub">Sign in with Google to continue.</p>

          <div style={{ marginTop: "2rem" }}>
            {!googleConfigured && (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                Google OAuth is not configured. Check{" "}
                <code className="rounded bg-black/30 px-1">.env.local</code>.
              </div>
            )}

            <Button
              variant="google"
              size="lg"
              className="w-full !rounded-full !font-medium"
              onClick={signInWithGoogle}
              disabled={!googleConfigured}
            >
              <GoogleIcon className="h-5 w-5" />
              Continue with Google
            </Button>

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                {error}
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
              By signing in, you agree to our Terms and Privacy Policy.
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
