import { ANCHOR_QUESTION_IDS, ERAS, QUESTIONS, TRAITS } from "../src/lib/data/catalog";
import { findEraReachability } from "../src/lib/scoring/catalog-audit";
import { calculateEraBlend, calculateEraPrint, calculateTraitScores, selectNextAdaptiveQuestion } from "../src/lib/scoring/scoring-engine";
import type { Answer, TraitCode, TraitScore } from "../src/lib/scoring/types";

type Profile = Record<TraitCode, number>;
type CandidateName = "baseline" | "conservative" | "moderate" | "strong";
const RUNS = Number(process.env.CALIBRATION_RUNS ?? 10_000);
const BEAM_WIDTH = Number(process.env.CALIBRATION_BEAM ?? 120);
const SEED = 2_026_0816;
const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

const baseline = Object.fromEntries(ERAS.map((era) => [era.code, { ...era.profile }])) as Record<string, Profile>;

const candidates: Record<Exclude<CandidateName, "baseline">, Partial<Record<string, Partial<Profile>>>> = {
  conservative: {
    DEBUT: { ROM: 80, NOS: 70, GRD: 30 },
    FEARLESS: { ESC: 80 },
    "1989": { ROM: 50, NOS: 40, ESC: 35, GRD: 60 },
    SPEAK_NOW: { ROM: 80, AUT: 85, REF: 75, GRD: 30 },
    RED: { EMO: 100, NOS: 100, AUT: 50, ESC: 40, GRD: 20 },
    LOVER: { ROM: 100, AUT: 65, REF: 70, SOC: 85 },
    FOLKLORE: { ROM: 60, GRD: 40 },
    EVERMORE: { ROM: 40, EMO: 80, GRD: 60 },
    MIDNIGHTS: { ROM: 50, GRD: 70 },
    TTPD: { EMO: 100, NOS: 100, ESC: 85, SOC: 30 },
    SHOWGIRL: { ROM: 80, NOS: 35, AUT: 100, REF: 50 },
  },
  moderate: {
    DEBUT: { ROM: 85, NOS: 70, AUT: 40, GRD: 25 },
    FEARLESS: { ROM: 100, REF: 50, ESC: 85, SOC: 70, GRD: 15 },
    "1989": { ROM: 45, EMO: 60, NOS: 35, REF: 45, ESC: 35, GRD: 65 },
    REPUTATION: { ROM: 60, EMO: 90, AUT: 100, GRD: 95 },
    SPEAK_NOW: { ROM: 85, EMO: 75, NOS: 70, AUT: 90, REF: 70, ESC: 60, SOC: 55, GRD: 25 },
    RED: { ROM: 80, EMO: 100, NOS: 100, AUT: 45, ESC: 35, SOC: 65, GRD: 15 },
    LOVER: { EMO: 65, NOS: 60, AUT: 60, REF: 75, ESC: 60, SOC: 85 },
    FOLKLORE: { ROM: 65, NOS: 80, AUT: 55, GRD: 35 },
    EVERMORE: { ROM: 35, EMO: 85, NOS: 95, AUT: 70, ESC: 90, GRD: 65 },
    MIDNIGHTS: { ROM: 45, NOS: 75, AUT: 70, REF: 100, SOC: 50, GRD: 75 },
    TTPD: { ROM: 60, EMO: 100, NOS: 100, ESC: 90, SOC: 25 },
    SHOWGIRL: { ROM: 75, EMO: 80, NOS: 30, AUT: 100, REF: 45, ESC: 45, GRD: 20 },
  },
  strong: {
    DEBUT: { ROM: 88, EMO: 65, NOS: 72, AUT: 38, GRD: 20 },
    FEARLESS: { ROM: 100, NOS: 60, AUT: 60, REF: 45, ESC: 90, SOC: 75, GRD: 10 },
    "1989": { ROM: 40, EMO: 55, NOS: 30, REF: 40, ESC: 30, GRD: 70 },
    REPUTATION: { ROM: 55, EMO: 90, AUT: 100, GRD: 100 },
    SPEAK_NOW: { ROM: 90, EMO: 75, NOS: 65, AUT: 95, REF: 65, ESC: 55, SOC: 60, GRD: 20 },
    RED: { ROM: 85, EMO: 100, NOS: 100, AUT: 40, REF: 90, ESC: 30, SOC: 65, GRD: 10 },
    LOVER: { ROM: 100, EMO: 65, NOS: 65, AUT: 55, REF: 80, ESC: 65, SOC: 80, GRD: 10 },
    FOLKLORE: { ROM: 65, EMO: 65, NOS: 80, AUT: 55, SOC: 20, GRD: 30 },
    EVERMORE: { ROM: 30, EMO: 85, NOS: 95, AUT: 70, ESC: 85, GRD: 70 },
    MIDNIGHTS: { ROM: 40, NOS: 75, AUT: 70, REF: 100, ESC: 70, SOC: 45, GRD: 80 },
    TTPD: { ROM: 60, EMO: 100, NOS: 100, AUT: 80, ESC: 95, SOC: 20, GRD: 50 },
    SHOWGIRL: { ROM: 70, EMO: 80, NOS: 25, AUT: 100, REF: 40, ESC: 40, GRD: 25 },
  },
};

