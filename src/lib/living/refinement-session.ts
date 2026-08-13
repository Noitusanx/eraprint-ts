import { QUESTIONS } from "../data/catalog";
import { selectNextAdaptiveQuestion, validateLivingEraPrintAnswers } from "../scoring/scoring-engine";
import type { Answer } from "../scoring/types";

export function buildRefinementProgress(baseAnswers: Answer[], sessionAnswers: Answer[]) {
  const errors = validateLivingEraPrintAnswers(baseAnswers, sessionAnswers);
  const nextQuestion = errors.length
    ? null
    : selectNextAdaptiveQuestion([...baseAnswers, ...sessionAnswers]);

  return {
    errors,
    nextQuestion,
    sessionAnswerCount: sessionAnswers.length,
    cumulativeAnswerCount: baseAnswers.length + sessionAnswers.length,
    remainingCount: Math.max(0, QUESTIONS.length - baseAnswers.length - sessionAnswers.length),
    catalogExhausted: errors.length === 0 && nextQuestion === null,
  };
}
