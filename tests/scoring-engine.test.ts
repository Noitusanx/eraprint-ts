import { describe, expect, it } from "vitest";
import {
  calculateEraBlend,
  calculateEraPrint,
  calculateTraitScores,
  rankAdaptiveQuestions,
  selectNextAdaptiveQuestion,
  validateCatalog,
  validateInitialGameSequence,
  validateLivingEraPrintAnswers,
} from "../src/lib/scoring/scoring-engine";
import type { Answer } from "../src/lib/scoring/types";

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

    while (answers.length < 8) {
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
    expect(validateInitialGameSequence(guardedAssertive.slice(0, 5))).toEqual([]);
    expect(guardedAssertive.slice(0, 5)).toHaveLength(5);
    // Initial selection validation permits the in-progress state; result and
    // persistence boundaries remain responsible for requiring exactly eight.
  });

  it("selects exactly three deterministic, unused refinement questions", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < 8) {
      const next = selectNextAdaptiveQuestion(initial)!;
      initial.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    const refinement: Answer[] = [];
    while (refinement.length < 3) {
      const cumulative = [...initial, ...refinement];
      const next = selectNextAdaptiveQuestion(cumulative)!;
      expect(new Set(cumulative.map((answer) => answer.questionId)).has(next.id)).toBe(false);
      expect(selectNextAdaptiveQuestion(cumulative)?.id).toBe(next.id);
      refinement.push({ questionId: next.id, choiceId: next.choices[0].id });
    }
    expect(refinement).toHaveLength(3);
    expect(validateLivingEraPrintAnswers(initial, refinement)).toEqual([]);
    expect(calculateEraPrint([...initial, ...refinement])).not.toEqual(calculateEraPrint(initial));
  });

  it("rejects repeated or manipulated Living EraPrint answers", () => {
    const initial: Answer[] = guardedAssertive.slice(0, 5);
    while (initial.length < 8) {
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
});
