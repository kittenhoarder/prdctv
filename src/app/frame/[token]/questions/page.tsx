"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { LoadingMessage } from "@/components/loading-message";
import { LOADING_COPY } from "@/lib/loading-copy";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CompletionBar } from "@/components/completion-bar";

interface QA {
  question: string;
  editedQuestion: string;
  answer: string;
}

interface FrameData {
  token: string;
  title: string;
  type: string;
}

export default function QuestionsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [frame, setFrame] = useState<FrameData | null>(null);
  const [qas, setQas] = useState<QA[]>([]);
  const [rawQuestionsText, setRawQuestionsText] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const generateQuestions = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch(`/api/frame/${token}/questions`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to generate questions");
      }

      const data = await res.json();
      const isRaw =
        data.questions?.length === 1 &&
        data.questions[0] &&
        typeof data.questions[0] === "object" &&
        data.questions[0]._raw === true;
      if (isRaw) {
        setRawQuestionsText(data.questions[0].q ?? "");
        setQas([]);
      } else {
        setRawQuestionsText(null);
        setQas(
          data.questions.map((q: string) => ({
            question: q,
            editedQuestion: q,
            answer: "",
          }))
        );
      }
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Unable to generate. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const loadFrame = async () => {
      const res = await fetch(`/api/frame/${token}`);
      if (!res.ok) {
        router.replace("/");
        return;
      }
      const data = await res.json();
      setFrame({ token: data.token, title: data.title, type: data.type });

      // If questions already exist (e.g. page refresh), restore them
      if (data.questions?.length) {
        const isRaw =
          data.questions.length === 1 &&
          data.questions[0] &&
          typeof data.questions[0] === "object" &&
          (data.questions[0] as { _raw?: boolean })._raw === true;
        if (isRaw) {
          setRawQuestionsText((data.questions[0] as { q: string }).q ?? "");
          setQas([]);
        } else {
          setRawQuestionsText(null);
          setQas(
            data.questions.map((q: { q: string; editedQ?: string; answer?: string }) => ({
              question: q.q,
              editedQuestion: q.editedQ ?? q.q,
              answer: q.answer ?? "",
            }))
          );
        }
        setGenerating(false);
      } else {
        await generateQuestions();
      }
    };

    loadFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateQA = (
    index: number,
    field: "editedQuestion" | "answer",
    value: string
  ) => {
    setQas((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/frame/${token}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: qas.map((qa) => ({
            question: qa.question,
            editedQuestion:
              qa.editedQuestion !== qa.question ? qa.editedQuestion : undefined,
            answer: qa.answer,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to save answers");
      }

      router.push(`/frame/${token}/brief`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const allAnswered = qas.length === 3 && qas.every((qa) => qa.answer.trim());
  const showRawQuestions = rawQuestionsText !== null;
  const answeredCount = qas.filter((qa) => qa.answer.trim()).length;
  const completionPercent = qas.length ? (answeredCount / qas.length) * 100 : 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="content-container w-full max-w-[42rem]">
        <div className="bg-background/25 backdrop-blur-md p-6 sm:p-8 space-y-8">
        <div>
          <Link
            href="/?view=frame"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Start over
          </Link>
          {frame && (
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Clarifying questions</h1>
              <p className="text-muted-foreground text-sm">
                {frame.title} · Edit questions if needed, then answer each one.
              </p>
            </div>
          )}
        </div>

        {generating && (
          <div className="space-y-6">
            <LoadingMessage {...LOADING_COPY.questions} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        )}

        {generateError && (
          <div className="space-y-3">
            <p className="text-destructive text-sm">{generateError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generateQuestions}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        )}

        {!generating && !generateError && showRawQuestions && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {rawQuestionsText}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => router.push(`/frame/${token}/brief`)}
            >
              Continue to Frame Brief
            </Button>
          </div>
        )}

        {!generating && !generateError && !showRawQuestions && qas.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {qas.map((qa, i) => (
              <div key={i} className="space-y-4">
                {i > 0 && <Separator />}
                <div className="space-y-1.5">
                  <Label htmlFor={`q-${i}`} className="text-xs text-muted-foreground uppercase tracking-wide">
                    Question {i + 1}
                  </Label>
                  <Textarea
                    id={`q-${i}`}
                    value={qa.editedQuestion}
                    onChange={(e) => updateQA(i, "editedQuestion", e.target.value)}
                    rows={2}
                    className="text-foreground font-medium resize-none"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`a-${i}`}>Your answer</Label>
                  <Textarea
                    id={`a-${i}`}
                    placeholder="Answer this question honestly…"
                    value={qa.answer}
                    onChange={(e) => updateQA(i, "answer", e.target.value)}
                    rows={3}
                    required
                    maxLength={2000}
                  />
                </div>
              </div>
            ))}

            {submitError && (
              <p className="text-destructive text-sm">{submitError}</p>
            )}

            <div className="space-y-3">
              <CompletionBar percent={completionPercent} />
              <Button
                type="submit"
                size="lg"
                disabled={!allAnswered || submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? "Generating brief…" : "Generate Frame Brief"}
              </Button>
            </div>
          </form>
        )}
        </div>
      </div>
    </main>
  );
}
