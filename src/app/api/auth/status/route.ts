import { NextResponse } from "next/server";
import { googleOAuthConfigured } from "@/lib/auth-server";

export async function GET() {
  return NextResponse.json({
    googleConfigured: googleOAuthConfigured(),
    loginUrl: "/api/auth/google/login",
  });
}
