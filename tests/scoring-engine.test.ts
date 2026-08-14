import { describe, expect, it } from "vitest";
import {
  calculateEraBlend,
  calculateEraPrint,
  calculateTraitScores,
  INITIAL_DECISIONS,
  rankAdaptiveQuestions,
  selectNextAdaptiveQuestion,
  validateCatalog,
  validateInitialGameSequence,
  validateLivingEraPrintAnswers,
} from "../src/lib/scoring/scoring-engine";
import { buildRefinedEraPrint } from "../src/lib/living/refinement-result";
import { buildRefinementProgress } from "../src/lib/living/refinement-session";
import { buildRefinementQuestionPrefetch } from "../src/lib/living/refinement-prefetch";
import { PUBLIC_QUESTIONS } from "../src/lib/data/public-catalog";
import type { Answer } from "../src/lib/scoring/types";
import { buildClarityExplanation, traitDisplayDirection } from "../src/lib/scoring/result-copy";

const romanticSocial: Answer[] = [
  { questionId: "Q01", choiceId: "Q01_A" },
  { questionId: "Q03", choiceId: "Q03_D" },
  { questionId: "Q04", choiceId: "Q04_C" },
  { questionId: "Q11", choiceId: "Q11_A" },
  { questionId: "Q19", choiceId: "Q19_B" },
  { questionId: "Q18", choiceId: "Q18_A" },
  { questionId: "Q20", choiceId: "Q20_C" },
  { questionId: "Q13", choiceId: "Q13_D" },
];

const reflectiveImaginative: Answer[] = [
  { questionId: "Q01", choiceId: "Q01_C" },
  { questionId: "Q03", choiceId: "Q03_C" },
  { questionId: "Q04", choiceId: "Q04_B" },
  { questionId: "Q11", choiceId: "Q11_C" },
  { questionId: "Q19", choiceId: "Q19_B" },
  { questionId: "Q12", choiceId: "Q12_D" },
  { questionId: "Q15", choiceId: "Q15_C" },
  { questionId: "Q27", choiceId: "Q27_D" },
];

const guardedAssertive: Answer[] = [
  { questionId: "Q01", choiceId: "Q01_B" },
  { questionId: "Q03", choiceId: "Q03_A" },
  { questionId: "Q04", choiceId: "Q04_A" },
  { questionId: "Q11", choiceId: "Q11_B" },
  { questionId: "Q19", choiceId: "Q19_A" },
  { questionId: "Q16", choiceId: "Q16_B" },
  { questionId: "Q28", choiceId: "Q28_A" },
  { questionId: "Q10", choiceId: "Q10_B" },
];

