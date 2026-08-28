import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth-server";
import { requireTeacher } from "@/lib/auth-request";
import { isSuperAdminEmail } from "@/lib/admin";
import {
  createAssignment,
  getClassById,
  listAssignmentsForClass,
} from "@/lib/classroom-store";
import type { AssignmentType } from "@/lib/classroom-types";

type Ctx = { params: Promise<{ classId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireTeacher(request);
  if (auth instanceof NextResponse) return auth;

  const { classId } = await context.params;
  const room = await getClassById(classId);
  if (!room) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }
  if (
    normalizeEmail(room.teacherEmail) !== normalizeEmail(auth.user.email) &&
    !isSuperAdminEmail(auth.user.email)
  ) {
    return NextResponse.json({ error: "Not your class." }, { status: 403 });
  }

  const assignments = await listAssignmentsForClass(classId);
  return NextResponse.json({ assignments });
}

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireTeacher(request);
  if (auth instanceof NextResponse) return auth;

  const { classId } = await context.params;
  const room = await getClassById(classId);
  if (!room) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }
  if (
    normalizeEmail(room.teacherEmail) !== normalizeEmail(auth.user.email) &&
    !isSuperAdminEmail(auth.user.email)
  ) {
    return NextResponse.json({ error: "Not your class." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    type?: AssignmentType;
    subjectId?: string;
    topic?: string;
    dueDate?: string;
  };

  const type: AssignmentType = body.type === "exam_drill" ? "exam_drill" : "lesson";
  if (!body.subjectId || !body.topic || !body.dueDate) {
    return NextResponse.json(
      { error: "subjectId, topic, and dueDate are required." },
      { status: 400 }
    );
  }

  try {
    const assignment = await createAssignment({
      classId,
      type,
      subjectId: body.subjectId,
      topic: body.topic,
      dueDate: body.dueDate,
      createdBy: auth.user.id || auth.user.email,
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create assignment." },
      { status: 400 }
    );
  }
}
