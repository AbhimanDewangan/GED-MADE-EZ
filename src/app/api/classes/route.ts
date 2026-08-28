import { NextRequest, NextResponse } from "next/server";
import type { GradeLevel } from "@/data/curriculum";
import { requireTeacher, requireUser } from "@/lib/auth-request";
import {
  createClass,
  listClassesForTeacher,
  listMembershipsForStudent,
} from "@/lib/classroom-store";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const role = request.nextUrl.searchParams.get("role") || "student";

  if (role === "teacher") {
    const teacherAuth = await requireTeacher(request);
    if (teacherAuth instanceof NextResponse) return teacherAuth;
    const classes = await listClassesForTeacher(teacherAuth.user.email);
    return NextResponse.json({ classes });
  }

  const studentId = auth.user.id || auth.user.email;
  const memberships = await listMembershipsForStudent(studentId);
  return NextResponse.json({
    classes: memberships.map((m) => ({
      ...m.class,
      joinedAt: m.membership.joinedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTeacher(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    grade?: number;
    subjectIds?: string[];
  };

  const grade = Number(body.grade) as GradeLevel;
  if (![9, 10, 11, 12].includes(grade)) {
    return NextResponse.json({ error: "Grade must be 9–12." }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Class name is required." }, { status: 400 });
  }

  const room = await createClass({
    name: body.name,
    grade,
    subjectIds: Array.isArray(body.subjectIds) ? body.subjectIds : ["math"],
    teacherId: auth.user.id || auth.user.email,
    teacherEmail: auth.user.email,
    teacherName: auth.user.name,
  });

  return NextResponse.json({ class: room }, { status: 201 });
}
