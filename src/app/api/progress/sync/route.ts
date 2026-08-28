import { NextRequest, NextResponse } from "next/server";
import type { GradeLevel } from "@/data/curriculum";
import { requireUser } from "@/lib/auth-request";
import {
  completeMatchingAssignments,
  syncStudentProgress,
} from "@/lib/classroom-store";
import type { TopicSnapshot } from "@/lib/classroom-types";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as {
    topics?: Record<string, TopicSnapshot>;
    lastActiveAt?: string | null;
    examFocusGrade?: GradeLevel | null;
    recentExamAccuracy?: number | null;
    /** Optional: auto-complete matching class assignments */
    completedLesson?: { subjectId: string; topic: string };
    completedExamDrill?: { subjectId: string; topic: string };
  };

  const studentId = auth.user.id || auth.user.email;
  const snapshot = await syncStudentProgress({
    studentId,
    studentEmail: auth.user.email,
    studentName: auth.user.name,
    topics: body.topics || {},
    lastActiveAt: body.lastActiveAt ?? new Date().toISOString(),
    examFocusGrade: body.examFocusGrade ?? null,
    recentExamAccuracy: body.recentExamAccuracy,
  });

  let completedAssignments = 0;
  if (body.completedLesson) {
    completedAssignments += await completeMatchingAssignments({
      studentId,
      subjectId: body.completedLesson.subjectId,
      topic: body.completedLesson.topic,
      type: "lesson",
    });
  }
  if (body.completedExamDrill) {
    completedAssignments += await completeMatchingAssignments({
      studentId,
      subjectId: body.completedExamDrill.subjectId,
      topic: body.completedExamDrill.topic,
      // Also complete lesson assignments for same topic if they finished a drill
      type: undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    snapshot: {
      updatedAt: snapshot.updatedAt,
      topicCount: Object.keys(snapshot.topics).length,
    },
    completedAssignments,
  });
}
