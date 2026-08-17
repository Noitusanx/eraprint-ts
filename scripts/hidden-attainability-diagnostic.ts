import { ANCHOR_QUESTION_IDS, ERAS } from "../src/lib/data/catalog";
import { ERA_HIDDEN_PROFILES, HIDDEN_CHOICE_EFFECTS } from "../src/lib/scoring/hidden-era-model";
import {
  PILOT_QUESTION_COUNT,
  PILOT_QUESTIONS,
  calculatePilotHiddenScores,
  getNextPilotQuestion,
  validatePilotAnswers,
} from "../src/lib/scoring/pilot-engine";
import { HIDDEN_ERA_CODES, type Answer, type HiddenEraCode, type HiddenEraScore } from "../src/lib/scoring/types";

type Candidate = { answers: Answer[]; hidden: Record<HiddenEraCode, HiddenEraScore>; signature: string };
type Objective = (candidate: Candidate) => number;

const BEAM_WIDTH = Number(process.env.HIDDEN_ATTAINABILITY_BEAM ?? 20_000);
const SAMPLE_RUNS = Number(process.env.HIDDEN_ATTAINABILITY_SAMPLES ?? 100_000);
const SEED = 2_026_0819;
const FIXED_QUESTION_IDS = new Set([...ANCHOR_QUESTION_IDS, "Q18"]);
const round = (value: number, places = 4) => Math.round(value * 10 ** places) / 10 ** places;

function signature(answers: Answer[]) {
  return answers.map(({ questionId, choiceId }) => `${questionId}:${choiceId}`).join("|");
}

function hiddenDistance(hidden: Record<HiddenEraCode, HiddenEraScore>, eraCode: string) {
  let numerator = 0;
  let denominator = 0;
  for (const code of HIDDEN_ERA_CODES) {
    const signal = hidden[code];
    if (signal.reliability <= 0) continue;
    const target = ERA_HIDDEN_PROFILES[eraCode][code];
    const adjustedTarget = 50 + signal.reliability * (target - 50);
    numerator += signal.reliability * ((signal.score - adjustedTarget) / 100) ** 2;
    denominator += signal.reliability;
  }
  return denominator === 0 ? 0.25 : numerator / denominator;
}

function rawTargetRms(hidden: Record<HiddenEraCode, HiddenEraScore>, eraCode: string) {
  return Math.sqrt(HIDDEN_ERA_CODES.reduce((sum, code) =>
    sum + ((hidden[code].score - ERA_HIDDEN_PROFILES[eraCode][code]) / 100) ** 2, 0) / HIDDEN_ERA_CODES.length);
}

function beamSearch(objective: Objective): Candidate {
  let beam: Candidate[] = [{ answers: [], hidden: calculatePilotHiddenScores([]), signature: "" }];
  for (let depth = 0; depth < PILOT_QUESTION_COUNT; depth += 1) {
    const expanded: Candidate[] = [];
    for (const candidate of beam) {
      const question = getNextPilotQuestion(candidate.answers);
      if (!question) continue;
      for (const choice of question.choices) {
        const answers = [...candidate.answers, { questionId: question.id, choiceId: choice.id }];
        expanded.push({ answers, hidden: calculatePilotHiddenScores(answers), signature: signature(answers) });
      }
    }
    expanded.sort((a, b) => objective(a) - objective(b) || a.signature.localeCompare(b.signature));
    beam = expanded.slice(0, BEAM_WIDTH);
  }
  const best = beam[0];
  if (!best || validatePilotAnswers(best.answers, true).length) throw new Error("Beam search produced an invalid pilot path.");
  return best;
}

function pathView(candidate: Candidate) {
  return {
    selectedQuestionIds: candidate.answers.map(({ questionId }) => questionId),
    selectedChoiceIds: candidate.answers.map(({ choiceId }) => choiceId),
    scores: Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, candidate.hidden[code].score])),
    evidence: Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, {
      count: candidate.hidden[code].evidenceCount,
      reliability: candidate.hidden[code].reliability,
      totalEffect: candidate.hidden[code].totalEffect,
    }])),
  };
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
}

function percentile(sorted: number[], fraction: number) {
  return sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
}

function classification(distance: number) {
  if (distance <= 0.1) return "GOOD";
  if (distance <= 0.2) return "MODERATE";
  return "POOR";
}

