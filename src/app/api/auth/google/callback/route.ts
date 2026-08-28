import { NextRequest, NextResponse } from "next/server";
import {
  authConfig,
  createAccessToken,
  exchangeCodeForGoogleUser,
  verifyOAuthState,
} from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      `${authConfig.frontendUrl}/auth/signin?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state || !(await verifyOAuthState(state))) {
    return NextResponse.redirect(
      `${authConfig.frontendUrl}/auth/signin?error=invalid_state`
    );
  }

  try {
    const googleUser = await exchangeCodeForGoogleUser(code);
    const email = (googleUser.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.redirect(
        `${authConfig.frontendUrl}/auth/signin?error=no_email`
      );
    }

    const token = await createAccessToken({
      sub: googleUser.sub,
      email,
      name: googleUser.name || email.split("@")[0],
      picture: googleUser.picture || "",
    });

    return NextResponse.redirect(
      `${authConfig.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`
    );
  } catch {
    return NextResponse.redirect(
      `${authConfig.frontendUrl}/auth/signin?error=auth_failed`
    );
  }
}
