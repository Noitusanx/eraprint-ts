import { PUBLIC_QUESTIONS, type PublicQuestion } from "../data/public-catalog";
import { selectNextAdaptiveQuestion } from "./scoring-engine";
import type { Answer } from "./types";

export function selectNextPublicAdaptiveQuestion(
  answers: Answer[],
): PublicQuestion | null {
  const next = selectNextAdaptiveQuestion(answers);
  return next
    ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === next.id) ?? null
    : null;
}