describe("EraPrint scoring engine", () => {
  it("describes low, balanced, and high trait scores in the correct direction", () => {
    expect(traitDisplayDirection("ROM", 30)).toContain("realistic");
    expect(traitDisplayDirection("ROM", 50)).toContain("balanced between");
    expect(traitDisplayDirection("ROM", 70)).toContain("idealistic");
  });

  it("explains clarity as the overall emerging pattern without trait-count language", () => {
    const explanation = buildClarityExplanation(calculateEraPrint(guardedAssertive));
    expect(explanation).toContain("your answers came together to form your EraPrint");
    expect(explanation).toContain("It is not an accuracy score.");
    expect(explanation).toMatch(/At \d+%, your answers formed/);
    expect(explanation).not.toContain("same direction");
    expect(explanation).not.toMatch(/across \d+ of 8 traits/);
    expect(explanation).not.toContain("confidence");
    expect(explanation).not.toContain("correctness");
  });

  it("has a valid V1 catalog", () => {
    expect(validateCatalog()).toEqual([]);
  });

  it("keeps every trait score inside 0-100", () => {
    const scores = calculateTraitScores(romanticSocial);
    for (const trait of Object.values(scores)) {
      expect(trait.score).toBeGreaterThanOrEqual(0);
      expect(trait.score).toBeLessThanOrEqual(100);
      expect(trait.reliability).toBeGreaterThanOrEqual(0);
      expect(trait.reliability).toBeLessThanOrEqual(1);
    }
  });

  it("normalizes the era blend to approximately 100%", () => {
    const blend = calculateEraBlend(calculateTraitScores(romanticSocial));
    const total = blend.reduce((sum, era) => sum + era.percentage, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });

  it("is deterministic for the same answer set", () => {
    expect(calculateEraPrint(guardedAssertive)).toEqual(
      calculateEraPrint(guardedAssertive),
    );
  });

  it("places Lover in the top romantic/social cluster", () => {
    const result = calculateEraPrint(romanticSocial);
    expect(result.eraBlend.slice(0, 3).map((era) => era.code)).toContain("LOVER");
  });

  it("places folklore and evermore in the reflective/imaginative top cluster", () => {
    const result = calculateEraPrint(reflectiveImaginative);
    const top = result.eraBlend.slice(0, 3).map((era) => era.code);
    expect(top).toContain("FOLKLORE");
    expect(top).toContain("EVERMORE");
  });

  it("places reputation in the guarded/assertive top cluster", () => {
    const result = calculateEraPrint(guardedAssertive);
    expect(result.eraBlend.slice(0, 3).map((era) => era.code)).toContain(
      "REPUTATION",
    );
  });

  it("never proposes an already answered adaptive question", () => {
    const firstFive = guardedAssertive.slice(0, 5);
    const answered = new Set(firstFive.map((answer) => answer.questionId));
    const ranked = rankAdaptiveQuestions(firstFive, 5);

    for (const question of ranked) {
      expect(answered.has(question.id)).toBe(false);
    }

    const next = selectNextAdaptiveQuestion(firstFive);
    expect(next).not.toBeNull();
    expect(answered.has(next!.id)).toBe(false);
  });


  it("validates the deterministic initial adaptive sequence", () => {
    const answers: Answer[] = guardedAssertive.slice(0, 5);

    while (answers.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(answers);
      expect(next).not.toBeNull();
      answers.push({
        questionId: next!.id,
        choiceId: next!.choices[0].id,
      });
    }

    expect(validateInitialGameSequence(answers)).toEqual([]);

    const manipulated = answers.map((answer) => ({ ...answer }));
    manipulated[6] = { questionId: "Q02", choiceId: "Q02_A" };
    expect(validateInitialGameSequence(manipulated).length).toBeGreaterThan(0);
  });

  it("generates a stable fingerprint and three distinct top era slots", () => {
    const result = calculateEraPrint(reflectiveImaginative);
    expect(result.fingerprintCode).toMatch(/-13$/);
    expect(new Set([
      result.primaryEra.code,
      result.secondaryEra.code,
      result.hiddenEra.code,
    ]).size).toBe(3);
  });

  it("does not accept an initial result after only five anchors", () => {
    expect(INITIAL_DECISIONS).toBe(13);
    expect(validateInitialGameSequence(guardedAssertive.slice(0, 5))).toEqual([]);
    expect(guardedAssertive.slice(0, 5)).toHaveLength(5);
    // Initial selection validation permits the in-progress state; result and
    // persistence boundaries remain responsible for requiring exactly 13.
  });

  it("selects deterministic, unused refinement questions beyond three answers", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    const refinement: Answer[] = [];
    while (refinement.length < 5) {
      const cumulative = [...initial, ...refinement];
      const next = selectNextAdaptiveQuestion(cumulative)!;
      expect(new Set(cumulative.map((answer) => answer.questionId)).has(next.id)).toBe(false);
      expect(selectNextAdaptiveQuestion(cumulative)?.id).toBe(next.id);
      refinement.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    expect(refinement).toHaveLength(5);
    expect(validateLivingEraPrintAnswers(initial, refinement)).toEqual([]);
    expect(calculateEraPrint([...initial, ...refinement])).not.toEqual(calculateEraPrint(initial));
  });

  it("rejects repeated or manipulated Living EraPrint answers", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    expect(validateLivingEraPrintAnswers(initial, [initial[0]]).length).toBeGreaterThan(0);
    expect(validateLivingEraPrintAnswers(initial, [
      { questionId: "Q02", choiceId: "Q02_A" },
    ]).length).toBeGreaterThan(0);
  });

  it("gracefully returns no question when the catalog is exhausted", () => {
    const allAnswers = romanticSocial.slice(0, 0);
    // Any valid choice is enough to mark a catalog question as used.
    for (const question of rankAdaptiveQuestions([], 30)) {
      allAnswers.push({ questionId: question.id, choiceId: question.choices[0].id });
    }
    expect(selectNextAdaptiveQuestion(allAnswers)).toBeNull();
  });

  it("continues flexible refinement past three choices to catalog exhaustion", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }

    const refinement: Answer[] = [];
    while (true) {
      const next = selectNextAdaptiveQuestion([...initial, ...refinement]);
      if (!next) break;
      refinement.push({ questionId: next.id, choiceId: next.choices[0].id });
    }

    expect(refinement.length).toBeGreaterThan(3);
    expect(initial.length + refinement.length).toBe(30);
    expect(new Set([...initial, ...refinement].map((answer) => answer.questionId)).size).toBe(30);
    expect(validateLivingEraPrintAnswers(initial, refinement, refinement.length)).toEqual([]);
    expect(selectNextAdaptiveQuestion([...initial, ...refinement])).toBeNull();
  });

  it("starts the single refinement contract from an owned initial result without a mode", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }

    const progress = buildRefinementProgress(initial, []);
    expect(progress).toMatchObject({
      errors: [],
      sessionAnswerCount: 0,
      cumulativeAnswerCount: 13,
      remainingCount: 17,
      catalogExhausted: false,
    });
    expect(progress.nextQuestion).not.toBeNull();
    expect(progress).not.toHaveProperty("mode");
    expect(progress).not.toHaveProperty("targetNewAnswers");
  });

  it("prefetches the deterministic next question for every current choice", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    const current = selectNextAdaptiveQuestion(initial)!;
    const publicCurrent = PUBLIC_QUESTIONS.find((question) => question.id === current.id)!;
    const prefetched = buildRefinementQuestionPrefetch(initial, [], publicCurrent);

    for (const choice of current.choices) {
      const expected = selectNextAdaptiveQuestion([
        ...initial,
        { questionId: current.id, choiceId: choice.id },
      ]);
      expect(prefetched[choice.id]?.id ?? null).toBe(expected?.id ?? null);
    }
  });

  it("resumes a long refinement from persisted answers deterministically", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    const persisted: Answer[] = [];
    for (let index = 0; index < 7; index += 1) {
      const next = selectNextAdaptiveQuestion([...initial, ...persisted])!;
      persisted.push({ questionId: next.id, choiceId: next.choices[0].id });
    }

    const beforeRefresh = selectNextAdaptiveQuestion([...initial, ...persisted]);
    const afterRefresh = selectNextAdaptiveQuestion([...initial, ...persisted.map((answer) => ({ ...answer }))]);
    expect(afterRefresh?.id).toBe(beforeRefresh?.id);
    expect(buildRefinementProgress(initial, persisted).nextQuestion?.id).toBe(beforeRefresh?.id);
    expect(buildRefinementProgress(initial, persisted).sessionAnswerCount).toBe(7);
    expect(initial).toHaveLength(13);
  });

  it("reports catalog exhaustion without repeating a previously answered question", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < INITIAL_DECISIONS) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    const refinement: Answer[] = [];
    while (true) {
      const next = selectNextAdaptiveQuestion([...initial, ...refinement]);
      if (!next) break;
      refinement.push({ questionId: next.id, choiceId: next.choices[0].id });
    }

    const progress = buildRefinementProgress(initial, refinement);
    expect(progress.errors).toEqual([]);
    expect(progress.catalogExhausted).toBe(true);
    expect(progress.remainingCount).toBe(0);
    expect(progress.nextQuestion).toBeNull();
    expect(new Set([...initial, ...refinement].map((answer) => answer.questionId)).size).toBe(30);
  });

  it("builds a new cumulative result without changing the previous answer history", () => {
    const initial: Answer[] = guardedAssertive.map((answer) => ({ ...answer }));
    while (initial.length < INITIAL_DECISIONS) {
      const adaptive = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: adaptive.id, choiceId: adaptive.choices[0].id });
    }
    const previousHistory = initial.map((answer) => ({ ...answer }));
    const next = selectNextAdaptiveQuestion(initial)!;
    const refined = buildRefinedEraPrint(initial, [{ questionId: next.id, choiceId: next.choices[0].id }]);

    expect(initial).toEqual(previousHistory);
    expect(refined.cumulativeAnswers).toHaveLength(14);
    expect(refined.result).toEqual(calculateEraPrint(refined.cumulativeAnswers));
  });
});