const reasons: Partial<Record<string, Partial<Record<TraitCode, string>>>> = {
  DEBUT: { ROM: "Youthful romantic openness", EMO: "More heartfelt than generic neutral", NOS: "Attachment to formative beginnings", AUT: "Less self-directed than later eras", GRD: "Open, unguarded early-era voice" },
  FEARLESS: { ROM: "Fairytale romantic idealism", NOS: "Less past-bound than Red", AUT: "Braver forward motion", REF: "More action-forward", ESC: "Fairytale imagination", SOC: "Bright outward energy", GRD: "Open-heartedness" },
  "1989": { ROM: "Less romance-led", EMO: "More emotionally controlled", NOS: "Reinvention over nostalgia", REF: "Externally focused", ESC: "Concrete polished world", GRD: "Curated public self" },
  REPUTATION: { ROM: "Less romance-led than Lover", EMO: "High emotional stakes", AUT: "Defiant self-direction", GRD: "Highly protective persona" },
  SPEAK_NOW: { ROM: "Earnest romantic storytelling", EMO: "Less overwhelming than Red/TTPD", NOS: "Less past-bound than Red", AUT: "Authorial self-assertion", REF: "Less inward than Midnights", ESC: "Storytelling without folklore-level world-building", SOC: "More outward than Midnights", GRD: "Direct emotional openness" },
  RED: { ROM: "Romantic intensity", EMO: "Maximum emotional vividness", NOS: "Maximum attachment to the past", AUT: "Less controlled/self-directed", REF: "Reflective heartbreak", ESC: "Concrete autobiography rather than world-building", SOC: "More outward than TTPD", GRD: "Emotionally exposed" },
  LOVER: { ROM: "Defining romantic idealism", EMO: "Softer emotional tone", NOS: "Some sentimental attachment", AUT: "Relational rather than self-dominant", REF: "More inward softness than Showgirl", ESC: "Colorful romantic imagination", SOC: "Warm social energy without Showgirl maximalism", GRD: "Radical openness" },
  FOLKLORE: { ROM: "More tender idealism than evermore", EMO: "Quieter emotional register", NOS: "Less weathered nostalgia than evermore", AUT: "Observer rather than declarative voice", SOC: "Deeply private storytelling", GRD: "More emotionally permeable than evermore" },
  EVERMORE: { ROM: "More cautious, weathered romance", EMO: "Sharper emotional weight", NOS: "Heavier attachment to past chapters", AUT: "More resolved self-possession", ESC: "Slightly less dreamworld-heavy than folklore", GRD: "More protective and closed" },
  MIDNIGHTS: { ROM: "Less romance-led", NOS: "Less past-saturated than TTPD", AUT: "Less declarative than Speak Now", REF: "Maximum late-night introspection", ESC: "Dreamlike but not folklore fiction", SOC: "More private", GRD: "Protective nighttime self" },
  TTPD: { ROM: "Romance is present but not Lover-like", EMO: "Maximum emotional intensity", NOS: "Maximum memory fixation", AUT: "Strong authorial stance", ESC: "Heightened literary world-building", SOC: "Most private/socially withdrawn cluster member", GRD: "Protected but still emotionally legible" },
  SHOWGIRL: { ROM: "Less romance-defined than Lover", EMO: "High theatrical feeling", NOS: "Future-facing reinvention", AUT: "Maximum self-directed performance", REF: "Externally oriented", ESC: "More concrete performance than fantasy", GRD: "Open performance with some stage boundary" },
};

