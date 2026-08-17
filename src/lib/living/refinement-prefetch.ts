import { PUBLIC_QUESTIONS, type PublicQuestion } from "../data/public-catalog";
import type { Answer } from "../scoring/types";
import { buildRefinementProgress } from "./refinement-session";

export type RefinementQuestionPrefetch = Record<string, PublicQuestion | null>;

export type RefinementQuestionBranch = {
  question: PublicQuestion | null;
  nextByChoice: RefinementQuestionTree;
};

export type RefinementQuestionTree = Record<string, RefinementQuestionBranch>;

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

export function buildRefinementQuestionTree(
  baseAnswers: Answer[],
  sessionAnswers: Answer[],
  question: PublicQuestion | null,
  depth = 3,
): RefinementQuestionTree {
  if (!question || depth <= 0) return {};

  return Object.fromEntries(question.choices.map((choice) => {
    const updated = [
      ...sessionAnswers,
      { questionId: question.id, choiceId: choice.id },
    ];
    const progress = buildRefinementProgress(baseAnswers, updated);
    const next = progress.nextQuestion;
    const publicNext = next
      ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === next.id) ?? null
      : null;
    return [choice.id, {
      question: publicNext,
      nextByChoice: buildRefinementQuestionTree(
        baseAnswers,
        updated,
        publicNext,
        depth - 1,
      ),
    }];
  }));
}
