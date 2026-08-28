import { NextRequest, NextResponse } from "next/server";
import { isSuperAdminEmail } from "@/lib/admin";
import { decodeAccessToken, type AppUser } from "@/lib/auth-server";
import { loadClassroomStore } from "@/lib/classroom-store";
import { canAccessTeacherConsole, resolveIsTeacher } from "@/lib/teacher";

export async function requireUser(
  request: NextRequest
): Promise<{ user: AppUser } | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const user = await decodeAccessToken(token);
    return { user };
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired session. Please sign in again." },
      { status: 401 }
    );
  }
}

export async function requireTeacher(
  request: NextRequest
): Promise<{ user: AppUser; isTeacher: boolean; isSuperAdmin: boolean } | NextResponse> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const store = await loadClassroomStore();
  const isSuperAdmin = isSuperAdminEmail(auth.user.email);
  const isTeacher = resolveIsTeacher(store, auth.user.email);

  if (!canAccessTeacherConsole(store, auth.user.email)) {
    return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
  }

  return { user: auth.user, isTeacher, isSuperAdmin };
}

export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ user: AppUser } | NextResponse> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  if (!isSuperAdminEmail(auth.user.email)) {
    return NextResponse.json({ error: "Super admin access required." }, { status: 403 });
  }
  return { user: auth.user };
}
