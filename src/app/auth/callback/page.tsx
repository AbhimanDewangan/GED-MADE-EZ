"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const { completeLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("token");

    if (!token) {
      setError("No authentication token received.");
      return;
    }

    void (async () => {
      try {
        await completeLogin(token);
        if (cancelled) return;
        // Hard navigation avoids App Router + Strict Mode races that leave
        // this page stuck on "Completing Google sign-in…" after a successful login.
        window.location.replace("/dashboard");
      } catch {
        if (!cancelled) {
          setError("Failed to complete sign-in. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, completeLogin]);

  if (error) {
    return (
      <>
        <p className="text-red-400">{error}</p>
        <Link href="/auth/signin">
          <Button className="mt-5">Back to login</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-400" />
      <p className="text-white/80">Completing Google sign-in…</p>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
        <Suspense
          fallback={
            <>
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-white/80">Completing Google sign-in…</p>
            </>
          }
        >
          <AuthCallbackInner />
        </Suspense>
      </div>
    </div>
  );
}
