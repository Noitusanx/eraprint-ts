import { ANCHOR_QUESTION_IDS, ERAS, QUESTIONS, SCORING_VERSION, TRAITS } from "../data/catalog";
import { ERA_HIDDEN_PROFILES, HIDDEN_CHOICE_EFFECTS, HIDDEN_ERA_WEIGHT } from "./hidden-era-model";
import { HIDDEN_ERA_CODES, TRAIT_CODES, type Answer, type EraBlendItem, type EraPrintResult, type HiddenEraCode, type HiddenEraScore, type QuestionDefinition, type TraitCode, type TraitScore } from "./types";

export const PRIOR_WEIGHT = 3;
export const HIDDEN_PRIOR_WEIGHT = 4;
export const ERA_TEMPERATURE = 0.008;
export const INITIAL_DECISIONS = 13;
export const ANCHOR_DECISIONS = ANCHOR_QUESTION_IDS.length;
const MINIMUM_PERSISTED_RESULT_ANSWERS = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

function findChoice(answer: Answer) {
  const question = QUESTIONS.find((item) => item.id === answer.questionId);
  if (!question) {
    throw new Error(`Unknown question: ${answer.questionId}`);
  }

  const choice = question.choices.find((item) => item.id === answer.choiceId);
  if (!choice) {
    throw new Error(`Choice ${answer.choiceId} does not belong to ${answer.questionId}`);
  }

  return { question, choice };
}

export function calculateTraitScores(answers: Answer[]): Record<TraitCode, TraitScore> {
  const totals = Object.fromEntries(
    TRAIT_CODES.map((code) => [code, { totalEffect: 0, evidenceCount: 0 }]),
  ) as Record<TraitCode, { totalEffect: number; evidenceCount: number }>;

  for (const answer of answers) {
    const { choice } = findChoice(answer);

    for (const [rawCode, effect] of Object.entries(choice.effects)) {
      const code = rawCode as TraitCode;
      if (effect === undefined || effect === 0) continue;
      totals[code].totalEffect += effect;
      totals[code].evidenceCount += 1;
    }
  }

  return Object.fromEntries(
    TRAIT_CODES.map((code) => {
      const { totalEffect, evidenceCount } = totals[code];
      const reliability = evidenceCount / (evidenceCount + PRIOR_WEIGHT);
      const score = clamp(
        50 + (25 * totalEffect) / (evidenceCount + PRIOR_WEIGHT),
        0,
        100,
      );

      return [
        code,
        {
          code,
          score: round1(score),
          evidenceCount,
          totalEffect,
          reliability: round2(reliability),
        },
      ];
    }),
  ) as Record<TraitCode, TraitScore>;
}

export function calculateHiddenEraScores(answers: Answer[]): Record<HiddenEraCode, HiddenEraScore> {
  const totals = Object.fromEntries(
    HIDDEN_ERA_CODES.map((code) => [code, { totalEffect: 0, evidenceCount: 0 }]),
  ) as Record<HiddenEraCode, { totalEffect: number; evidenceCount: number }>;

  for (const answer of answers) {
    const { choice } = findChoice(answer);
    for (const [rawCode, effect] of Object.entries(HIDDEN_CHOICE_EFFECTS[choice.id] ?? {})) {
      const code = rawCode as HiddenEraCode;
      if (!effect) continue;
      totals[code].totalEffect += effect;
      totals[code].evidenceCount += 1;
    }
  }

  return Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const { totalEffect, evidenceCount } = totals[code];
    const reliability = evidenceCount / (evidenceCount + HIDDEN_PRIOR_WEIGHT);
    return [code, {
      code,
      score: round1(clamp(50 + (25 * totalEffect) / (evidenceCount + HIDDEN_PRIOR_WEIGHT), 0, 100)),
      evidenceCount,
      totalEffect,
      reliability: round2(reliability),
    }];
  })) as Record<HiddenEraCode, HiddenEraScore>;
}

