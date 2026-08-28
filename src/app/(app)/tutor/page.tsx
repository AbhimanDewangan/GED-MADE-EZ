"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-sidebar";
import { Button, Card } from "@/components/ui";
import { SUBJECT_CATALOG } from "@/data/curriculum";
import { useUserData } from "@/lib/use-user-data";
import { useAuth } from "@/lib/auth-context";
import { getFirstName } from "@/lib/utils";
import { Send, Sparkles, Bot, User, BookOpen, ExternalLink } from "lucide-react";
import { LanguageToggle } from "@/components/learning/language-toggle";
import { LEARNING_LANGUAGE_LABELS } from "@/data/lessons/types";

const suggestedPromptsEn = [
  "What are my weakest topics?",
  "Explain photosynthesis from my biology textbook",
  "How should I study Chemistry this week?",
  "Summarize Newton’s first law from my physics book",
];

const suggestedPromptsAr = [
  "ما مواضيعي الضعيفة؟",
  "اشرح البناء الضوئي من كتاب الأحياء",
  "كيف أدرس الكيمياء هذا الأسبوع؟",
  "لخّص قانون نيوتن الأول من كتاب الفيزياء",
];

const suggestedPromptsMixed = [
  "What are my weakest topics؟ / ما مواضيعي الضعيفة؟",
  "Explain inequality / اشرح المتباينة من كتابي",
  "How should I study Chemistry this week?",
  "لخّص force / القوة من كتاب الفيزياء",
];

