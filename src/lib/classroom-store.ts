import { promises as fs } from "node:fs";
import path from "node:path";
import { SUBJECT_CATALOG, type GradeLevel } from "@/data/curriculum";
import { topicToSlug } from "@/data/lessons/utils";
import { normalizeEmail } from "@/lib/auth-server";
import type {
  AssignmentCompletion,
  AssignmentType,
  ClassAssignment,
  ClassInsights,
  ClassMembership,
  ClassRoom,
  ClassroomStore,
  RosterStudent,
  StudentAssignmentView,
  StudentProgressSnapshot,
  TeacherGrant,
  TopicSnapshot,
} from "@/lib/classroom-types";

export type { StudentAssignmentView };

const STORE_PATH = path.join(process.cwd(), "data", "classrooms.json");

/** Serialize read-modify-write so concurrent progress sync / class edits cannot wipe each other. */
let storeQueue: Promise<unknown> = Promise.resolve();

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = storeQueue.then(fn, fn);
  storeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function emptyStore(): ClassroomStore {
  return {
    teachers: {},
    classes: {},
    memberships: [],
    assignments: [],
    completions: [],
    progress: {},
  };
}

function normalizeStore(parsed: Partial<ClassroomStore>): ClassroomStore {
  return {
    teachers: parsed.teachers || {},
    classes: parsed.classes || {},
    memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
    assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
    completions: Array.isArray(parsed.completions) ? parsed.completions : [],
    progress: parsed.progress || {},
  };
}

export async function loadClassroomStore(): Promise<ClassroomStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<ClassroomStore>;
    return normalizeStore(parsed);
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: ClassroomStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const payload = JSON.stringify(store, null, 2);
  const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, payload, "utf8");
  try {
    await fs.rename(tmp, STORE_PATH);
  } catch {
    // Windows: rename over existing file can fail — fall back to replace.
    await fs.copyFile(tmp, STORE_PATH);
    await fs.unlink(tmp).catch(() => undefined);
  }
}

