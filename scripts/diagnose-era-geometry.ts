import { ANCHOR_QUESTION_IDS, CATALOG_VERSION, ERAS, QUESTIONS, SCORING_VERSION, TRAITS } from "../src/lib/data/catalog";
import { calculateEraBlend, calculateEraPrint, calculateTraitScores, selectNextAdaptiveQuestion } from "../src/lib/scoring/scoring-engine";
import { findEraReachability } from "../src/lib/scoring/catalog-audit";
import type { Answer, TraitCode, TraitScore } from "../src/lib/scoring/types";

const RUNS = Number(process.env.DIAGNOSTIC_RUNS ?? 30_000);
const SEED = 2_026_0815;
const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normal(random: () => number) {
  const first = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance = sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length;
  const at = (fraction: number) => sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0;
  return {
    mean: round(mean),
    standardDeviation: round(Math.sqrt(variance)),
    p10: round(at(0.1)),
    p25: round(at(0.25)),
    median: round(at(0.5)),
    p75: round(at(0.75)),
    p90: round(at(0.9)),
  };
}

function randomQuestionAnswers(count: number, random: () => number, adaptive = true): Answer[] {
  const answers: Answer[] = [];
  const fixed = QUESTIONS.filter((question) => !ANCHOR_QUESTION_IDS.includes(
    question.id as (typeof ANCHOR_QUESTION_IDS)[number],
  ));
  while (answers.length < count) {
    const question = answers.length < ANCHOR_QUESTION_IDS.length
      ? QUESTIONS.find((candidate) => candidate.id === ANCHOR_QUESTION_IDS[answers.length])!
      : adaptive
        ? selectNextAdaptiveQuestion(answers)!
        : fixed[answers.length - ANCHOR_QUESTION_IDS.length];
    const choice = question.choices[Math.floor(random() * question.choices.length)];
    answers.push({ questionId: question.id, choiceId: choice.id });
  }
  return answers;
}

type RankedProfile = {
  traits: Record<TraitCode, TraitScore>;
  blend: ReturnType<typeof calculateEraBlend>;
};

function summarizeProfiles(profiles: RankedProfile[]) {
  return {
    traits: Object.fromEntries(TRAITS.map((trait) => [
      trait.code,
      summarize(profiles.map((profile) => profile.traits[trait.code].score)),
    ])),
    eras: Object.fromEntries(ERAS.map((era) => {
      const positions = profiles.map((profile) => profile.blend.findIndex((item) => item.code === era.code));
      const blends = profiles.map((profile) => profile.blend.find((item) => item.code === era.code)!.percentage);
      return [era.code, {
        primary: round(positions.filter((position) => position === 0).length / profiles.length * 100),
        secondary: round(positions.filter((position) => position === 1).length / profiles.length * 100),
        top3: round(positions.filter((position) => position >= 0 && position < 3).length / profiles.length * 100),
        averageBlend: summarize(blends).mean,
        medianBlend: summarize(blends).median,
      }];
    })),
  };
}

function questionExperiment(answerCount: number, adaptive: boolean, forceReliabilityOne = false) {
  const random = randomSource(SEED + answerCount + Number(adaptive) * 100 + Number(forceReliabilityOne) * 1_000);
  const profiles: RankedProfile[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const result = calculateEraPrint(randomQuestionAnswers(answerCount, random, adaptive));
    const traits = forceReliabilityOne
      ? Object.fromEntries(TRAITS.map((trait) => [trait.code, {
          ...result.traitScores[trait.code],
          reliability: 1,
        }])) as Record<TraitCode, TraitScore>
      : result.traitScores;
    profiles.push({ traits, blend: forceReliabilityOne ? calculateEraBlend(traits) : result.eraBlend });
  }
  return summarizeProfiles(profiles);
}

