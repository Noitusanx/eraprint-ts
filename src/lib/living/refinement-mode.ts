import { QUESTIONS } from "../data/catalog";
import { calculateEraPrint } from "../scoring/scoring-engine";
import type { Answer } from "../scoring/types";

export type RefinementMode = "CONTINUOUS";

export function refinementTarget(baseAnswerCount: number) {
  return Math.max(0, QUESTIONS.length - baseAnswerCount);
}

export function buildRefinedEraPrint(baseAnswers: Answer[], newAnswers: Answer[]) {
  const cumulativeAnswers = [...baseAnswers, ...newAnswers];
  return { cumulativeAnswers, result: calculateEraPrint(cumulativeAnswers) };
}
