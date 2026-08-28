import { NextResponse } from "next/server";
import { googleOAuthConfigured } from "@/lib/auth-server";

/**
 * Prefer the CV backend OAuth entrypoint (registered Google redirect URI).
 * Falling back to a local Google redirect would use GOOGLE_REDIRECT_URI without
 * portal=ged and send users to the CV frontend after login.
 */
export async function GET() {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured." },
      { status: 503 }
    );
  }

  const cvAuth =
    process.env.NEXT_PUBLIC_CV_AUTH_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000";

  return NextResponse.redirect(
    `${cvAuth}/api/auth/google/login?portal=ged`,
    307
  );
}
