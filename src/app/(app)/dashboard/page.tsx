"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Play,
  Zap,
  Target,
  Brain,
  BookOpen,
  Upload,
  ClipboardCheck,
  AlertTriangle,
  School,
  Users,
  RefreshCw,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-sidebar";
import { FirstRunChecklist } from "@/components/dashboard/first-run-checklist";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { SUBJECT_CATALOG, getSubject } from "@/data/curriculum";
import { useUserData } from "@/lib/use-user-data";
import { useClassroom } from "@/lib/use-classroom";
import { useAuth } from "@/lib/auth-context";
import {
  buildRecommendations,
  buildWeakTopics,
  computeReadiness,
  computeStreak,
  daysUntilExam,
  hoursThisWeek,
  masteryHistory,
  overallMastery,
  relativeTime,
  subjectProgress,
} from "@/lib/user-data";

export default function DashboardPage() {
  const { isTeacher, isSuperAdmin } = useAuth();
  const { data, ready, completeTask, syncNow, syncingNow, syncStatus, dismissChecklist, skipChecklistStep } = useUserData();
  const {
    ready: classReady,
    myClasses,
    assignments,
    joinClass,
    completeAssignment,
  } = useClassroom();
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  if (!ready) {
    return <div className="py-20 text-center text-muted">Loading your dashboard…</div>;
  }

  const openAssignments = assignments.filter((a) => !a.completed).slice(0, 5);

  async function onJoin() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinMsg(null);
    try {
      const res = await joinClass(joinCode.trim());
      setJoinMsg(
        res.alreadyJoined
          ? `Already in ${res.class.name}`
          : `Joined ${res.class.name} — code ${res.class.joinCode}`
      );
      setJoinCode("");
    } catch (err) {
      setJoinMsg(err instanceof Error ? err.message : "Could not join class.");
    } finally {
      setJoining(false);
    }
  }

  const mastery = overallMastery(data);
  const streak = computeStreak(data);
  const hours = hoursThisWeek(data);
  const readiness = computeReadiness(data);
  const daysLeft = daysUntilExam(data);
  const weak = buildWeakTopics(data);
  const history = masteryHistory(data);
  const recommendations = buildRecommendations(data);
  const upcoming = data.tasks
    .filter((t) => !t.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const subjects = SUBJECT_CATALOG.map((s) => ({
    ...s,
    ...subjectProgress(data, s.id),
  })).sort((a, b) => b.progress - a.progress);

  const stats = [
    {
      label: "Study streak",
      value: streak ? `${streak} day${streak === 1 ? "" : "s"}` : "0 days",
      hint: streak ? "Keep it going" : "Study today to start",
      icon: Zap,
      color: "text-amber-400",
    },
    {
      label: "Overall mastery",
      value: `${mastery}%`,
      hint: mastery === 0 ? "No topics studied yet" : "Across all subjects",
      icon: Target,
      color: "text-emerald-400",
    },
    {
      label: "Exam readiness",
      value: `${readiness.score}/10`,
      hint:
        daysLeft != null
          ? `${daysLeft}d to target exam`
          : `${readiness.coverage}% coverage · set exam date in Planner`,
      icon: Brain,
      color: "text-indigo-400",
    },
    {
      label: "Hours this week",
      value: `${hours} h`,
      hint: data.examSessions.length
        ? `${data.examSessions.length} exam session(s)`
        : data.books.length
          ? `${data.books.length} textbooks`
          : "No textbooks yet",
      icon: BookOpen,
      color: "text-cyan-400",
    },
  ];

  return (
    <>
      <AppHeader
        title="Let's hit today's"
        highlight="study goals."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={syncingNow || syncStatus === "offline"}
              onClick={() => void syncNow()}
              title={
                syncStatus === "offline"
                  ? "You are offline — study continues locally"
                  : "Pull/push learning data across devices"
              }
            >
              <RefreshCw className={`h-4 w-4 ${syncingNow ? "animate-spin" : ""}`} />
              {syncingNow ? "Syncing…" : "Sync now"}
            </Button>
            {(isTeacher || isSuperAdmin) && (
              <Link href="/teacher">
                <Button variant="secondary">
                  <School className="h-4 w-4" />
                  Teacher
                </Button>
              </Link>
            )}
            <Link href="/exams">
              <Button variant="secondary">
                <ClipboardCheck className="h-4 w-4" />
                Exam OS
              </Button>
            </Link>
            <Link href="/tutor">
              <Button>
                <Sparkles className="h-4 w-4" />
                Ask AI Tutor
              </Button>
            </Link>
          </div>
        }
      />

      <FirstRunChecklist
        data={data}
        joinedClass={myClasses.length > 0}
        onDismiss={dismissChecklist}
        onSkipStep={skipChecklistStep}
      />

      <Card className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Users className="h-4 w-4 text-indigo-400" />
              Your class
            </h3>
            <p className="text-xs text-muted">
              Enter a teacher join code. Academic progress syncs — chat stays private.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {classReady && myClasses.length > 0 && (
              <Badge variant="success">{myClasses.length} joined</Badge>
            )}
            <Link href="/classes" className="text-xs text-indigo-400 hover:underline">
              View all
            </Link>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Join code"
            maxLength={8}
            className="w-36 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm tracking-widest text-white outline-none focus:border-indigo-500/40"
          />
          <Button size="sm" disabled={joining || !joinCode.trim()} onClick={() => void onJoin()}>
            Join class
          </Button>
          {joinMsg && <p className="self-center text-xs text-muted">{joinMsg}</p>}
        </div>
        {myClasses.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {myClasses.map((c) => (
              <Badge key={c.classId} variant="info">
                {c.name} · G{c.grade}
              </Badge>
            ))}
          </div>
        )}
        {openAssignments.length > 0 && (
          <div className="space-y-2 border-t border-white/5 pt-4">
            <p className="text-xs font-medium text-white">Class assignments</p>
            {openAssignments.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{a.topic}</p>
                  <p className="text-[10px] text-muted">
                    {a.className} · {a.type === "lesson" ? "Lesson" : "Exam drill"} · due{" "}
                    {a.dueDate}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={a.href}>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void completeAssignment(a.id)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-[10px] text-muted">{stat.hint}</p>
              </div>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white">Readiness breakdown</h3>
            <p className="text-[11px] text-muted">{readiness.formulaLabel}</p>
          </div>
          <Link href="/analytics" className="text-xs text-indigo-400 hover:underline">
            Full analytics
          </Link>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Topic mastery", v: readiness.topicMastery },
            { label: "Exam accuracy (7d)", v: readiness.examAccuracy7d },
            { label: "Grade coverage", v: readiness.coverage },
            { label: "Recency", v: readiness.recency },
          ].map((x) => (
            <div
              key={x.label}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
            >
              <p className="text-[10px] text-muted">{x.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{x.v}%</p>
              <ProgressBar value={x.v} className="mt-2" />
            </div>
          ))}
        </div>
        {weak.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Weak topics — lesson + exam drill
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {weak.slice(0, 4).map((w) => (
                <div
                  key={`${w.subjectId}-${w.topic}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{w.topic}</p>
                    <p className="text-[10px] text-muted">
                      {w.subjectName} · {w.mastery}% mastery
                      {w.examAccuracy != null ? ` · exam ${w.examAccuracy}%` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-[11px]">
                    <Link href={w.lessonHref} className="text-indigo-400 hover:underline">
                      Lesson
                    </Link>
                    <Link href={w.drillHref} className="text-emerald-400 hover:underline">
                      Drill
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No weak exam topics yet.{" "}
            <Link href="/exams" className="text-indigo-400 hover:underline">
              Open Exam OS
            </Link>{" "}
            to populate this list.
          </p>
        )}
      </Card>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Mastery progress</h3>
              <p className="text-xs text-muted">Built from your real study activity</p>
            </div>
            <Badge variant={mastery >= 60 ? "success" : mastery > 0 ? "warning" : "default"}>
              {mastery >= 60 ? "On track" : mastery > 0 ? "Building" : "Get started"}
            </Badge>
          </div>
          {mastery === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
              <p className="text-sm text-white">No mastery data yet</p>
              <p className="mt-1 max-w-sm text-xs text-muted">
                Open Subjects and tap Start lesson — videos + quiz fill this chart from real progress.
              </p>
              <Link href="/subjects" className="mt-4">
                <Button size="sm" variant="secondary">
                  Go to subjects
                </Button>
              </Link>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8b95a8", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8b95a8", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#121826",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#f4f6fb",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mastery"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill="url(#masteryGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-white">Next actions</h3>
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted">You&apos;re caught up — add planner tasks or revise more topics.</p>
            ) : (
              recommendations.map((rec) => (
                <Link
                  key={`${rec.subjectId}-${rec.title}`}
                  href={rec.subjectId === "library" ? "/library" : `/subjects#${rec.subjectId}`}
                  className="block rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{rec.title}</p>
                    <Badge variant={rec.priority === "high" ? "danger" : "default"}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{rec.subject}</p>
                  <p className="mt-1 text-[10px] text-indigo-400">{rec.reason}</p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Your subjects</h2>
          <Link href="/subjects" className="flex items-center gap-1 text-sm text-indigo-400 hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.slice(0, 4).map((subject) => (
            <Link key={subject.id} href={`/subjects#${subject.id}`}>
              <Card hover className="h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                  <subject.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-white">{subject.name}</h3>
                <p className="mt-1 text-xs text-muted">
                  {subject.totalTopics} topics • {subject.weakTopics} weak
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <ProgressBar value={subject.progress} color={subject.color} className="flex-1" />
                  <span className="text-xs font-medium">{subject.progress}%</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-white">Recent activity</h3>
          {data.activity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <Upload className="mx-auto h-6 w-6 text-muted" />
              <p className="mt-2 text-sm text-white">No activity yet</p>
              <p className="mt-1 text-xs text-muted">
                Upload a MoE textbook in Library for better tutor answers with page citations, or study a topic to start your feed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.activity.slice(0, 6).map((item) => {
                const subject = item.subjectId ? getSubject(item.subjectId) : null;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.02]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                      {subject ? (
                        <subject.icon className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.action}</p>
                      <p className="text-xs text-muted">{subject?.name || item.kind}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{relativeTime(item.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Upcoming tasks</h3>
            <Link href="/planner" className="text-xs text-indigo-400 hover:underline">
              Open planner
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-sm text-white">No open tasks</p>
              <p className="mt-1 text-xs text-muted">Add revision tasks in the planner.</p>
              <Link href="/planner" className="mt-4 inline-block">
                <Button size="sm" variant="secondary">
                  Add a task
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <p className="text-xs text-muted">
                      {task.durationMin} min • Due {task.dueDate}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => completeTask(task.id)}
                  >
                    <Play className="h-3 w-3" />
                    Done
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