function applyCandidate(name: CandidateName) {
  for (const era of ERAS) {
    Object.assign(era.profile, baseline[era.code], name === "baseline" ? {} : candidates[name][era.code] ?? {});
  }
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function normal(random: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random());
}
function rms(first: Profile, second: Profile) {
  return Math.sqrt(TRAITS.reduce((sum, trait) => sum + (first[trait.code] - second[trait.code]) ** 2, 0) / 8);
}

function questionAnswers(count: number, random: () => number) {
  const answers: Answer[] = [];
  while (answers.length < count) {
    const question = answers.length < ANCHOR_QUESTION_IDS.length
      ? QUESTIONS.find((item) => item.id === ANCHOR_QUESTION_IDS[answers.length])!
      : selectNextAdaptiveQuestion(answers)!;
    const choice = question.choices[Math.floor(random() * question.choices.length)];
    answers.push({ questionId: question.id, choiceId: choice.id });
  }
  return answers;
}

function eraMetrics(blends: ReturnType<typeof calculateEraBlend>[]) {
  return Object.fromEntries(ERAS.map((era) => {
    const positions = blends.map((blend) => blend.findIndex((item) => item.code === era.code));
    const values = blends.map((blend) => blend.find((item) => item.code === era.code)!.percentage).sort((a, b) => a - b);
    return [era.code, {
      primary: round(positions.filter((position) => position === 0).length / blends.length * 100),
      secondary: round(positions.filter((position) => position === 1).length / blends.length * 100),
      top3: round(positions.filter((position) => position >= 0 && position < 3).length / blends.length * 100),
      averageBlend: round(values.reduce((sum, value) => sum + value, 0) / values.length),
      medianBlend: round(values[Math.floor(values.length / 2)]),
    }];
  }));
}

function questionExperiment(count: number, seedOffset: number) {
  const random = randomSource(SEED + seedOffset);
  const blends = Array.from({ length: RUNS }, () => calculateEraPrint(questionAnswers(count, random)).eraBlend);
  return eraMetrics(blends);
}

const observed: Record<TraitCode, { mean: number; sd: number }> = {
  ROM: { mean: 55.99, sd: 11.89 }, EMO: { mean: 59.15, sd: 9.9 },
  NOS: { mean: 58.64, sd: 11.04 }, AUT: { mean: 63.51, sd: 8.86 },
  REF: { mean: 58.58, sd: 7 }, ESC: { mean: 55.15, sd: 12.78 },
  SOC: { mean: 59.48, sd: 8.14 }, GRD: { mean: 57.1, sd: 7.38 },
};

function directExperiment(kind: "uniform" | "moderate" | "observed", seedOffset: number) {
  const random = randomSource(SEED + seedOffset);
  const blends: ReturnType<typeof calculateEraBlend>[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const traits = Object.fromEntries(TRAITS.map((trait) => {
      const score = kind === "uniform" ? random() * 100
        : kind === "moderate" ? 50 + normal(random) * 15
          : observed[trait.code].mean + normal(random) * observed[trait.code].sd;
      return [trait.code, { code: trait.code, score: clamp(score), evidenceCount: 1, totalEffect: 0, reliability: 1 }];
    })) as Record<TraitCode, TraitScore>;
    blends.push(calculateEraBlend(traits));
  }
  return eraMetrics(blends);
}

