import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-request";
import { joinClassWithCode } from "@/lib/classroom-store";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { joinCode?: string };
  if (!body.joinCode?.trim()) {
    return NextResponse.json({ error: "Join code is required." }, { status: 400 });
  }

  try {
    const result = await joinClassWithCode({
      joinCode: body.joinCode,
      studentId: auth.user.id || auth.user.email,
      studentEmail: auth.user.email,
      studentName: auth.user.name,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not join class." },
      { status: 400 }
    );
  }
}
