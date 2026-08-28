import { promises as fs } from "node:fs";
import path from "node:path";
import type { UserLearningData } from "@/lib/user-data";
import { validateUserLearningPayload } from "@/lib/user-learning-merge";

const DIR = path.join(process.cwd(), "data", "user-learning");

/** Safe filename from Google sub / email (matches classroom studentId usage). */
export function sanitizeUserLearningId(userId: string): string {
  const raw = (userId || "").trim();
  if (!raw) return "unknown";
  return raw.replace(/[^a-zA-Z0-9._@-]+/g, "_").slice(0, 180);
}

function filePathFor(userId: string): string {
  return path.join(DIR, `${sanitizeUserLearningId(userId)}.json`);
}

export async function loadUserLearning(
  userId: string
): Promise<UserLearningData | null> {
  try {
    const raw = await fs.readFile(filePathFor(userId), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const validated = validateUserLearningPayload(parsed);
    if (!validated.ok) return null;
    return validated.data;
  } catch {
    return null;
  }
}

export async function saveUserLearning(
  userId: string,
  data: UserLearningData
): Promise<UserLearningData> {
  const validated = validateUserLearningPayload(data);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  await fs.mkdir(DIR, { recursive: true });
  const payload = {
    ...validated.data,
    version: 2 as const,
    updatedAt: new Date().toISOString(),
  };
  const target = filePathFor(userId);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
  try {
    await fs.rename(tmp, target);
  } catch {
    await fs.copyFile(tmp, target);
    await fs.unlink(tmp).catch(() => undefined);
  }
  return validated.data;
}
