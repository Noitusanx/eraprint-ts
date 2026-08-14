import { PUBLIC_QUESTIONS, type PublicQuestion } from "../data/public-catalog";
import type { Answer } from "../scoring/types";
import { buildRefinementProgress } from "./refinement-session";

export type RefinementQuestionPrefetch = Record<string, PublicQuestion | null>;

export function buildRefinementQuestionPrefetch(
  baseAnswers: Answer[],
  sessionAnswers: Answer[],
  question: PublicQuestion | null,
): RefinementQuestionPrefetch {
  if (!question) return {};

  return Object.fromEntries(question.choices.map((choice) => {
    const progress = buildRefinementProgress(baseAnswers, [
      ...sessionAnswers,
      { questionId: question.id, choiceId: choice.id },
    ]);
    const next = progress.nextQuestion;
    const publicNext = next
      ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === next.id) ?? null
      : null;
    return [choice.id, publicNext];
  }));
}
