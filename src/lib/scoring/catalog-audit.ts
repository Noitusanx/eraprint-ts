import { ANCHOR_QUESTION_IDS, ERAS, QUESTIONS, TRAITS } from "../data/catalog";
import {
  calculateEraBlend,
  calculateHiddenEraScores,
  calculateEraPrint,
  calculateTraitScores,
  selectNextAdaptiveQuestion,
} from "./scoring-engine";
import { HIDDEN_ERA_CODES, type Answer, type QuestionDefinition, type TraitCode } from "./types";
import { ERA_HIDDEN_PROFILES } from "./hidden-era-model";

export type CatalogAuditOptions = {
  runs?: number;
  seed?: number;
  targets?: number[];
};

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function percentile(sorted: number[], fraction: number) {
  return sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
}

function buildRandomAnswers(target: number, random: () => number): Answer[] {
  const answers: Answer[] = [];
  while (answers.length < target) {
    const question = answers.length < ANCHOR_QUESTION_IDS.length
      ? QUESTIONS.find((candidate) => candidate.id === ANCHOR_QUESTION_IDS[answers.length]) ?? null
      : selectNextAdaptiveQuestion(answers);
    if (!question) break;
    const choice = question.choices[Math.floor(random() * question.choices.length)];
    answers.push({ questionId: question.id, choiceId: choice.id });
  }
  return answers;
}

export function auditCatalogBias(options: CatalogAuditOptions = {}) {
  const runs = options.runs ?? 20_000;
  const seed = options.seed ?? 1_305_1989;
  const targets = options.targets ?? [13, QUESTIONS.length];

  const effects = Object.fromEntries(TRAITS.map((trait) => {
    const counts = {
      positive: 0,
      negative: 0,
      plusOne: 0,
      plusTwo: 0,
      minusOne: 0,
      minusTwo: 0,
      questionsTouching: 0,
      bidirectionalQuestions: 0,
      expectedUniformEffect: 0,
    };
    for (const question of QUESTIONS) {
      const values = question.choices.map((choice) => choice.effects[trait.code] ?? 0);
      const nonZero = values.filter(Boolean);
      if (nonZero.length) counts.questionsTouching += 1;
      if (values.some((value) => value > 0) && values.some((value) => value < 0)) {
        counts.bidirectionalQuestions += 1;
      }
      counts.expectedUniformEffect +=
        values.reduce((sum, value) => sum + value, 0) / values.length;
      for (const value of nonZero) {
        if (value > 0) counts.positive += 1;
        if (value < 0) counts.negative += 1;
        if (value === 1) counts.plusOne += 1;
        if (value === 2) counts.plusTwo += 1;
        if (value === -1) counts.minusOne += 1;
        if (value === -2) counts.minusTwo += 1;
      }
    }
    return [trait.code, {
      ...counts,
      expectedUniformEffect: Math.round(counts.expectedUniformEffect * 100) / 100,
    }];
  }));

  const simulations = targets.map((target, targetIndex) => {
    const random = createRandom(seed + targetIndex);
    const traitSamples = Object.fromEntries(
      TRAITS.map((trait) => [trait.code, [] as number[]]),
    ) as Record<TraitCode, number[]>;
    const primaryEras = Object.fromEntries(ERAS.map((era) => [era.code, 0])) as Record<string, number>;
    const adaptiveSelections: Record<string, number> = {};

    for (let run = 0; run < runs; run += 1) {
      const answers = buildRandomAnswers(target, random);
      for (const answer of answers.slice(ANCHOR_QUESTION_IDS.length)) {
        adaptiveSelections[answer.questionId] = (adaptiveSelections[answer.questionId] ?? 0) + 1;
      }
      const result = calculateEraPrint(answers);
      primaryEras[result.primaryEra.code] += 1;
      for (const trait of TRAITS) traitSamples[trait.code].push(result.traitScores[trait.code].score);
    }

    return {
      answers: target,
      runs,
      traits: Object.fromEntries(TRAITS.map((trait) => {
        const values = traitSamples[trait.code].sort((a, b) => a - b);
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        return [trait.code, {
          mean: Math.round(mean * 100) / 100,
          median: percentile(values, 0.5),
          p10: percentile(values, 0.1),
          p90: percentile(values, 0.9),
          minimum: values[0],
          maximum: values.at(-1),
        }];
      })),
      primaryEras: Object.fromEntries(ERAS.map((era) => [
        era.code,
        Math.round((primaryEras[era.code] / runs) * 10_000) / 100,
      ])),
      adaptiveSelections: Object.fromEntries(
        Object.entries(adaptiveSelections)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([questionId, count]) => [questionId, Math.round((count / runs) * 100) / 100]),
      ),
    };
  });

  return { seed, runs, effects, simulations };
}

