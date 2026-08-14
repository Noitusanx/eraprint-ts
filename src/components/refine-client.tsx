"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicQuestion } from "@/lib/data/public-catalog";
import {
  completeRefinement,
  fetchLivingState,
  saveRefinementAnswer,
  startOrResumeRefinement,
  type RefinementSessionState,
} from "@/lib/repositories/living-eraprint-repository";

export function RefineClient({ snapshotId }: {
  snapshotId: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<RefinementSessionState | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (!cancelled) router.replace(`/result/${livingState.latestSnapshotId}`);
          return;
        }
        const nextSession = await startOrResumeRefinement(snapshotId);
        if (cancelled) return;
        setSession(nextSession);
        setQuestion(nextSession.question);
        if (nextSession.shouldFinalize) await finalize(nextSession.sessionId);
        else if (!nextSession.question) throw new Error("No unused refinement question is available.");
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to start refinement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    start();
    return () => { cancelled = true; };
  }, [router, snapshotId]);

  useEffect(() => {
    let cancelled = false;

    async function checkForNewerResult() {
      if (document.visibilityState === "hidden") return;
      try {
        const livingState = await fetchLivingState(snapshotId);
        if (!cancelled && !livingState.isLatest && livingState.latestSnapshotId) {
          router.replace(`/result/${livingState.latestSnapshotId}`);
        }
      } catch {
        // The normal request flow will show a useful error if the session is unavailable.
      }
    }

    const handleVisibility = () => { void checkForNewerResult(); };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router, snapshotId]);

  async function choose(choiceId: string) {
    if (!session || !question || loading) return;
    const previousSession = session;
    const previousQuestion = question;
    const hasPrefetchedQuestion = Object.prototype.hasOwnProperty.call(
      session.nextByChoice,
      choiceId,
    );
    const prefetchedQuestion = session.nextByChoice[choiceId] ?? null;
    setLoading(true);
    setError(null);
    if (hasPrefetchedQuestion) {
      setSession({
        ...session,
        sessionAnswerCount: session.sessionAnswerCount + 1,
        question: prefetchedQuestion,
        nextByChoice: {},
      });
      setQuestion(prefetchedQuestion);
    }
    try {
      const saved = await saveRefinementAnswer(
        snapshotId,
        session.sessionId,
        question.id,
        choiceId,
      );
      const updatedSession = {
        ...session,
        sessionAnswerCount: saved.sessionAnswerCount,
        shouldFinalize: saved.shouldFinalize,
        question: saved.question,
        nextByChoice: saved.nextByChoice,
      };
      setSession(updatedSession);
      setQuestion(saved.question);
      if (saved.shouldFinalize) {
        const completed = await completeRefinement(snapshotId, session.sessionId);
        router.replace(`/result/${completed.snapshotId}`);
      } else if (!saved.question) {
        throw new Error("No unused refinement question is available.");
      }
    } catch (caught) {
      setSession(previousSession);
      setQuestion(previousQuestion);
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
      setError(caught instanceof Error ? caught.message : "Unable to continue refinement.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !question) {
    return (
      <main className="game-shell refine-loading-shell" aria-busy="true" aria-live="polite">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-three" />
        <section className="game-card result-processing">
          <header className="game-header">
            <Link className="wordmark" href={`/result/${snapshotId}`}>EraPrint</Link>
            <span className="result-version">LIVING PROFILE</span>
          </header>
          <div className="result-processing-body refine-processing-body">
            <div className="result-processing-mark" aria-hidden="true"><span /><span /><span /></div>
            <p className="eyebrow">LIVING ERAPRINT</p>
            <h1>Finding your next question.</h1>
            <p className="result-processing-copy">
              We&apos;re picking something new based on the choices you&apos;ve already made.
            </p>
            <div className="result-processing-track" aria-hidden="true"><span /></div>
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
            <Link className="wordmark" href={`/result/${snapshotId}`}>EraPrint</Link>
            <span className="result-version">LIVING PROFILE</span>
          </header>
          <div className="refine-unavailable-body">
            <p className="eyebrow">LIVING ERAPRINT</p>
            <h1>This EraPrint can&apos;t be refined from here.</h1>
            <p>{error}</p>
            <Link className="secondary-button" href={`/result/${snapshotId}`}>Back to result</Link>
          </div>
        </section>
      </main>
    );
  }
  if (!question || !session) return null;

  const cumulativeAnswered = session.baseAnswerCount + session.sessionAnswerCount;
  const totalAfterChoice = cumulativeAnswered + 1;
  const progress = (cumulativeAnswered / session.totalQuestionCount) * 100;

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <section className="game-card">
        <header className="game-header">
          <Link className="wordmark" href={`/result/${snapshotId}`}>EraPrint</Link>
          <span className="step-counter">
            {totalAfterChoice}/{session.totalQuestionCount}
          </span>
        </header>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="question-stage" key={question.id}>
          <div className="question-meta">
            <span>{question.category}</span>
            <span className="adaptive-pill">picked for you</span>
          </div>
          <p className="eyebrow">
            {cumulativeAnswered} answered · {session.totalQuestionCount - cumulativeAnswered} remaining
          </p>
          <h1 className="question-title">{question.prompt}</h1>
          <div className={`choice-grid ${question.choices.length === 2 ? "choice-grid-two" : ""}`}>
            {question.choices.map((choice) => (
              <button className="choice-card" type="button" key={choice.id} disabled={loading} onClick={() => choose(choice.id)}>
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
          {error && <p className="game-error">{error}</p>}
          <div className="refine-exit">
            {loading ? (
              <span className="refine-exit-link refine-exit-saving">Saving your choice…</span>
            ) : (
              <Link className="refine-exit-link" href={`/result/${snapshotId}`}>Finish later</Link>
            )}
            <small>Your progress is saved automatically.</small>
          </div>
        </div>
      </section>
    </main>
  );
}
