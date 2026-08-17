import { ANCHOR_QUESTION_IDS, ERAS, QUESTIONS, SCORING_VERSION } from "../src/lib/data/catalog";
import { ERA_HIDDEN_PROFILES } from "../src/lib/scoring/hidden-era-model";
import { calculateEraBlend, calculateHiddenEraScores, calculateTraitScores, selectNextAdaptiveQuestion, selectNextHiddenAdaptiveQuestion } from "../src/lib/scoring/scoring-engine";
import { HIDDEN_ERA_CODES, TRAIT_CODES, type Answer, type HiddenEraCode, type HiddenEraScore, type TraitCode, type TraitScore } from "../src/lib/scoring/types";
import { findEraReachability } from "../src/lib/scoring/catalog-audit";
import { applyHiddenQuestionExperiment } from "../src/lib/scoring/hidden-question-experiment";

applyHiddenQuestionExperiment();

const RUNS = Number(process.env.HIDDEN_MODEL_RUNS ?? 10_000);
const LOCAL_RUNS = Number(process.env.HIDDEN_LOCAL_RUNS ?? 2_000);
const WEIGHTS = [0, 0.1, 0.15, 0.2, 0.25, 0.3];
const SEED = 2_026_0817;
const SELECTOR = process.env.HIDDEN_SELECTOR === "public" ? "public" : "instrument";
const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
}
function normal(random: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random());
}
function score<T extends string>(code: T, value: number) {
  return { code, score: clamp(value), evidenceCount: 12, totalEffect: 0, reliability: 1 };
}
function questionAnswers(count: number, random: () => number) {
  const answers: Answer[] = [];
  while (answers.length < count) {
    const question = answers.length < ANCHOR_QUESTION_IDS.length
      ? QUESTIONS.find((item) => item.id === ANCHOR_QUESTION_IDS[answers.length])!
      : SELECTOR === "public" ? selectNextAdaptiveQuestion(answers)! : selectNextHiddenAdaptiveQuestion(answers)!;
    const choice = question.choices[Math.floor(random() * question.choices.length)];
    answers.push({ questionId: question.id, choiceId: choice.id });
  }
  return answers;
}
function metrics(blends: ReturnType<typeof calculateEraBlend>[]) {
  return Object.fromEntries(ERAS.map((era) => {
    const positions = blends.map((blend) => blend.findIndex((item) => item.code === era.code));
    return [era.code, {
      primary: round(positions.filter((p) => p === 0).length / blends.length * 100),
      secondary: round(positions.filter((p) => p === 1).length / blends.length * 100),
      top3: round(positions.filter((p) => p >= 0 && p < 3).length / blends.length * 100),
      averageBlend: round(blends.reduce((sum, blend) => sum + blend.find((item) => item.code === era.code)!.percentage, 0) / blends.length),
    }];
  }));
}
function questionExperiment(count: number, weight: number) {
  const random = randomSource(SEED + count);
  const blends = Array.from({ length: RUNS }, () => {
    const answers = questionAnswers(count, random);
    return calculateEraBlend(calculateTraitScores(answers), calculateHiddenEraScores(answers), weight);
  });
  return metrics(blends);
}
function syntheticExperiment(kind: "broad" | "moderate", weight: number) {
  const random = randomSource(SEED + (kind === "broad" ? 1 : 2));
  const blends = Array.from({ length: RUNS }, () => {
    const center = (kind === "broad" ? () => random() * 100 : () => 50 + normal(random) * 15);
    const traits = Object.fromEntries(TRAIT_CODES.map((code) => [code, score(code, center())])) as Record<TraitCode, TraitScore>;
    const hidden = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, score(code, center())])) as Record<HiddenEraCode, HiddenEraScore>;
    return calculateEraBlend(traits, hidden, weight);
  });
  return metrics(blends);
}
function localRobustness(weight: number) {
  return Object.fromEntries(ERAS.map((era, eraIndex) => {
    const random = randomSource(SEED + 1000 + eraIndex);
    const winners = new Map<string, number>();
    for (let run = 0; run < LOCAL_RUNS; run += 1) {
      const traits = Object.fromEntries(TRAIT_CODES.map((code) => [code, score(code, era.profile[code] + normal(random) * 8)])) as Record<TraitCode, TraitScore>;
      const hidden = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, score(code, ERA_HIDDEN_PROFILES[era.code][code] + normal(random) * 8)])) as Record<HiddenEraCode, HiddenEraScore>;
      const winner = calculateEraBlend(traits, hidden, weight)[0].code;
      winners.set(winner, (winners.get(winner) ?? 0) + 1);
    }
    const sorted = [...winners.entries()].sort((a, b) => b[1] - a[1]);
    return [era.code, {
      retained: round((winners.get(era.code) ?? 0) / LOCAL_RUNS * 100),
      mainStealer: sorted.find(([code]) => code !== era.code)?.[0] ?? null,
      stolen: round((sorted.find(([code]) => code !== era.code)?.[1] ?? 0) / LOCAL_RUNS * 100),
    }];
  }));
}

const requestedWeight = process.env.HIDDEN_WEIGHT === undefined ? null : Number(process.env.HIDDEN_WEIGHT);
const selectedWeights = requestedWeight === null ? WEIGHTS : WEIGHTS.filter((weight) => weight === requestedWeight);
if (selectedWeights.length === 0) throw new Error(`Unsupported HIDDEN_WEIGHT: ${process.env.HIDDEN_WEIGHT}`);
const experiments = Object.fromEntries(selectedWeights.map((weight) => [weight, {
  broad: syntheticExperiment("broad", weight),
  moderate: syntheticExperiment("moderate", weight),
  questions13: questionExperiment(13, weight),
  questions30: questionExperiment(30, weight),
  local: localRobustness(weight),
}]));

const summary = Object.fromEntries(Object.entries(experiments).map(([weight, result]) => [weight, {
  broadPrimary: Object.fromEntries(Object.entries(result.broad).map(([era, value]) => [era, value.primary])),
  moderatePrimary: Object.fromEntries(Object.entries(result.moderate).map(([era, value]) => [era, value.primary])),
  questions13Primary: Object.fromEntries(Object.entries(result.questions13).map(([era, value]) => [era, value.primary])),
  questions30Primary: Object.fromEntries(Object.entries(result.questions30).map(([era, value]) => [era, value.primary])),
  local: result.local,
}]));
function reachabilitySummary(answerCount: number, beamWidth: number, weight: number) {
  const result = findEraReachability(answerCount, beamWidth, weight);
  return Object.fromEntries(Object.entries(result).map(([era, value]) => [era, {
    reachable: value.reachable,
    candidateWins: value.candidateWins,
    primary: value.primary,
    percentage: value.percentage,
  }]));
}
console.log(JSON.stringify({
  metadata: { scoringVersion: SCORING_VERSION, runs: RUNS, localRuns: LOCAL_RUNS, seed: SEED, selector: SELECTOR, weights: selectedWeights },
  experiments: process.env.HIDDEN_COMPACT === "1" ? summary : experiments,
  reachability: process.env.HIDDEN_REACH === "1"
    ? Object.fromEntries(selectedWeights.map((weight) => [weight, {
        initial13: reachabilitySummary(13, Number(process.env.HIDDEN_BEAM ?? 200), weight),
        full30: reachabilitySummary(30, Number(process.env.HIDDEN_BEAM ?? 200), weight),
      }]))
    : undefined,
}, null, 2));
