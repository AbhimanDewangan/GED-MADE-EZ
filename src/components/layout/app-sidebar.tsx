"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut, Menu, X, Shield, School, Users } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/data/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import { computeStreak, overallMastery } from "@/lib/user-data";
import { cn, getFirstName, getGreeting } from "@/lib/utils";
import Image from "next/image";
import { LanguageToggle } from "@/components/learning/language-toggle";

function LanguageToggleSlot() {
  const { data, ready, updateLearningLanguage } = useUserData();
  if (!ready) return null;
  return (
    <LanguageToggle
      value={data.learningLanguage}
      onChange={updateLearningLanguage}
    />
  );
}

function syncStatusLabel(status: string) {
  if (status === "syncing") return { text: "Syncing", className: "text-amber-400" };
  if (status === "offline") return { text: "Offline", className: "text-muted" };
  if (status === "error") return { text: "Sync paused", className: "text-rose-400" };
  return { text: "Synced", className: "text-emerald-400" };
}

function SidebarStudySummary() {
  const { data, ready, syncStatus } = useUserData();
  if (!ready) return null;
  const mastery = overallMastery(data);
  const streak = computeStreak(data);
  const sync = syncStatusLabel(syncStatus);

  return (
    <div className="glass rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted">Your mastery</span>
        <span className="font-semibold text-indigo-400">{mastery}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full gradient-primary transition-all"
          style={{ width: `${mastery}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted">
          {streak > 0
            ? `${streak}-day study streak • ${data.books.length} textbooks`
            : `${data.books.length} textbooks • study today to start a streak`}
        </p>
        <span
          className={`shrink-0 text-[10px] font-medium ${sync.className}`}
          title="Learning data sync across devices"
        >
          {sync.text}
        </span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut, isSuperAdmin, isTeacher } = useAuth();
  const [open, setOpen] = useState(false);

  const items = [
    ...navItems,
    { href: "/classes", label: "Classes", icon: Users },
    ...(isTeacher || isSuperAdmin
      ? [{ href: "/teacher", label: "Teacher", icon: School }]
      : []),
    ...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const sidebar = (
    <>
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <Link href="/dashboard" className="text-sm font-bold tracking-tight text-white">
            GED MADE EZ
          </Link>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted">
            Oman • Grades 9–12
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "gradient-primary text-white shadow-lg shadow-indigo-500/20"
                  : "text-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/8 p-4">
        <LanguageToggleSlot />
        <SidebarStudySummary />

        {user && (
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={36}
                height={36}
                className="rounded-full ring-2 ring-indigo-500/30"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400">
                {getFirstName(user.displayName).charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {getFirstName(user.displayName)}
              </p>
              <p className="truncate text-[10px] text-muted">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-white/10 bg-[#080b12] p-2 text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/8 bg-[#080b12]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-5 rounded-lg p-1 text-muted hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </aside>
    </>
  );
}

export function AppHeader({
  title,
  highlight,
  subtitle,
  action,
  showGreeting = true,
}: {
  title: string;
  highlight?: string;
  subtitle?: string;
  action?: React.ReactNode;
  showGreeting?: boolean;
}) {
  const { user } = useAuth();
  const firstName = getFirstName(user?.displayName);

  return (
    <div className="mb-8 flex flex-col gap-4 pt-10 sm:flex-row sm:items-start sm:justify-between lg:pt-0">
      <div>
        {showGreeting && (
          <p className="mb-1 text-sm text-muted">
            {getGreeting()}, {firstName} 👋
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}{" "}
          {highlight && <span className="gradient-text">{highlight}</span>}
        </h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
