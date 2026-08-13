import { calculateEraPrint } from "../scoring/scoring-engine";
import type { Answer } from "../scoring/types";

export function buildRefinedEraPrint(baseAnswers: Answer[], newAnswers: Answer[]) {
  const cumulativeAnswers = [...baseAnswers, ...newAnswers];
  return { cumulativeAnswers, result: calculateEraPrint(cumulativeAnswers) };
}
