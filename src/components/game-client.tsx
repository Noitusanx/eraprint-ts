"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PUBLIC_ANCHOR_QUESTION_IDS,
  PUBLIC_INITIAL_DECISIONS,
  PUBLIC_QUESTIONS,
  type PublicChoice,
  type PublicQuestion,
} from "@/lib/data/public-catalog";
import type { RefinementQuestionTree } from "@/lib/living/refinement-prefetch";
import type { Answer } from "@/lib/scoring/types";

const STORAGE_KEY = "eraprint:lastSession";

type StoredSession = {
  answers: Answer[];
  clientRequestId: string;
};

const visualClass: Record<string, string> = {
  city: "visual-city",
  rain: "visual-rain",
  cabin: "visual-cabin",
  party: "visual-party",
  soft: "visual-soft",
  neon: "visual-neon",
  storm: "visual-storm",
  forest: "visual-forest",
};

function ChoiceCard({
  choice,
  visual,
  disabled,
  onSelect,
}: {
  choice: PublicChoice;
  visual: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`choice-card ${visual ? "choice-card-visual" : ""} ${
        choice.hint ? visualClass[choice.hint] ?? "" : ""
      }`}
      type="button"
      onClick={onSelect}
      disabled={disabled}
    >
      {visual && <span className="visual-glow" aria-hidden />}
      <span>{choice.label}</span>
    </button>
  );
}

export function GameClient() {
  const router = useRouter();
  const anchors = useMemo(
    () =>
      PUBLIC_ANCHOR_QUESTION_IDS.map((id) => {
        const question = PUBLIC_QUESTIONS.find((item) => item.id === id);
        if (!question) throw new Error(`Missing public anchor question: ${id}`);
        return question;
      }),
    [],
  );

  const [questionIds, setQuestionIds] = useState<string[]>(
    anchors.map((question) => question.id),
  );
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adaptiveTree, setAdaptiveTree] = useState<RefinementQuestionTree>({});
  const choosingRef = useRef(false);
  const answersRef = useRef<Answer[]>([]);

  const currentQuestionId = questionIds[answers.length];
  const currentQuestion: PublicQuestion | undefined = PUBLIC_QUESTIONS.find(
    (question) => question.id === currentQuestionId,
  );

  useEffect(() => {
    if (answers.length < 2 || answers.length >= PUBLIC_INITIAL_DECISIONS) return;
    const signature = answers.map((answer) => `${answer.questionId}:${answer.choiceId}`).join("|");
    async function prefetchAdaptivePath() {
      try {
        const response = await fetch("/api/game/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const body = await response.json() as {
          nextByChoice?: RefinementQuestionTree;
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Unable to prepare adaptive choices.");
        const currentSignature = answersRef.current
          .map((answer) => `${answer.questionId}:${answer.choiceId}`)
          .join("|");
        if (currentSignature === signature) setAdaptiveTree(body.nextByChoice ?? {});
      } catch {
        // Final result validation remains authoritative; a later prefetch can retry.
      }
    }
    void prefetchAdaptivePath();
  }, [answers]);

  const choose = (choiceId: string) => {
    if (!currentQuestion || advancing || choosingRef.current) return;

    choosingRef.current = true;
    setAdvancing(true);
    setError(null);

    const nextAnswers: Answer[] = [
      ...answers,
      { questionId: currentQuestion.id, choiceId },
    ];
    answersRef.current = nextAnswers;

    try {
      if (nextAnswers.length >= PUBLIC_INITIAL_DECISIONS) {
        const payload: StoredSession = {
          answers: nextAnswers,
          clientRequestId: crypto.randomUUID(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        router.push("/result");
        return;
      }

      if (nextAnswers.length >= PUBLIC_ANCHOR_QUESTION_IDS.length) {
        const branch = adaptiveTree[choiceId];
        const nextQuestionId = branch?.question?.id;

        if (!nextQuestionId) {
          throw new Error("Your next adaptive choice is still being prepared.");
        }

        setQuestionIds((current) =>
          current.includes(nextQuestionId)
            ? current
            : [...current, nextQuestionId],
        );
        setAdaptiveTree(branch.nextByChoice);
      } else if (adaptiveTree[choiceId]) {
        setAdaptiveTree(adaptiveTree[choiceId].nextByChoice);
      }

      setAnswers(nextAnswers);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while loading the next choice.",
      );
    } finally {
      window.requestAnimationFrame(() => {
        choosingRef.current = false;
        setAdvancing(false);
      });
    }
  };

  if (!currentQuestion) {
    return (
      <main className="game-shell">
        <section className="game-card">
          <p>We couldn&apos;t load this question.</p>
        </section>
      </main>
    );
  }

  const progress = (answers.length / PUBLIC_INITIAL_DECISIONS) * 100;
  const isAdaptive = answers.length >= PUBLIC_ANCHOR_QUESTION_IDS.length;

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-three" />

      <section className="game-card">
        <header className="game-header">
          <Link className="wordmark" href="/">
            EraPrint
          </Link>
          <span className="step-counter">
            {Math.min(answers.length + 1, PUBLIC_INITIAL_DECISIONS)}/
            {PUBLIC_INITIAL_DECISIONS}
          </span>
        </header>

        <div className="progress-track" aria-label="Game progress">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="question-stage" key={currentQuestion.id}>
          <div className="question-meta">
            <span>{currentQuestion.category}</span>
            {isAdaptive && <span className="adaptive-pill">picked for you</span>}
          </div>

          <h1 className="question-title">{currentQuestion.prompt}</h1>

          <div
            className={`choice-grid ${
              currentQuestion.choices.length === 2 ? "choice-grid-two" : ""
            }`}
          >
            {currentQuestion.choices.map((choice) => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                visual={currentQuestion.type === "VISUAL_PICK"}
                disabled={
                  advancing ||
                  (answers.length >= PUBLIC_ANCHOR_QUESTION_IDS.length - 1 &&
                    !adaptiveTree[choice.id])
                }
                onSelect={() => choose(choice.id)}
              />
            ))}
          </div>

          {error ? (
            <p className="game-error">{error}</p>
          ) : (
            <p className="game-hint">
              Pick instinctively. There is no “right” answer.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
