import { promises as fs } from "node:fs";
import path from "node:path";

export type SignInUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
  firstSeenAt: string;
  lastSeenAt: string;
  continueCount: number;
};

export type SignInEvent = {
  id: string;
  userId: string;
  email: string;
  name: string;
  at: string;
};

export type SignInStore = {
  users: Record<string, SignInUser>;
  events: SignInEvent[];
};

const STORE_PATH = path.join(process.cwd(), "data", "google-signins.json");

async function ensureStore(): Promise<SignInStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SignInStore;
    return {
      users: parsed.users || {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { users: {}, events: [] };
  }
}

async function writeStore(store: SignInStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function recordGoogleContinue(user: {
  id: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<SignInUser> {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const email = user.email.trim().toLowerCase();
  const key = user.id || email;
  const existing = store.users[key];

  const nextUser: SignInUser = existing
    ? {
        ...existing,
        name: user.name || existing.name,
        picture: user.picture || existing.picture,
        lastSeenAt: now,
        continueCount: existing.continueCount + 1,
      }
    : {
        id: key,
        email,
        name: user.name || email.split("@")[0],
        picture: user.picture || "",
        firstSeenAt: now,
        lastSeenAt: now,
        continueCount: 1,
      };

  store.users[key] = nextUser;
  store.events.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: key,
    email,
    name: nextUser.name,
    at: now,
  });

  // Keep the event log bounded
  if (store.events.length > 2000) {
    store.events = store.events.slice(0, 2000);
  }

  await writeStore(store);
  return nextUser;
}

export async function getSignInAnalytics() {
  const store = await ensureStore();
  const users = Object.values(store.users).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );

  const totalContinues = users.reduce((sum, u) => sum + u.continueCount, 0);
  const uniqueUsers = users.length;

  const byDay: Record<string, number> = {};
  for (const event of store.events) {
    const day = event.at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, continues: byDay[key] || 0 };
  });

  return {
    uniqueUsers,
    totalContinues,
    last7Days,
    recentEvents: store.events.slice(0, 50),
    users,
  };
}
