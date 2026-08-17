import { ANCHOR_QUESTION_IDS, QUESTIONS } from "../src/lib/data/catalog";
import { HIDDEN_CHOICE_EFFECTS } from "../src/lib/scoring/hidden-era-model";
import { calculateHiddenEraScores, selectNextAdaptiveQuestion, selectNextHiddenAdaptiveQuestion } from "../src/lib/scoring/scoring-engine";
import { HIDDEN_ERA_CODES, type Answer, type HiddenEraCode } from "../src/lib/scoring/types";
import { applyHiddenQuestionExperiment } from "../src/lib/scoring/hidden-question-experiment";

applyHiddenQuestionExperiment();

const RUNS = Number(process.env.HIDDEN_AUDIT_RUNS ?? 20_000);
const SEED = 2_026_0818;
const SELECTOR = process.env.HIDDEN_SELECTOR === "public" ? "public" : "instrument";
const round = (value: number) => Math.round(value * 100) / 100;
function randomSource(seed: number) { let state = seed >>> 0; return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296); }
function percentile(values: number[], fraction: number) { return values[Math.floor((values.length - 1) * fraction)] ?? 0; }
function answersFor(count: number, random: () => number) {
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
function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance = sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length;
  return { mean: round(mean), standardDeviation: round(Math.sqrt(variance)), minimum: sorted[0], p10: percentile(sorted, .1), p25: percentile(sorted, .25), median: percentile(sorted, .5), p75: percentile(sorted, .75), p90: percentile(sorted, .9), maximum: sorted.at(-1) };
}
function experiment(count: number) {
  const random = randomSource(SEED + count);
  const scores = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, [] as number[]])) as Record<HiddenEraCode, number[]>;
  const evidence = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, [] as number[]])) as Record<HiddenEraCode, number[]>;
  const selections: Record<string, number> = {};
  for (let run = 0; run < RUNS; run += 1) {
    const answers = answersFor(count, random);
    for (const answer of answers.slice(ANCHOR_QUESTION_IDS.length)) selections[answer.questionId] = (selections[answer.questionId] ?? 0) + 1;
    const hidden = calculateHiddenEraScores(answers);
    for (const code of HIDDEN_ERA_CODES) { scores[code].push(hidden[code].score); evidence[code].push(hidden[code].evidenceCount); }
  }
  return {
    answers: count,
    dimensions: Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, { scores: summarize(scores[code]), evidence: summarize(evidence[code]) }])),
    adaptiveSelections: Object.fromEntries(Object.entries(selections).sort((a, b) => b[1] - a[1]).map(([id, total]) => [id, round(total / RUNS * 100)])),
  };
}
const coverage = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
  const positiveQuestions = new Set<string>(); const negativeQuestions = new Set<string>();
  let positive = 0; let negative = 0; let expectedEffect = 0;
  for (const question of QUESTIONS) {
    const effects = question.choices.map((choice) => HIDDEN_CHOICE_EFFECTS[choice.id]?.[code] ?? 0);
    if (effects.some((effect) => effect > 0)) positiveQuestions.add(question.id);
    if (effects.some((effect) => effect < 0)) negativeQuestions.add(question.id);
    positive += effects.filter((effect) => effect > 0).length;
    negative += effects.filter((effect) => effect < 0).length;
    expectedEffect += effects.reduce((sum, effect) => sum + effect, 0) / effects.length;
  }
  return [code, { positiveQuestions: [...positiveQuestions], negativeQuestions: [...negativeQuestions], positiveOpportunities: positive, negativeOpportunities: negative, expectedUniformEffect: round(expectedEffect) }];
}));
console.log(JSON.stringify({ runs: RUNS, seed: SEED, selector: SELECTOR, coverage, simulations: [experiment(13), experiment(30)] }, null, 2));