export function calculateEraBlend(
  traitScores: Record<TraitCode, TraitScore>,
  hiddenScores?: Record<HiddenEraCode, HiddenEraScore>,
  hiddenWeight = HIDDEN_ERA_WEIGHT,
): EraBlendItem[] {
  const weightedDistances = ERAS.map((era) => {
    let numerator = 0;
    let denominator = 0;

    for (const code of TRAIT_CODES) {
      const trait = traitScores[code];
      if (trait.reliability <= 0) continue;

      const adjustedEraTrait =
        50 + trait.reliability * (era.profile[code] - 50);
      const normalizedDifference = (trait.score - adjustedEraTrait) / 100;

      numerator += trait.reliability * normalizedDifference ** 2;
      denominator += trait.reliability;
    }

    const personalityDistance = denominator === 0 ? 0.25 : numerator / denominator;
    let hiddenNumerator = 0;
    let hiddenDenominator = 0;
    if (hiddenScores) {
      for (const code of HIDDEN_ERA_CODES) {
        const signal = hiddenScores[code];
        if (signal.reliability <= 0) continue;
        const target = ERA_HIDDEN_PROFILES[era.code][code];
        const adjustedTarget = 50 + signal.reliability * (target - 50);
        hiddenNumerator += signal.reliability * ((signal.score - adjustedTarget) / 100) ** 2;
        hiddenDenominator += signal.reliability;
      }
    }
    const hiddenDistance = hiddenDenominator === 0 ? personalityDistance : hiddenNumerator / hiddenDenominator;
    const effectiveHiddenWeight = hiddenDenominator === 0 ? 0 : hiddenWeight;
    const distance = (1 - effectiveHiddenWeight) * personalityDistance + effectiveHiddenWeight * hiddenDistance;
    const affinity = Math.exp(-distance / ERA_TEMPERATURE);

    return {
      code: era.code,
      name: era.name,
      distance,
      affinity,
    };
  });

  const totalAffinity = weightedDistances.reduce((sum, item) => sum + item.affinity, 0);

  return weightedDistances
    .map((item) => ({
      code: item.code,
      name: item.name,
      distance: item.distance,
      percentage: totalAffinity === 0 ? 0 : (item.affinity / totalAffinity) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .map((item) => ({
      ...item,
      distance: round2(item.distance),
      percentage: round1(item.percentage),
    }));
}

export function calculateClarity(
  traitScores: Record<TraitCode, TraitScore>,
): number {
  const averageReliability =
    TRAIT_CODES.reduce((sum, code) => sum + traitScores[code].reliability, 0) /
    TRAIT_CODES.length;
  const measuredTraits = TRAIT_CODES.filter(
    (code) => traitScores[code].evidenceCount > 0,
  ).length;
  const coverage = measuredTraits / TRAIT_CODES.length;

  const clarity = (0.45 * coverage + 0.55 * averageReliability) * 100;
  return round1(Math.min(95, clarity));
}

type ArchetypeRule = {
  name: string;
  score: (traits: Record<TraitCode, TraitScore>) => number;
};

const archetypeRules: ArchetypeRule[] = [
  {
    name: "The Quiet Mastermind",
    score: (t) => t.REF.score * 0.35 + t.GRD.score * 0.35 + t.AUT.score * 0.3,
  },
  {
    name: "The Memory Keeper",
    score: (t) => t.NOS.score * 0.5 + t.REF.score * 0.35 + (100 - t.SOC.score) * 0.15,
  },
  {
    name: "The Heart-First Romantic",
    score: (t) => t.ROM.score * 0.5 + t.EMO.score * 0.3 + (100 - t.GRD.score) * 0.2,
  },
  {
    name: "The Dreamworld Storyteller",
    score: (t) => t.ESC.score * 0.5 + t.REF.score * 0.3 + t.NOS.score * 0.2,
  },
  {
    name: "The Spotlight Free Spirit",
    score: (t) => t.SOC.score * 0.45 + t.AUT.score * 0.4 + (100 - t.GRD.score) * 0.15,
  },
  {
    name: "The Soft Rebel",
    score: (t) => t.AUT.score * 0.4 + t.ROM.score * 0.25 + t.EMO.score * 0.2 + (100 - t.GRD.score) * 0.15,
  },
  {
    name: "The Midnight Overthinker",
    score: (t) => t.REF.score * 0.45 + t.EMO.score * 0.3 + t.NOS.score * 0.25,
  },
  {
    name: "The Golden Optimist",
    score: (t) => t.ROM.score * 0.35 + t.SOC.score * 0.25 + (100 - t.GRD.score) * 0.25 + t.ESC.score * 0.15,
  },
  {
    name: "The Reinvention Artist",
    score: (t) => t.AUT.score * 0.5 + t.SOC.score * 0.25 + (100 - t.NOS.score) * 0.25,
  },
  {
    name: "The Private Fire",
    score: (t) => t.EMO.score * 0.4 + t.GRD.score * 0.35 + t.REF.score * 0.25,
  },
  {
    name: "The Main Character",
    score: (t) => t.SOC.score * 0.35 + t.EMO.score * 0.25 + t.AUT.score * 0.25 + t.ROM.score * 0.15,
  },
  {
    name: "The Gentle Observer",
    score: (t) => t.REF.score * 0.4 + (100 - t.SOC.score) * 0.25 + t.ROM.score * 0.2 + t.ESC.score * 0.15,
  },
];

export function selectArchetype(
  traitScores: Record<TraitCode, TraitScore>,
): string {
  return archetypeRules
    .map((rule) => ({ name: rule.name, score: rule.score(traitScores) }))
    .sort((a, b) => b.score - a.score)[0].name;
}

function stableHash(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function traitCoverage(question: QuestionDefinition): Partial<Record<TraitCode, number>> {
  const coverage: Partial<Record<TraitCode, number>> = {};

  for (const choice of question.choices) {
    for (const [rawCode, effect] of Object.entries(choice.effects)) {
      if (!effect) continue;
      const code = rawCode as TraitCode;
      coverage[code] = (coverage[code] ?? 0) + Math.abs(effect);
    }
  }

  return coverage;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

function rankQuestions(answers: Answer[], limit = 3): QuestionDefinition[] {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const traits = calculateTraitScores(answers);
  const eraBlend = calculateEraBlend(traits);
  const topEraCodes = eraBlend.slice(0, 3).map((item) => item.code);
  const candidateEras = ERAS.filter((era) => topEraCodes.includes(era.code));

  return QUESTIONS.filter((question) => !answeredIds.has(question.id))
    .map((question) => {
      const coverage = traitCoverage(question);
      let score = 0;

      for (const code of TRAIT_CODES) {
        const coverageStrength = coverage[code] ?? 0;
        if (coverageStrength === 0) continue;

        const eraVariance = variance(candidateEras.map((era) => era.profile[code]));
        const informationDeficit = 1 - traits[code].reliability;
        score += coverageStrength * (eraVariance / 625) * (0.55 + informationDeficit);
      }
      const categoryAlreadySeen = answers.some((answer) => {
        const previousQuestion = QUESTIONS.find((item) => item.id === answer.questionId);
        return previousQuestion?.category === question.category;
      });

      if (!categoryAlreadySeen) score *= 1.08;

      return { question, score };
    })
    .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id))
    .slice(0, Math.max(limit, 3))
    .map((item) => item.question);
}

export function rankAdaptiveQuestions(answers: Answer[], limit = 3): QuestionDefinition[] {
  return rankQuestions(answers, limit);
}

export function rankHiddenAdaptiveQuestions(answers: Answer[], limit = 3): QuestionDefinition[] {
  // Hidden evidence must never steer which question a user sees. Coverage is
  // supplied by the instrument; selection stays on the established public
  // personality ranking so it cannot favor an Era identity.
  return rankAdaptiveQuestions(answers, limit);
}

export function selectNextAdaptiveQuestion(
  answers: Answer[],
): QuestionDefinition | null {
  const candidates = rankAdaptiveQuestions(answers, 3);
  if (candidates.length === 0) return null;

  const seed = answers
    .map((answer) => `${answer.questionId}:${answer.choiceId}`)
    .join("|");
  const index = stableHash(seed) % candidates.length;

  return candidates[index];
}

export function selectNextHiddenAdaptiveQuestion(answers: Answer[]): QuestionDefinition | null {
  if (answers.length === ANCHOR_DECISIONS && !answers.some((answer) => answer.questionId === "Q18")) {
    return QUESTIONS.find((question) => question.id === "Q18") ?? null;
  }
  const candidates = rankHiddenAdaptiveQuestions(answers, 3);
  if (candidates.length === 0) return null;
  const seed = answers.map((answer) => `${answer.questionId}:${answer.choiceId}`).join("|");
  return candidates[stableHash(seed) % candidates.length];
}


export function validateInitialGameSequence(answers: Answer[]): string[] {
  const errors: string[] = [];

  if (answers.length < ANCHOR_DECISIONS || answers.length > INITIAL_DECISIONS) {
    errors.push(
      `Initial game expects ${ANCHOR_DECISIONS}-${INITIAL_DECISIONS} answers during evaluation.`,
    );
    return errors;
  }

  const seen = new Set<string>();

  for (let index = 0; index < answers.length; index += 1) {
    const answer = answers[index];

    if (seen.has(answer.questionId)) {
      errors.push(`Question ${answer.questionId} was answered more than once.`);
      continue;
    }
    seen.add(answer.questionId);

    try {
      findChoice(answer);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid answer.");
      continue;
    }

    if (index < ANCHOR_DECISIONS) {
      const expectedAnchor = ANCHOR_QUESTION_IDS[index];
      if (answer.questionId !== expectedAnchor) {
        errors.push(
          `Answer ${index + 1} must use anchor ${expectedAnchor}, received ${answer.questionId}.`,
        );
      }
      continue;
    }

    const expectedAdaptive = selectNextAdaptiveQuestion(answers.slice(0, index));
    if (!expectedAdaptive) {
      errors.push(`No adaptive question available at position ${index + 1}.`);
      continue;
    }

    if (answer.questionId !== expectedAdaptive.id) {
      errors.push(
        `Answer ${index + 1} must use adaptive question ${expectedAdaptive.id}, received ${answer.questionId}.`,
      );
    }
  }

  return errors;
}

export function validateLivingEraPrintAnswers(
  baseAnswers: Answer[],
  refinementAnswers: Answer[],
  maximumNewAnswers = Math.max(0, QUESTIONS.length - baseAnswers.length),
): string[] {
  const errors: string[] = [];

  if (baseAnswers.length < MINIMUM_PERSISTED_RESULT_ANSWERS) {
    errors.push("Living EraPrint requires a completed initial EraPrint.");
    return errors;
  }
  if (refinementAnswers.length > maximumNewAnswers) {
    errors.push(`This refinement session accepts at most ${maximumNewAnswers} new answers.`);
    return errors;
  }

  const cumulative = [...baseAnswers];
  const seen = new Set(baseAnswers.map((answer) => answer.questionId));

  for (const answer of refinementAnswers) {
    if (seen.has(answer.questionId)) {
      errors.push(`Question ${answer.questionId} was answered more than once.`);
      continue;
    }
    try {
      findChoice(answer);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid answer.");
      continue;
    }

    const expected = selectNextAdaptiveQuestion(cumulative);
    if (!expected) {
      errors.push("No unused refinement question is available.");
      continue;
    }
    if (answer.questionId !== expected.id) {
      errors.push(`Expected refinement question ${expected.id}, received ${answer.questionId}.`);
      continue;
    }
    seen.add(answer.questionId);
    cumulative.push(answer);
  }

  return errors;
}

export function getInitialQuestionSequence(): QuestionDefinition[] {
  return ANCHOR_QUESTION_IDS.map((id) => {
    const question = QUESTIONS.find((item) => item.id === id);
    if (!question) throw new Error(`Missing anchor question: ${id}`);
    return question;
  });
}

export function buildFingerprintCode(
  result: Pick<EraPrintResult, "primaryEra" | "secondaryEra" | "traitScores">,
): string {
  const topTraits = [...TRAITS]
    .sort(
      (a, b) =>
        Math.abs(result.traitScores[b.code].score - 50) -
        Math.abs(result.traitScores[a.code].score - 50),
    )
    .slice(0, 2)
    .map((trait) => trait.code)
    .join("-");

  const primary = result.primaryEra.code.replaceAll("_", "").slice(0, 4);
  const secondary = result.secondaryEra.code.replaceAll("_", "").slice(0, 3);

  return `${primary}-${secondary}-${topTraits}-13`;
}

export function calculateEraPrint(answers: Answer[]): EraPrintResult {
  if (answers.length === 0) {
    throw new Error("At least one answer is required to calculate an EraPrint.");
  }

  const traitScores = calculateTraitScores(answers);
  const eraBlend = calculateEraBlend(traitScores);

  const draft: EraPrintResult = {
    traitScores,
    eraBlend,
    primaryEra: eraBlend[0],
    secondaryEra: eraBlend[1],
    hiddenEra: eraBlend[2],
    archetype: selectArchetype(traitScores),
    clarity: calculateClarity(traitScores),
    fingerprintCode: "",
    scoringVersion: SCORING_VERSION,
  };

  return {
    ...draft,
    fingerprintCode: buildFingerprintCode(draft),
  };
}

export function validateCatalog(): string[] {
  const errors: string[] = [];
  const questionIds = new Set<string>();
  const choiceIds = new Set<string>();

  if (TRAITS.length !== 8) {
    errors.push(`Expected 8 traits, found ${TRAITS.length}.`);
  }

  if (ERAS.length !== 12) {
    errors.push(`Expected 12 eras, found ${ERAS.length}.`);
  }

  if (QUESTIONS.length !== 30) {
    errors.push(`Expected 30 questions, found ${QUESTIONS.length}.`);
  }

  for (const era of ERAS) {
    for (const code of TRAIT_CODES) {
      const score = era.profile[code];
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        errors.push(`${era.code}.${code} must be between 0 and 100.`);
      }
    }
  }

  for (const question of QUESTIONS) {
    if (questionIds.has(question.id)) errors.push(`Duplicate question id: ${question.id}`);
    questionIds.add(question.id);

    if (question.choices.length < 2 || question.choices.length > 4) {
      errors.push(`${question.id} must have 2-4 choices.`);
    }

    for (const choice of question.choices) {
      if (choiceIds.has(choice.id)) errors.push(`Duplicate choice id: ${choice.id}`);
      choiceIds.add(choice.id);

      for (const [rawCode, effect] of Object.entries(choice.effects)) {
        if (!TRAIT_CODES.includes(rawCode as TraitCode)) {
          errors.push(`${choice.id} contains unknown trait ${rawCode}.`);
        }
        if (!Number.isInteger(effect) || effect < -2 || effect > 2 || effect === 0) {
          errors.push(`${choice.id}.${rawCode} effect must be -2, -1, 1, or 2.`);
        }
      }
    }
  }

  for (const anchorId of ANCHOR_QUESTION_IDS) {
    if (!questionIds.has(anchorId)) errors.push(`Unknown anchor question: ${anchorId}`);
  }

  return errors;
}