function targetDistance(answers: Answer[], eraCode: string) {
  const scores = calculateTraitScores(answers);
  const hidden = calculateHiddenEraScores(answers);
  const era = ERAS.find((candidate) => candidate.code === eraCode)!;
  const personalityDistance = TRAITS.reduce((sum, trait) => {
    const difference = scores[trait.code].score - era.profile[trait.code];
    return sum + difference * difference;
  }, 0);
  const hiddenDistance = HIDDEN_ERA_CODES.reduce((sum, code) => {
    const difference = hidden[code].score - ERA_HIDDEN_PROFILES[eraCode][code];
    return sum + difference * difference;
  }, 0);
  return personalityDistance + 0.5 * hiddenDistance;
}

export function findEraReachability(targetAnswers = QUESTIONS.length, beamWidth = 600, hiddenWeight?: number) {
  const evaluate = (answers: Answer[]) => {
    if (hiddenWeight === undefined) return calculateEraPrint(answers);
    const eraBlend = calculateEraBlend(
      calculateTraitScores(answers),
      calculateHiddenEraScores(answers),
      hiddenWeight,
    );
    return { eraBlend, primaryEra: eraBlend[0] };
  };
  return Object.fromEntries(ERAS.map((era) => {
    let beam: Answer[][] = [[]];
    for (let index = 0; index < targetAnswers; index += 1) {
      const expanded: Answer[][] = [];
      for (const answers of beam) {
        const question: QuestionDefinition | null = index < ANCHOR_QUESTION_IDS.length
          ? QUESTIONS.find((candidate) => candidate.id === ANCHOR_QUESTION_IDS[index]) ?? null
          : selectNextAdaptiveQuestion(answers);
        if (!question) continue;
        for (const choice of question.choices) {
          expanded.push([...answers, { questionId: question.id, choiceId: choice.id }]);
        }
      }
      beam = expanded
        .map((answers) => ({ answers, distance: targetDistance(answers, era.code) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, beamWidth)
        .map((candidate) => candidate.answers);
    }
    const match = beam
      .map((answers) => ({ answers, result: evaluate(answers) }))
      .sort((a, b) => b.result.eraBlend.find((item) => item.code === era.code)!.percentage -
        a.result.eraBlend.find((item) => item.code === era.code)!.percentage)
      .find((candidate) => candidate.result.primaryEra.code === era.code);
    const finalCandidates = beam
      .map((answers) => ({ answers, result: evaluate(answers) }));
    const best = match ?? finalCandidates
      .sort((a, b) => b.result.eraBlend.find((item) => item.code === era.code)!.percentage -
        a.result.eraBlend.find((item) => item.code === era.code)!.percentage)[0];
    return [era.code, {
      reachable: best?.result.primaryEra.code === era.code,
      candidateWins: finalCandidates.filter((candidate) => candidate.result.primaryEra.code === era.code).length,
      primary: best?.result.primaryEra.code ?? null,
      percentage: best?.result.eraBlend.find((item) => item.code === era.code)?.percentage ?? 0,
      answers: best?.answers ?? [],
    }];
  }));
}