function directTraitExperiment(
  seedOffset: number,
  sampler: (trait: TraitCode, random: () => number) => number,
) {
  const random = randomSource(SEED + seedOffset);
  const profiles: RankedProfile[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const traits = Object.fromEntries(TRAITS.map((trait) => [trait.code, {
      code: trait.code,
      score: clamp(sampler(trait.code, random)),
      evidenceCount: 1,
      totalEffect: 0,
      reliability: 1,
    }])) as Record<TraitCode, TraitScore>;
    profiles.push({ traits, blend: calculateEraBlend(traits) });
  }
  return summarizeProfiles(profiles);
}

function rmsDistance(first: Record<TraitCode, number>, second: Record<TraitCode, number>) {
  return Math.sqrt(TRAITS.reduce(
    (sum, trait) => sum + (first[trait.code] - second[trait.code]) ** 2,
    0,
  ) / TRAITS.length);
}

const pairwise = Object.fromEntries(ERAS.map((era) => [era.code,
  Object.fromEntries(ERAS.map((other) => [other.code, round(rmsDistance(era.profile, other.profile))])),
]));
const neutral = Object.fromEntries(TRAITS.map((trait) => [trait.code, 50])) as Record<TraitCode, number>;
const geometry = Object.fromEntries(ERAS.map((era) => {
  const neighbors = ERAS.filter((other) => other.code !== era.code)
    .map((other) => ({ code: other.code, distance: rmsDistance(era.profile, other.profile) }))
    .sort((a, b) => a.distance - b.distance);
  return [era.code, {
    neutralDistance: round(rmsDistance(era.profile, neutral)),
    nearest: { ...neighbors[0], distance: round(neighbors[0].distance) },
    farthest: { ...neighbors.at(-1)!, distance: round(neighbors.at(-1)!.distance) },
    averageThreeNearest: round(neighbors.slice(0, 3).reduce((sum, item) => sum + item.distance, 0) / 3),
  }];
}));

const question13 = questionExperiment(13, true);
const question30 = questionExperiment(30, true);
const observedStats = question30.traits as Record<TraitCode, ReturnType<typeof summarize>>;
const uniform = directTraitExperiment(10, (_trait, random) => random() * 100);
const moderate = directTraitExperiment(20, (_trait, random) => 50 + normal(random) * 15);
const observedShape = directTraitExperiment(30, (trait, random) =>
  observedStats[trait].mean + normal(random) * observedStats[trait].standardDeviation,
);
const reachability = findEraReachability(30, 250);
const reachabilityQuality = Object.fromEntries(Object.entries(reachability).map(([era, item]) => {
  const scores = item.answers.length ? calculateTraitScores(item.answers) : null;
  const blend = item.answers.length ? calculateEraPrint(item.answers).eraBlend : [];
  return [era, {
    reachable: item.reachable,
    candidateWins: item.candidateWins,
    winningBlend: item.percentage,
    marginOverSecond: blend.length >= 2 ? round(blend[0].percentage - blend[1].percentage) : null,
    rmsFromNeutral: scores
      ? round(Math.sqrt(TRAITS.reduce((sum, trait) => sum + (scores[trait.code].score - 50) ** 2, 0) / 8))
      : null,
    uniformTraitSpaceFrequency: uniform.eras[era].primary,
    moderateTraitSpaceFrequency: moderate.eras[era].primary,
  }];
}));

console.log(JSON.stringify({
  metadata: { runs: RUNS, seed: SEED, scoringVersion: SCORING_VERSION, catalogVersion: CATALOG_VERSION },
  geometry: { pairwise, summaries: geometry },
  questionBased: {
    adaptive13: question13,
    adaptive30: question30,
    fixedOrder13: questionExperiment(13, false),
    reliabilityOne13: questionExperiment(13, true, true),
    reliabilityOne30: questionExperiment(30, true, true),
  },
  traitSpace: {
    uniformIndependent: uniform,
    moderateNormal50Sd15: moderate,
    observedMeansIndependentObservedSd: observedShape,
  },
  reachabilityQuality,
}, null, 2));
