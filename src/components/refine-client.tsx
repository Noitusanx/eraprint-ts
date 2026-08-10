"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicQuestion } from "@/lib/data/public-catalog";
import { completeRefinement, fetchLivingState, fetchRefinementQuestion } from "@/lib/repositories/living-eraprint-repository";
import type { Answer } from "@/lib/scoring/types";

type StoredRefinement = { answers: Answer[]; clientRequestId: string };

export function RefineClient({ snapshotId }: { snapshotId: string }) {
  const router = useRouter();
  const storageKey = `eraprint:refine:${snapshotId}`;
  const [session, setSession] = useState<StoredRefinement | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const state = await fetchLivingState(snapshotId);
        if (!state.canRefine) throw new Error(
          state.remainingCount < 3
            ? "There aren't enough new questions left for another round."
            : "Please continue from your newest EraPrint result.",
        );
        const raw = localStorage.getItem(storageKey);
        const stored = raw ? JSON.parse(raw) as StoredRefinement : null;
        const nextSession = stored && Array.isArray(stored.answers) && stored.answers.length < 3
          ? stored
          : { answers: [], clientRequestId: crypto.randomUUID() };
        const next = await fetchRefinementQuestion(snapshotId, nextSession.answers);
        if (!next.question) throw new Error("No unused refinement question is available.");
        if (!cancelled) {
          setAnswerCount(state.answerCount);
          setSession(nextSession);
          setQuestion(next.question);
          localStorage.setItem(storageKey, JSON.stringify(nextSession));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to start refinement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    start();
    return () => { cancelled = true; };
  }, [snapshotId, storageKey]);

  async function choose(choiceId: string) {
    if (!session || !question || loading) return;
    setLoading(true);
    setError(null);
    const answers = [...session.answers, { questionId: question.id, choiceId }];
    const nextSession = { ...session, answers };
    localStorage.setItem(storageKey, JSON.stringify(nextSession));
    setSession(nextSession);
    try {
      if (answers.length === 3) {
        const completed = await completeRefinement(snapshotId, answers, session.clientRequestId);
        localStorage.removeItem(storageKey);
        router.replace(`/result/${completed.snapshotId}`);
        return;
      }
      const next = await fetchRefinementQuestion(snapshotId, answers);
      if (!next.question) throw new Error("No unused refinement question is available.");
      setQuestion(next.question);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue refinement.");
    } finally {
      setLoading(false);
    }
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
            <span className="result-version">LIVING PROFILE</span>
          </header>

          <div className="result-processing-body refine-processing-body">
            <div className="result-processing-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <p className="eyebrow">LIVING ERAPRINT</p>
            <h1>Choosing your next question.</h1>
            <p className="result-processing-copy">
              Looking at the choices you have already made so your next
              question can explore something new.
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
          <p className="eyebrow">LIVING ERAPRINT</p>
          <h1>You can&apos;t refine this EraPrint right now.</h1>
          <p>{error}</p>
          <Link className="secondary-button" href={`/result/${snapshotId}`}>
            Back to result
          </Link>
        </section>
      </main>
    );
  }
  if (!question || !session) return null;

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <section className="game-card">
        <header className="game-header"><Link className="wordmark" href={`/result/${snapshotId}`}>EraPrint</Link><span className="step-counter">{session.answers.length + 1}/3</span></header>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${(session.answers.length / 3) * 100}%` }} /></div>
        <div className="question-stage" key={question.id}>
          <div className="question-meta"><span>{question.category}</span><span className="adaptive-pill">picked for you</span></div>
          <p className="eyebrow">REFINING {answerCount} CHOICES</p>
          <h1 className="question-title">{question.prompt}</h1>
          <div className={`choice-grid ${question.choices.length === 2 ? "choice-grid-two" : ""}`}>
            {question.choices.map((choice) => <button className="choice-card" type="button" key={choice.id} disabled={loading} onClick={() => choose(choice.id)}><span>{choice.label}</span></button>)}
          </div>
          {error && <p className="game-error">{error}</p>}
        </div>
      </section>
    </main>
  );
}