/** Load → mutate → atomic write under the process-wide lock. */
async function updateStore(
  mutator: (store: ClassroomStore) => void | Promise<void>
): Promise<ClassroomStore> {
  return withStoreLock(async () => {
    const store = await loadClassroomStore();
    await mutator(store);
    await writeStore(store);
    return store;
  });
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateJoinCode(existing: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!existing.has(code)) return code;
  }
  return `C${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export async function grantTeacherRole(input: {
  email: string;
  source: TeacherGrant["source"];
  grantedBy?: string;
}): Promise<TeacherGrant> {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Valid email required.");

  const grant: TeacherGrant = {
    email,
    grantedAt: new Date().toISOString(),
    source: input.source,
    grantedBy: input.grantedBy,
  };
  await updateStore((store) => {
    store.teachers[email] = grant;
  });
  return grant;
}

export async function createClass(input: {
  name: string;
  grade: GradeLevel;
  subjectIds: string[];
  teacherId: string;
  teacherEmail: string;
  teacherName: string;
}): Promise<ClassRoom> {
  let room!: ClassRoom;
  await updateStore((store) => {
    const existingCodes = new Set(
      Object.values(store.classes).map((c) => c.joinCode.toUpperCase())
    );
    const classId = uid("class");
    room = {
      classId,
      name: input.name.trim().slice(0, 80) || "Untitled class",
      grade: input.grade,
      subjectIds: input.subjectIds.filter(Boolean).slice(0, 12),
      joinCode: generateJoinCode(existingCodes),
      teacherId: input.teacherId,
      teacherEmail: normalizeEmail(input.teacherEmail),
      teacherName: input.teacherName || input.teacherEmail.split("@")[0],
      createdAt: new Date().toISOString(),
    };
    store.classes[classId] = room;
  });
  return room;
}

export async function listClassesForTeacher(teacherEmail: string): Promise<ClassRoom[]> {
  const store = await loadClassroomStore();
  const email = normalizeEmail(teacherEmail);
  return Object.values(store.classes)
    .filter((c) => c.teacherEmail === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getClassById(classId: string): Promise<ClassRoom | null> {
  const store = await loadClassroomStore();
  return store.classes[classId] || null;
}

export async function joinClassWithCode(input: {
  joinCode: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
}): Promise<{ class: ClassRoom; membership: ClassMembership; alreadyJoined: boolean }> {
  let result!: { class: ClassRoom; membership: ClassMembership; alreadyJoined: boolean };
  await updateStore((store) => {
    const code = input.joinCode.trim().toUpperCase();
    const room = Object.values(store.classes).find((c) => c.joinCode === code);
    if (!room) throw new Error("Invalid class code.");

    const studentId = input.studentId || normalizeEmail(input.studentEmail);
    const existing = store.memberships.find(
      (m) => m.classId === room.classId && m.studentId === studentId
    );
    if (existing) {
      result = { class: room, membership: existing, alreadyJoined: true };
      return;
    }

    const membership: ClassMembership = {
      studentId,
      studentEmail: normalizeEmail(input.studentEmail),
      studentName: input.studentName || input.studentEmail.split("@")[0],
      classId: room.classId,
      joinedAt: new Date().toISOString(),
    };
    store.memberships.push(membership);
    result = { class: room, membership, alreadyJoined: false };
  });
  return result;
}

export async function listMembershipsForStudent(studentId: string): Promise<
  { membership: ClassMembership; class: ClassRoom }[]
> {
  const store = await loadClassroomStore();
  return store.memberships
    .filter((m) => m.studentId === studentId)
    .map((m) => ({ membership: m, class: store.classes[m.classId] }))
    .filter((x): x is { membership: ClassMembership; class: ClassRoom } => Boolean(x.class))
    .sort((a, b) => b.membership.joinedAt.localeCompare(a.membership.joinedAt));
}

export async function createAssignment(input: {
  classId: string;
  type: AssignmentType;
  subjectId: string;
  topic: string;
  dueDate: string;
  createdBy: string;
}): Promise<ClassAssignment> {
  const topic = input.topic.trim();
  if (!topic) throw new Error("Topic is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    throw new Error("Due date must be YYYY-MM-DD.");
  }

  let assignment!: ClassAssignment;
  await updateStore((store) => {
    const room = store.classes[input.classId];
    if (!room) throw new Error("Class not found.");

    assignment = {
      id: uid("asg"),
      classId: input.classId,
      type: input.type,
      subjectId: input.subjectId,
      topic,
      topicSlug: topicToSlug(topic),
      dueDate: input.dueDate,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
    store.assignments.unshift(assignment);
  });
  return assignment;
}

export async function listAssignmentsForClass(classId: string): Promise<ClassAssignment[]> {
  const store = await loadClassroomStore();
  return store.assignments
    .filter((a) => a.classId === classId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function assignmentHref(a: ClassAssignment, grade: GradeLevel): string {
  if (a.type === "exam_drill") {
    const params = new URLSearchParams({
      subject: a.subjectId,
      grade: String(grade),
      mode: "topic",
      topic: a.topic,
      count: "5",
    });
    return `/exams/session?${params.toString()}`;
  }
  return `/subjects/${a.subjectId}/${a.topicSlug}`;
}

export async function listAssignmentsForStudent(
  studentId: string
): Promise<StudentAssignmentView[]> {
  const store = await loadClassroomStore();
  const classIds = store.memberships
    .filter((m) => m.studentId === studentId)
    .map((m) => m.classId);
  const completed = new Set(
    store.completions
      .filter((c) => c.studentId === studentId)
      .map((c) => c.assignmentId)
  );
  const completionAt = new Map(
    store.completions
      .filter((c) => c.studentId === studentId)
      .map((c) => [c.assignmentId, c.completedAt])
  );

  return store.assignments
    .filter((a) => classIds.includes(a.classId))
    .map((a) => {
      const room = store.classes[a.classId];
      return {
        ...a,
        className: room?.name || "Class",
        completed: completed.has(a.id),
        completedAt: completionAt.get(a.id) || null,
        href: assignmentHref(a, room?.grade || 9),
      };
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.dueDate.localeCompare(b.dueDate));
}

export async function markAssignmentComplete(input: {
  assignmentId: string;
  studentId: string;
}): Promise<AssignmentCompletion | null> {
  let result: AssignmentCompletion | null = null;
  await updateStore((store) => {
    const assignment = store.assignments.find((a) => a.id === input.assignmentId);
    if (!assignment) return;

    const isMember = store.memberships.some(
      (m) => m.classId === assignment.classId && m.studentId === input.studentId
    );
    if (!isMember) return;

    const existing = store.completions.find(
      (c) => c.assignmentId === input.assignmentId && c.studentId === input.studentId
    );
    if (existing) {
      result = existing;
      return;
    }

    const completion: AssignmentCompletion = {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      completedAt: new Date().toISOString(),
    };
    store.completions.push(completion);
    result = completion;
  });
  return result;
}

/** Auto-complete lesson / exam assignments that match subject + topic */
export async function completeMatchingAssignments(input: {
  studentId: string;
  subjectId: string;
  topic: string;
  type?: AssignmentType;
}): Promise<number> {
  let count = 0;
  await updateStore((store) => {
    const classIds = new Set(
      store.memberships.filter((m) => m.studentId === input.studentId).map((m) => m.classId)
    );
    const topicNorm = input.topic.trim().toLowerCase();

    for (const a of store.assignments) {
      if (!classIds.has(a.classId)) continue;
      if (a.subjectId !== input.subjectId) continue;
      if (a.topic.trim().toLowerCase() !== topicNorm) continue;
      if (input.type && a.type !== input.type) continue;

      const already = store.completions.some(
        (c) => c.assignmentId === a.id && c.studentId === input.studentId
      );
      if (already) continue;

      store.completions.push({
        assignmentId: a.id,
        studentId: input.studentId,
        completedAt: new Date().toISOString(),
      });
      count += 1;
    }
  });
  return count;
}

export async function syncStudentProgress(input: {
  studentId: string;
  studentEmail: string;
  studentName: string;
  topics: Record<string, TopicSnapshot>;
  lastActiveAt: string | null;
  examFocusGrade: GradeLevel | null;
  recentExamAccuracy?: number | null;
}): Promise<StudentProgressSnapshot> {
  let snapshot!: StudentProgressSnapshot;
  await updateStore((store) => {
    snapshot = {
      studentId: input.studentId,
      studentEmail: normalizeEmail(input.studentEmail),
      studentName: input.studentName || input.studentEmail.split("@")[0],
      updatedAt: new Date().toISOString(),
      lastActiveAt: input.lastActiveAt,
      topics: input.topics || {},
      examFocusGrade: input.examFocusGrade,
      recentExamAccuracy:
        typeof input.recentExamAccuracy === "number"
          ? input.recentExamAccuracy
          : input.recentExamAccuracy === null
            ? null
            : store.progress[input.studentId]?.recentExamAccuracy ?? null,
    };
    store.progress[input.studentId] = snapshot;
  });
  return snapshot;
}

function subjectName(subjectId: string) {
  return SUBJECT_CATALOG.find((s) => s.id === subjectId)?.name || subjectId;
}

function overallFromTopics(topics: Record<string, TopicSnapshot>): number {
  const values = Object.values(topics);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, t) => s + t.mastery, 0) / values.length);
}

export async function getClassRoster(classId: string): Promise<RosterStudent[]> {
  const store = await loadClassroomStore();
  return store.memberships
    .filter((m) => m.classId === classId)
    .map((m) => {
      const snap = store.progress[m.studentId];
      return {
        studentId: m.studentId,
        studentEmail: m.studentEmail,
        studentName: m.studentName,
        joinedAt: m.joinedAt,
        lastActiveAt: snap?.lastActiveAt || null,
        overallMastery: snap ? overallFromTopics(snap.topics) : 0,
        topicsStudied: snap ? Object.keys(snap.topics).length : 0,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function computeClassInsights(classId: string): Promise<ClassInsights> {
  const store = await loadClassroomStore();
  const room = store.classes[classId];
  const members = store.memberships.filter((m) => m.classId === classId);
  const snapshots = members
    .map((m) => store.progress[m.studentId])
    .filter((s): s is StudentProgressSnapshot => Boolean(s));

  const subjectIds =
    room?.subjectIds?.length
      ? room.subjectIds
      : [...new Set(snapshots.flatMap((s) => Object.keys(s.topics).map((k) => k.split("::")[0])))];

  const averageMasteryBySubject = subjectIds.map((subjectId) => {
    const scores: number[] = [];
    for (const snap of snapshots) {
      const topicScores = Object.entries(snap.topics)
        .filter(([key]) => key.startsWith(`${subjectId}::`))
        .map(([, t]) => t.mastery);
      if (topicScores.length) {
        scores.push(
          Math.round(topicScores.reduce((a, b) => a + b, 0) / topicScores.length)
        );
      }
    }
    return {
      subjectId,
      subjectName: subjectName(subjectId),
      averageMastery: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      studentCount: scores.length,
    };
  });

  const topicAgg = new Map<
    string,
    { subjectId: string; topic: string; sum: number; count: number }
  >();
  for (const snap of snapshots) {
    for (const [key, t] of Object.entries(snap.topics)) {
      const [subjectId, ...rest] = key.split("::");
      const topic = rest.join("::");
      if (!subjectId || !topic) continue;
      const cur = topicAgg.get(key) || { subjectId, topic, sum: 0, count: 0 };
      cur.sum += t.mastery;
      cur.count += 1;
      topicAgg.set(key, cur);
    }
  }

  const weakTopics = [...topicAgg.values()]
    .map((t) => ({
      subjectId: t.subjectId,
      subjectName: subjectName(t.subjectId),
      topic: t.topic,
      averageMastery: Math.round(t.sum / t.count),
      studentCount: t.count,
    }))
    .filter((t) => t.averageMastery < 70)
    .sort((a, b) => a.averageMastery - b.averageMastery || b.studentCount - a.studentCount)
    .slice(0, 12);

  const now = Date.now();
  const inactiveStudents = members
    .map((m) => {
      const snap = store.progress[m.studentId];
      const last = snap?.lastActiveAt || null;
      const daysInactive = last
        ? Math.floor((now - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        studentId: m.studentId,
        studentEmail: m.studentEmail,
        studentName: m.studentName,
        lastActiveAt: last,
        daysInactive,
      };
    })
    .filter((s) => s.daysInactive > 7)
    .sort((a, b) => b.daysInactive - a.daysInactive);

  return { averageMasteryBySubject, weakTopics, inactiveStudents };
}

export async function getStudentDetailForTeacher(input: {
  classId: string;
  studentId: string;
  teacherEmail: string;
  /** When true, skip teacher ownership check (super-admin support). */
  bypassOwnerCheck?: boolean;
}): Promise<{
  membership: ClassMembership;
  progress: StudentProgressSnapshot | null;
  recentTopics: { subjectId: string; topic: string; mastery: number; lastStudiedAt: string | null }[];
} | null> {
  const store = await loadClassroomStore();
  const room = store.classes[input.classId];
  if (!room) return null;
  if (
    !input.bypassOwnerCheck &&
    normalizeEmail(room.teacherEmail) !== normalizeEmail(input.teacherEmail)
  ) {
    return null;
  }
  const membership = store.memberships.find(
    (m) => m.classId === input.classId && m.studentId === input.studentId
  );
  if (!membership) return null;

  const progress = store.progress[input.studentId] || null;
  const recentTopics = progress
    ? Object.entries(progress.topics)
        .map(([key, t]) => {
          const [subjectId, ...rest] = key.split("::");
          return {
            subjectId,
            topic: rest.join("::"),
            mastery: t.mastery,
            lastStudiedAt: t.lastStudiedAt,
          };
        })
        .sort((a, b) =>
          (b.lastStudiedAt || "").localeCompare(a.lastStudiedAt || "")
        )
        .slice(0, 20)
    : [];

  return { membership, progress, recentTopics };
}

export async function getAssignmentCompletionStats(classId: string) {
  const store = await loadClassroomStore();
  const memberCount = store.memberships.filter((m) => m.classId === classId).length;
  return store.assignments
    .filter((a) => a.classId === classId)
    .map((a) => {
      const done = store.completions.filter((c) => c.assignmentId === a.id).length;
      return { assignmentId: a.id, completedCount: done, memberCount };
    });
}
