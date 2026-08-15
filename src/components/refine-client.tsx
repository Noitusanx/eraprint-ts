"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicQuestion } from "@/lib/data/public-catalog";
import { selectNextPublicAdaptiveQuestion } from "@/lib/scoring/public-adaptive";
import type { Answer } from "@/lib/scoring/types";
import {
  completeRefinement,
  fetchLivingState,
  saveRefinementAnswer,
  startOrResumeRefinement,
  type RefinementSessionState,
} from "@/lib/repositories/living-eraprint-repository";

export function RefineClient({ snapshotId }: { snapshotId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<RefinementSessionState | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCount, setSavingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef<Answer[]>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveFailedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function finalize(sessionId: string) {
      const completed = await completeRefinement(snapshotId, sessionId);
      if (!cancelled) router.replace(`/result/${completed.snapshotId}`);
    }

    async function start() {
      try {
        const livingState = await fetchLivingState(snapshotId);
        if (!livingState.isLatest && livingState.latestSnapshotId) {
          if (!cancelled)
            router.replace(`/result/${livingState.latestSnapshotId}`);
          return;
        }
        const nextSession = await startOrResumeRefinement(snapshotId);
        if (cancelled) return;
        setSession(nextSession);
        setQuestion(nextSession.question);
        answersRef.current = nextSession.cumulativeAnswers;
        if (nextSession.shouldFinalize) await finalize(nextSession.sessionId);
        else if (!nextSession.question)
          throw new Error("No unused refinement question is available.");
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to start refinement.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [router, snapshotId]);

  useEffect(() => {
    let cancelled = false;

    async function checkForNewerResult() {
      if (document.visibilityState === "hidden") return;
      try {
        const livingState = await fetchLivingState(snapshotId);
        if (
          !cancelled &&
          !livingState.isLatest &&
          livingState.latestSnapshotId
        ) {
          router.replace(`/result/${livingState.latestSnapshotId}`);
        }
      } catch {
        // The normal request flow will show a useful error if the session is unavailable.
      }
    }

    const handleVisibility = () => {
      void checkForNewerResult();
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router, snapshotId]);

  function choose(choiceId: string) {
    if (!session || !question || loading || error) return;

    const answeredQuestion = question;
    const submitted: Answer = {
      questionId: answeredQuestion.id,
      choiceId,
    };
    const updatedAnswers = [...answersRef.current, submitted];
    const nextQuestion = selectNextPublicAdaptiveQuestion(updatedAnswers);
    answersRef.current = updatedAnswers;

    if (!nextQuestion) setLoading(true);
    setQuestion(nextQuestion);
    setSession((current) => current ? {
      ...current,
      sessionAnswerCount: current.sessionAnswerCount + 1,
      question: nextQuestion,
      nextByChoice: {},
    } : current);
    setSavingCount((count) => count + 1);

    const saveOperation = saveQueueRef.current.then(async () => {
      const saved = await saveRefinementAnswer(
        snapshotId,
        session.sessionId,
        answeredQuestion.id,
        choiceId,
      );
      if (!nextQuestion && saved.shouldFinalize) {
        setLoading(true);
        const completed = await completeRefinement(
          snapshotId,
          session.sessionId,
        );
        router.replace(`/result/${completed.snapshotId}`);
      }
    });

    saveQueueRef.current = saveOperation
      .catch(async (caught) => {
        saveFailedRef.current = true;
        if (caught instanceof Error && caught.name === "NOT_LATEST_SNAPSHOT") {
          try {
            const livingState = await fetchLivingState(snapshotId);
            if (livingState.latestSnapshotId) {
              router.replace(`/result/${livingState.latestSnapshotId}`);
              return;
            }
          } catch {
            // Fall through to the original server error below.
          }
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to save your refinement.",
        );
      })
      .finally(() => {
        setSavingCount((count) => Math.max(0, count - 1));
      });
  }

  async function finishLater() {
    if (loading) return;
    setLoading(true);
    await saveQueueRef.current;
    if (saveFailedRef.current) {
      setLoading(false);
      return;
    }
    router.push(`/result/${snapshotId}`);
  }

  if (loading && !question) {
    return (
      <main
        className="game-shell refine-loading-shell"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="ambient ambient-one" />
        <div className="ambient ambient-three" />
        <section className="game-card result-processing">
          <header className="game-header">
            <Link className="wordmark" href={`/result/${snapshotId}`}>
              EraPrint
            </Link>
          </header>
          <div className="result-processing-body refine-processing-body">
            <div className="result-processing-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="eyebrow">LIVING ERAPRINT</p>
            <h1>Finding your next question.</h1>
            <p className="result-processing-copy">
              We&apos;re picking something new based on the choices you&apos;ve
              already made.
            </p>
            <div className="result-processing-track" aria-hidden="true">
              <span />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error && !question) {
    return (
      <main className="game-shell">
        <div className="ambient ambient-one" />
        <section className="game-card refine-unavailable-card">
          <header className="game-header">
            <Link className="wordmark" href={`/result/${snapshotId}`}>
              EraPrint
            </Link>
          </header>
          <div className="refine-unavailable-body">
            <p className="eyebrow">LIVING ERAPRINT</p>
            <h1>This EraPrint can&apos;t be refined from here.</h1>
            <p>{error}</p>
            <Link className="secondary-button" href={`/result/${snapshotId}`}>
              Back to result
            </Link>
          </div>
        </section>
      </main>
    );
  }
  if (!question || !session) return null;

  const cumulativeAnswered =
    session.baseAnswerCount + session.sessionAnswerCount;
  const totalAfterChoice = cumulativeAnswered + 1;
  const progress = (cumulativeAnswered / session.totalQuestionCount) * 100;

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <section className="game-card">
        <header className="game-header">
          <Link className="wordmark" href={`/result/${snapshotId}`}>
            EraPrint
          </Link>
          <span className="step-counter">
            {totalAfterChoice}/{session.totalQuestionCount}
          </span>
        </header>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="question-stage" key={question.id}>
          <div className="question-meta">
            <span>{question.category}</span>
            <span className="adaptive-pill">picked for you</span>
          </div>
          <p className="eyebrow">
            {cumulativeAnswered} answered ·{" "}
            {session.totalQuestionCount - cumulativeAnswered} remaining
          </p>
          <h1 className="question-title">{question.prompt}</h1>
          <div
            className={`choice-grid ${question.choices.length === 2 ? "choice-grid-two" : ""}`}
          >
            {question.choices.map((choice) => (
              <button
                className="choice-card"
                type="button"
                key={choice.id}
                disabled={loading || Boolean(error)}
                onClick={() => choose(choice.id)}
              >
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
          {error && <p className="game-error">{error}</p>}
          <div className="refine-exit">
            {loading ? (
              <span className="refine-exit-link refine-exit-saving">
                Saving your choice…
              </span>
            ) : (
              <button
                className="refine-exit-link"
                type="button"
                onClick={finishLater}
              >
                Finish later
              </button>
            )}
            <small>
              {savingCount > 0
                ? "Saving in the background…"
                : "Your progress is saved automatically."}
            </small>
          </div>
        </div>
      </section>
    </main>
  );
}