function geometry() {
  const neutral = Object.fromEntries(TRAITS.map((trait) => [trait.code, 50])) as Profile;
  return {
    matrix: Object.fromEntries(ERAS.map((era) => [era.code,
      Object.fromEntries(ERAS.map((other) => [other.code, round(rms(era.profile, other.profile))])),
    ])),
    summaries: Object.fromEntries(ERAS.map((era) => {
      const neighbors = ERAS.filter((other) => other.code !== era.code)
        .map((other) => ({ era: other.code, distance: rms(era.profile, other.profile) }))
        .sort((a, b) => a.distance - b.distance);
      return [era.code, {
        neutralDistance: round(rms(era.profile, neutral)),
        nearest: { era: neighbors[0].era, distance: round(neighbors[0].distance) },
        localCrowding: round(neighbors.slice(0, 3).reduce((sum, item) => sum + item.distance, 0) / 3),
      }];
    })),
  };
}

function changes(name: CandidateName) {
  if (name === "baseline") return [];
  return ERAS.flatMap((era) => TRAITS.flatMap((trait) => {
    const before = baseline[era.code][trait.code];
    const after = era.profile[trait.code];
    return before === after ? [] : [{
      era: era.code, trait: trait.code, current: before, candidate: after,
      delta: after - before, reason: reasons[era.code]?.[trait.code] ?? "Geometric separation consistent with Era identity",
    }];
  }));
}

function analyze(name: CandidateName, index: number) {
  applyCandidate(name);
  const reachability = process.env.CALIBRATION_SKIP_REACH === "1"
    ? {}
    : findEraReachability(30, BEAM_WIDTH);
  return {
    changes: changes(name),
    geometry: geometry(),
    simulations: {
      uniform: directExperiment("uniform", index * 100 + 1),
      moderate: directExperiment("moderate", index * 100 + 2),
      observed: directExperiment("observed", index * 100 + 3),
      questions13: questionExperiment(13, index * 100 + 4),
      questions30: questionExperiment(30, index * 100 + 5),
    },
    reachability: Object.fromEntries(Object.entries(reachability).map(([era, result]) => {
      const blend = result.answers.length ? calculateEraPrint(result.answers).eraBlend : [];
      const scores = result.answers.length ? calculateTraitScores(result.answers) : null;
      return [era, {
        reachable: result.reachable,
        candidateWins: result.candidateWins,
        margin: blend.length > 1 ? round(blend[0].percentage - blend[1].percentage) : null,
        rmsFromNeutral: scores ? round(Math.sqrt(TRAITS.reduce(
          (sum, trait) => sum + (scores[trait.code].score - 50) ** 2, 0,
        ) / 8)) : null,
      }];
    })),
  };
}

const allCandidateNames: CandidateName[] = ["baseline", "conservative", "moderate", "strong"];
const requestedCandidate = process.env.CALIBRATION_CANDIDATE as CandidateName | undefined;
if (requestedCandidate && !allCandidateNames.includes(requestedCandidate)) {
  throw new Error(`Unknown CALIBRATION_CANDIDATE: ${requestedCandidate}`);
}
const selectedCandidates = requestedCandidate ? [requestedCandidate] : allCandidateNames;
const output = Object.fromEntries(
  selectedCandidates.map((name) => [name, analyze(name, allCandidateNames.indexOf(name))]),
);
applyCandidate("baseline");
const compact = process.env.CALIBRATION_COMPACT === "1";
const primaryOnly = process.env.CALIBRATION_PRIMARY_ONLY === "1";
const printable = primaryOnly
  ? Object.fromEntries(Object.entries(output).map(([name, result]) => [name, {
      neutral: Object.fromEntries(ERAS.map((era) => [era.code, result.geometry.summaries[era.code]])),
      simulations: Object.fromEntries(Object.entries(result.simulations).map(([experiment, eras]) => [
        experiment,
        Object.fromEntries(Object.entries(eras).map(([era, metrics]) => [era, {
          primary: metrics.primary,
          secondary: metrics.secondary,
          top3: metrics.top3,
          averageBlend: metrics.averageBlend,
        }])),
      ])),
      reachability: result.reachability,
    }]))
  : compact
  ? Object.fromEntries(Object.entries(output).map(([name, result]) => [name, {
      neutral: Object.fromEntries(ERAS.map((era) => [era.code, result.geometry.summaries[era.code]])),
      simulations: result.simulations,
      reachability: result.reachability,
    }]))
  : output;
console.log(JSON.stringify({ metadata: { runs: RUNS, seed: SEED, beamWidth: BEAM_WIDTH }, candidates: printable }, null, 2));