function main() {
  if (!Number.isInteger(BEAM_WIDTH) || BEAM_WIDTH < 1) throw new Error("Beam width must be a positive integer.");
  if (!Number.isInteger(SAMPLE_RUNS) || SAMPLE_RUNS < 1) throw new Error("Sample runs must be a positive integer.");

  const scoreBounds = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const minimum = beamSearch((candidate) => candidate.hidden[code].score);
    const maximum = beamSearch((candidate) => -candidate.hidden[code].score);
    return [code, { minimum, maximum }];
  })) as Record<HiddenEraCode, { minimum: Candidate; maximum: Candidate }>;
  const evidenceBounds = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const minimum = beamSearch((candidate) => candidate.hidden[code].evidenceCount);
    const maximum = beamSearch((candidate) => -candidate.hidden[code].evidenceCount);
    return [code, { minimum, maximum }];
  })) as Record<HiddenEraCode, { minimum: Candidate; maximum: Candidate }>;
  const eraMatches = Object.fromEntries(ERAS.map((era) => [era.code, beamSearch((candidate) => rawTargetRms(candidate.hidden, era.code))])) as Record<string, Candidate>;

  const random = randomSource(SEED);
  const evidenceSamples = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, [] as number[]])) as Record<HiddenEraCode, number[]>;
  const scoreSamples = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, [] as number[]])) as Record<HiddenEraCode, number[]>;
  const adaptiveSelections = Object.fromEntries(PILOT_QUESTIONS.map(({ id }) => [id, 0])) as Record<string, number>;
  for (let run = 0; run < SAMPLE_RUNS; run += 1) {
    const answers: Answer[] = [];
    while (answers.length < PILOT_QUESTION_COUNT) {
      const question = getNextPilotQuestion(answers);
      if (!question) throw new Error("Sample generation stopped before 13 answers.");
      adaptiveSelections[question.id] += 1;
      const choice = question.choices[Math.floor(random() * question.choices.length)];
      answers.push({ questionId: question.id, choiceId: choice.id });
    }
    const hidden = calculatePilotHiddenScores(answers);
    for (const code of HIDDEN_ERA_CODES) {
      evidenceSamples[code].push(hidden[code].evidenceCount);
      scoreSamples[code].push(hidden[code].score);
    }
  }
  for (const code of HIDDEN_ERA_CODES) {
    evidenceSamples[code].sort((a, b) => a - b);
    scoreSamples[code].sort((a, b) => a - b);
  }

  const questionCoverage = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const questions = PILOT_QUESTIONS.filter((question) => question.choices.some((choice) => (HIDDEN_CHOICE_EFFECTS[choice.id]?.[code] ?? 0) !== 0));
    const opportunities = questions.map((question) => {
      const effects = question.choices.map((choice) => HIDDEN_CHOICE_EFFECTS[choice.id]?.[code] ?? 0);
      return {
        questionId: question.id,
        fixedOrForced: FIXED_QUESTION_IDS.has(question.id),
        selectionFrequency: round(adaptiveSelections[question.id] / SAMPLE_RUNS),
        nonZeroChoiceCount: effects.filter(Boolean).length,
        choiceCount: effects.length,
        maximumAbsoluteEffect: Math.max(...effects.map(Math.abs)),
      };
    });
    return [code, {
      evidenceProvidingQuestionCount: questions.length,
      fixedOrForcedEvidenceQuestions: opportunities.filter(({ fixedOrForced }) => fixedOrForced).map(({ questionId }) => questionId),
      adaptiveEvidenceQuestions: opportunities.filter(({ fixedOrForced }) => !fixedOrForced).map(({ questionId }) => questionId),
      questions: opportunities,
    }];
  }));

  const dimensions = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const min = scoreBounds[code].minimum;
    const max = scoreBounds[code].maximum;
    const evidence = evidenceSamples[code];
    const maximumEffects = max.answers.map(({ choiceId }) => Math.abs(HIDDEN_CHOICE_EFFECTS[choiceId]?.[code] ?? 0)).filter(Boolean);
    const maximumEffectShare = maximumEffects.length ? Math.max(...maximumEffects) / maximumEffects.reduce((a, b) => a + b, 0) : 0;
    return [code, {
      boundStatus: "best paths found by deterministic bounded beam search; not proven global extrema",
      minimumScoreFound: min.hidden[code].score,
      minimumPath: pathView(min),
      maximumScoreFound: max.hidden[code].score,
      maximumPath: pathView(max),
      sampledScoreRange: { minimum: scoreSamples[code][0], median: percentile(scoreSamples[code], 0.5), maximum: scoreSamples[code].at(-1) },
      evidenceCount: {
        minimumFound: evidenceBounds[code].minimum.hidden[code].evidenceCount,
        sampledMedian: percentile(evidence, 0.5),
        maximumFound: evidenceBounds[code].maximum.hidden[code].evidenceCount,
        minimumPath: pathView(evidenceBounds[code].minimum),
        maximumPath: pathView(evidenceBounds[code].maximum),
      },
      largestSingleEffectShareOnMaximumPath: round(maximumEffectShare),
      questionCoverage: questionCoverage[code],
    }];
  }));

  const eras = Object.fromEntries(ERAS.map((era) => {
    const best = eraMatches[era.code];
    const distance = hiddenDistance(best.hidden, era.code);
    const rawDistance = rawTargetRms(best.hidden, era.code);
    const dimensionGaps = HIDDEN_ERA_CODES.map((code) => ({
      code,
      target: ERA_HIDDEN_PROFILES[era.code][code],
      reachableScore: best.hidden[code].score,
      absoluteRawGap: round(Math.abs(best.hidden[code].score - ERA_HIDDEN_PROFILES[era.code][code])),
    })).sort((a, b) => b.absoluteRawGap - a.absoluteRawGap);
    return [era.code, {
      target: ERA_HIDDEN_PROFILES[era.code],
      closestReachableScoreFound: Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, best.hidden[code].score])),
      modelHiddenDistance: round(distance, 8),
      rawNormalizedRmsDistance: round(rawDistance, 8),
      rawRmsDistancePoints: round(rawDistance * 100, 4),
      classification: classification(rawDistance),
      classificationCriterion: "GOOD <= 10 points RMS; MODERATE > 10 and <= 20; POOR > 20 raw score points RMS",
      limitingDimensions: dimensionGaps,
      path: pathView(best),
    }];
  }));

  const narSyntheticMaximum = 58.3;
  const narInstrumentMaximum = scoreBounds.NAR.maximum.hidden.NAR.score;
  const narConclusion = narInstrumentMaximum > narSyntheticMaximum
    ? "The synthetic personas did not choose the highest-NAR reachable answers; the instrument reaches beyond 58.3. Any remaining gap to high-NAR Era targets is also an instrument limitation."
    : "The observed synthetic maximum is at or near the best high-NAR path found, indicating an instrument limitation.";

  const report = {
    methodology: {
      selector: "real getNextPilotQuestion()",
      scorer: "real calculatePilotHiddenScores()",
      answerCount: PILOT_QUESTION_COUNT,
      search: "deterministic objective-specific beam search",
      beamWidth: BEAM_WIDTH,
      exactEnumeration: false,
      boundClaim: "All reported extrema and closest paths are best paths found, not proven mathematical global optima.",
      sampling: { method: "seeded uniform choice sampling through the real selector", runs: SAMPLE_RUNS, seed: SEED },
      targetSearchObjective: "minimum raw normalized RMS distance between reachable hidden scores and literal Era hidden targets",
      modelHiddenDistanceReportedSeparately: true,
      classificationThresholdsFixedBeforeFinalTargetSearch: { GOOD: "raw RMS <= 10 score points", MODERATE: "10 < raw RMS <= 20 score points", POOR: "raw RMS > 20 score points" },
      allReportedPathsValidated: true,
    },
    dimensions,
    eras,
    conclusions: {
      syntheticNarMaximum: narSyntheticMaximum,
      instrumentNarMaximumFound: narInstrumentMaximum,
      narAssessment: narConclusion,
      hardestTargets: Object.entries(eras).sort(([, a], [, b]) => b.rawNormalizedRmsDistance - a.rawNormalizedRmsDistance).slice(0, 5).map(([code, value]) => ({ code, rawRmsDistancePoints: value.rawRmsDistancePoints, modelHiddenDistance: value.modelHiddenDistance, classification: value.classification, limitingDimensions: value.limitingDimensions.slice(0, 2).map(({ code: dimension }) => dimension) })),
    },
  };

  for (const value of Object.values(scoreBounds)) {
    if (validatePilotAnswers(value.minimum.answers, true).length || validatePilotAnswers(value.maximum.answers, true).length) throw new Error("Invalid score-bound path.");
  }
  for (const value of Object.values(evidenceBounds)) {
    if (validatePilotAnswers(value.minimum.answers, true).length || validatePilotAnswers(value.maximum.answers, true).length) throw new Error("Invalid evidence-bound path.");
  }
  for (const value of Object.values(eraMatches)) {
    if (validatePilotAnswers(value.answers, true).length) throw new Error("Invalid Era-target path.");
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
