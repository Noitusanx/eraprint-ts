"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PUBLIC_ANCHOR_QUESTION_IDS,
  PUBLIC_INITIAL_DECISIONS,
  PUBLIC_QUESTIONS,
  type PublicChoice,
  type PublicQuestion,
} from "@/lib/data/public-catalog";
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

async function fetchNextAdaptiveQuestion(answers: Answer[]): Promise<string | null> {
  const response = await fetch("/api/game/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });

  const body = (await response.json()) as {
    questionId?: string | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "Unable to load the next choice.");
  }

  return body.questionId ?? null;
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

  const currentQuestionId = questionIds[answers.length];
  const currentQuestion: PublicQuestion | undefined = PUBLIC_QUESTIONS.find(
    (question) => question.id === currentQuestionId,
  );

  const choose = async (choiceId: string) => {
    if (!currentQuestion || advancing) return;

    setAdvancing(true);
    setError(null);

    const nextAnswers: Answer[] = [
      ...answers,
      { questionId: currentQuestion.id, choiceId },
    ];

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
        const nextQuestionId = await fetchNextAdaptiveQuestion(nextAnswers);

        if (!nextQuestionId) {
          throw new Error("No adaptive question was available.");
        }

        setQuestionIds((current) =>
          current.includes(nextQuestionId)
            ? current
            : [...current, nextQuestionId],
        );
      }

      await new Promise((resolve) => window.setTimeout(resolve, 120));
      setAnswers(nextAnswers);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while loading the next choice.",
      );
    } finally {
      setAdvancing(false);
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
                disabled={advancing}
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