function TutorPageInner() {
  const { user } = useAuth();
  const { data, ready, readyBookCount, groundedSourceCount, askTutor, updateLearningLanguage, updateUseMoeLibrary } =
    useUserData();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [activeSubjectId, setActiveSubjectId] = useState<string | undefined>();
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prefillUsed = useRef(false);

  const groundedBookCount = useMemo(
    () => groundedSourceCount ?? data.books.filter((b) => b.status === "ready").length,
    [groundedSourceCount, data.books]
  );

  const suggestedPrompts = useMemo(() => {
    const lang = data.learningLanguage ?? "mixed";
    if (lang === "ar") return suggestedPromptsAr;
    if (lang === "en") return suggestedPromptsEn;
    return suggestedPromptsMixed;
  }, [data.learningLanguage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.tutorMessages, typing]);

  useEffect(() => {
    const subject = searchParams.get("subject");
    if (subject && SUBJECT_CATALOG.some((s) => s.id === subject)) {
      setActiveSubjectId(subject);
    }
    const q = searchParams.get("q");
    if (q && !prefillUsed.current) {
      prefillUsed.current = true;
      setInput(q);
    }
  }, [searchParams]);

  async function sendMessage(text: string) {
    if (!text.trim() || typing) return;
    setTyping(true);
    setInput("");
    try {
      await askTutor(text.trim(), activeSubjectId);
    } finally {
      setTyping(false);
    }
  }

  if (!ready) {
    return <div className="py-20 text-center text-muted">Loading tutor…</div>;
  }

  return (
    <>
      <AppHeader
        title="GED"
        highlight="AI Tutor"
        subtitle={
          data.learningLanguage === "ar"
            ? "إجابات من مكتبة الوزارة المشتركة وكتبك المرفوعة مع ذكر الصفحات."
            : "Answers from the shared MoE library and your uploads, with page citations."
        }
        showGreeting={false}
        action={
          <LanguageToggle
            value={data.learningLanguage}
            onChange={updateLearningLanguage}
            className="w-44"
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Focus subject</h3>
            <p className="mb-3 text-[11px] text-muted">
              Scopes retrieval to books tagged with that subject when possible.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setActiveSubjectId(undefined)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                  !activeSubjectId
                    ? "bg-indigo-500/15 text-white"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                All subjects
              </button>
              {SUBJECT_CATALOG.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSubjectId(s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                    activeSubjectId === s.id
                      ? "bg-indigo-500/15 text-white"
                      : "text-muted hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <s.icon className="h-4 w-4 text-indigo-400" />
                  {s.name}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">Suggested prompts</h3>
            <div className="space-y-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className="w-full rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-left text-xs text-muted transition hover:border-indigo-500/30 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Card>

          {groundedBookCount === 0 && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <p className="text-sm font-medium text-amber-50">
                Tutor needs MoE textbooks
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Without the shared MoE corpus or a ready PDF upload, answers can&apos;t
                cite your Oman textbooks. Enable the library or upload a book first —
                that&apos;s the product, not a generic chatbot.
              </p>
              <Link href="/library" className="mt-4 inline-flex">
                <Button size="sm">
                  Open Library / MoE corpus
                </Button>
              </Link>
            </Card>
          )}

          <Card>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={data.useMoeLibrary !== false}
                onChange={(e) => updateUseMoeLibrary(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Use shared MoE library
            </label>
            <p className="mt-2 text-[11px] text-muted">
              Default on. Merges with your personal uploads for grounded answers.
            </p>
          </Card>
        </div>

        <Card className="flex h-[calc(100vh-12rem)] flex-col lg:col-span-3">
          <div className="flex items-center gap-3 border-b border-white/8 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">GED Study Tutor</p>
              <p className="text-xs text-emerald-400">
                Grounded in {groundedBookCount} source
                {groundedBookCount === 1 ? "" : "s"}
                {readyBookCount > 0 ? ` (${readyBookCount} upload${readyBookCount === 1 ? "" : "s"})` : ""}
                {activeSubjectId
                  ? ` · focus: ${SUBJECT_CATALOG.find((s) => s.id === activeSubjectId)?.name}`
                  : ""}
                {` · ${LEARNING_LANGUAGE_LABELS[data.learningLanguage ?? "mixed"].short}`}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-4 scrollbar-thin">
            {groundedBookCount === 0 && data.tutorMessages.length <= 1 && (
              <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 px-5 py-6 text-center">
                <p className="text-sm font-medium text-white">
                  Ground the tutor in MoE books first
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  GED MADE EZ answers from the Oman MoE library and your uploads with
                  page citations. Open Library to enable the corpus or upload a PDF —
                  then come back and ask.
                </p>
                <Link href="/library" className="mt-4 inline-flex">
                  <Button size="sm">Go to Library</Button>
                </Link>
              </div>
            )}
            {data.tutorMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    msg.role === "assistant" ? "gradient-primary" : "bg-white/10"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-4 w-4 text-white" />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="max-w-[80%] space-y-2">
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-white/[0.04] text-white/90"
                        : "gradient-primary text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1">
                      {msg.citations.map((c) => {
                        const pages =
                          c.pageStart === c.pageEnd
                            ? `p. ${c.pageStart}`
                            : `p. ${c.pageStart}–${c.pageEnd}`;
                        const label =
                          c.sourceType === "moe"
                            ? `MoE library: ${c.title}`
                            : `Your upload: ${c.title}`;
                        return (
                          <Link
                            key={`${c.bookId}-${c.pageStart}-${c.pageEnd}`}
                            href={`/library#book-${c.bookId}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-200 transition hover:bg-indigo-500/20"
                          >
                            <BookOpen className="h-3 w-3" />
                            {label} · {pages}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.relatedTopic && (
                    <Link
                      href={`/subjects/${msg.relatedTopic.subjectId}/${msg.relatedTopic.slug}`}
                      className="inline-flex items-center gap-1 px-1 text-[11px] text-violet-300 hover:underline"
                    >
                      Related topic in Subjects: {msg.relatedTopic.topic}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        className="h-2 w-2 animate-bounce rounded-full bg-indigo-400"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/8 pt-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void sendMessage(input)}
                placeholder={`Ask ${getFirstName(user?.displayName)} from your uploaded textbooks...`}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-muted focus:border-indigo-500/50 focus:outline-none"
              />
              <Button
                onClick={() => void sendMessage(input)}
                disabled={!input.trim() || typing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">Loading tutor…</div>}>
      <TutorPageInner />
    </Suspense>
  );
}
