import { ERAS } from "../src/lib/data/catalog";
import { ERA_HIDDEN_PROFILES } from "../src/lib/scoring/hidden-era-model";
import {
  PILOT_HIDDEN_WEIGHT,
  PILOT_QUESTION_COUNT,
  PILOT_QUESTIONS,
  calculatePilotEraPrint,
  calculatePilotEraPrintDiagnostic,
  getNextPilotQuestion,
} from "../src/lib/scoring/pilot-engine";
import { ERA_TEMPERATURE } from "../src/lib/scoring/scoring-engine";
import {
  HIDDEN_ERA_CODES,
  TRAIT_CODES,
  type Answer,
  type HiddenEraCode,
  type HiddenEraScore,
  type TraitCode,
  type TraitScore,
} from "../src/lib/scoring/types";

type SyntheticPersona = { id: string; label: string; answers: Record<string, string> };
type Scores = {
  public: Record<TraitCode, TraitScore>;
  hidden: Record<HiddenEraCode, HiddenEraScore>;
};

const CASE_IDS = ["P01", "P04", "P08", "P09", "P10", "P12"];
const round = (value: number, places = 8) => Math.round(value * 10 ** places) / 10 ** places;

function parsePersonas(input: string): SyntheticPersona[] {
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== "object" || !("personas" in parsed) || !Array.isArray(parsed.personas)) {
    throw new Error("Input must contain a personas array.");
  }
  return parsed.personas.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Persona ${index + 1} must be an object.`);
    const persona = value as Partial<SyntheticPersona>;
    if (typeof persona.id !== "string" || !persona.id || typeof persona.label !== "string" || !persona.label) {
      throw new Error(`Persona ${index + 1} must have an id and label.`);
    }
    if (!persona.answers || typeof persona.answers !== "object" || Array.isArray(persona.answers)) {
      throw new Error(`Persona ${persona.id} is missing an answer map.`);
    }
    return persona as SyntheticPersona;
  });
}

function replay(persona: SyntheticPersona): Answer[] {
  const answers: Answer[] = [];
  while (answers.length < PILOT_QUESTION_COUNT) {
    const question = getNextPilotQuestion(answers);
    if (!question) throw new Error(`Pilot selector stopped early for ${persona.id}.`);
    const choiceId = persona.answers[question.id];
    if (!question.choices.some((choice) => choice.id === choiceId)) {
      throw new Error(`Invalid or missing ${question.id} answer for ${persona.id}.`);
    }
    answers.push({ questionId: question.id, choiceId });
  }
  return answers;
}

function decomposeEra(eraCode: string, scores: Scores) {
  const era = ERAS.find(({ code }) => code === eraCode);
  if (!era) throw new Error(`Unknown Era ${eraCode}.`);

  let publicNumerator = 0;
  let publicDenominator = 0;
  for (const code of TRAIT_CODES) {
    const trait = scores.public[code];
    if (trait.reliability <= 0) continue;
    const adjustedTarget = 50 + trait.reliability * (era.profile[code] - 50);
    publicNumerator += trait.reliability * ((trait.score - adjustedTarget) / 100) ** 2;
    publicDenominator += trait.reliability;
  }
  const publicDistance = publicDenominator === 0 ? 0.25 : publicNumerator / publicDenominator;

  let hiddenNumerator = 0;
  let hiddenDenominator = 0;
  const hiddenDimensions = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const signal = scores.hidden[code];
    const target = ERA_HIDDEN_PROFILES[eraCode][code];
    const adjustedTarget = 50 + signal.reliability * (target - 50);
    const adjustedDifference = signal.score - adjustedTarget;
    const weightedSquaredContribution = signal.reliability * (adjustedDifference / 100) ** 2;
    if (signal.reliability > 0) {
      hiddenNumerator += weightedSquaredContribution;
      hiddenDenominator += signal.reliability;
    }
    return [code, {
      personaScore: signal.score,
      eraTarget: target,
      rawDifference: round(signal.score - target),
      reliability: signal.reliability,
      reliabilityAdjustedTarget: round(adjustedTarget),
      adjustedDifference: round(adjustedDifference),
      weightedSquaredContribution: round(weightedSquaredContribution),
    }];
  })) as Record<HiddenEraCode, {
    personaScore: number; eraTarget: number; rawDifference: number; reliability: number;
    reliabilityAdjustedTarget: number; adjustedDifference: number; weightedSquaredContribution: number;
  }>;
  const hiddenDistance = hiddenDenominator === 0 ? publicDistance : hiddenNumerator / hiddenDenominator;
  const finalDistance10 = (1 - PILOT_HIDDEN_WEIGHT) * publicDistance + PILOT_HIDDEN_WEIGHT * hiddenDistance;

  return {
    code: era.code,
    name: era.name,
    publicDistance,
    publicMatchAffinity: Math.exp(-publicDistance / ERA_TEMPERATURE),
    hiddenDistance,
    hiddenMatchAffinity: Math.exp(-hiddenDistance / ERA_TEMPERATURE),
    hiddenAdvantage: publicDistance - hiddenDistance,
    finalDistanceShift: finalDistance10 - publicDistance,
    finalDistance10,
    finalMatchAffinity10: Math.exp(-finalDistance10 / ERA_TEMPERATURE),
    hiddenDimensions,
  };
}

function rankDecompositions(scores: Scores) {
  const decomposed = ERAS.map(({ code }) => decomposeEra(code, scores));
  const control = [...decomposed].sort((a, b) => a.publicDistance - b.publicDistance);
  const experimental = [...decomposed].sort((a, b) => a.finalDistance10 - b.finalDistance10);
  const totalFinalAffinity = experimental.reduce((sum, era) => sum + era.finalMatchAffinity10, 0);
  return decomposed.map((era) => {
    const rank0 = control.findIndex(({ code }) => code === era.code) + 1;
    const rank10 = experimental.findIndex(({ code }) => code === era.code) + 1;
    return {
      ...era,
      finalBlendPercentage10: 100 * era.finalMatchAffinity10 / totalFinalAffinity,
      rank0,
      rank10,
      rankMovement: rank0 - rank10,
    };
  });
}

function publicEraView(era: ReturnType<typeof rankDecompositions>[number]) {
  return {
    code: era.code,
    name: era.name,
    publicDistance: round(era.publicDistance),
    publicMatchAffinity: round(era.publicMatchAffinity),
    hiddenDistance: round(era.hiddenDistance),
    hiddenMatchAffinity: round(era.hiddenMatchAffinity),
    hiddenAdvantage: round(era.hiddenAdvantage),
    finalDistanceShift: round(era.finalDistanceShift),
    finalCombinedDistance10: round(era.finalDistance10),
    finalMatchAffinity10: round(era.finalMatchAffinity10),
    finalBlendPercentage10: round(era.finalBlendPercentage10, 4),
    rank0: era.rank0,
    rank10: era.rank10,
    rankMovement: era.rankMovement,
  };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) throw new Error("Expected the synthetic persona dataset on stdin.");
  const inputs = parsePersonas(input);
  if (inputs.length !== 20) throw new Error(`Expected 20 personas, received ${inputs.length}.`);
  for (const persona of inputs) for (const { id } of PILOT_QUESTIONS) {
    if (!(id in persona.answers)) throw new Error(`${persona.id} is missing ${id}.`);
  }

  const calculations = inputs.map((persona) => {
    const answers = replay(persona);
    const control = calculatePilotEraPrintDiagnostic(answers, 0);
    const experimental = calculatePilotEraPrint(answers);
    const scores = { public: experimental.result.traitScores, hidden: experimental.hiddenScores };
    const eras = rankDecompositions(scores);
    const ranked0 = [...eras].sort((a, b) => a.rank0 - b.rank0);
    const ranked10 = [...eras].sort((a, b) => a.rank10 - b.rank10);

    const reconstructed10 = ranked10.map(({ code, finalDistance10, finalBlendPercentage10 }) => ({
      code, distance: round(finalDistance10, 2), percentage: round(finalBlendPercentage10, 1),
    }));
    const actual10 = experimental.result.eraBlend.map(({ code, distance, percentage }) => ({ code, distance, percentage }));
    if (JSON.stringify(reconstructed10) !== JSON.stringify(actual10)) throw new Error(`${persona.id} 10% decomposition does not match the pilot calculator.`);
    if (ranked0.map(({ code }) => code).join() !== control.result.eraBlend.map(({ code }) => code).join()) {
      throw new Error(`${persona.id} 0% decomposition does not match the pilot calculator.`);
    }
    return { persona, answers, scores, eras, ranked0, ranked10 };
  });

  const cases = calculations.filter(({ persona }) => CASE_IDS.includes(persona.id)).map((item) => {
    const relevantCodes = new Set([
      ...item.ranked0.slice(0, 3).map(({ code }) => code),
      ...item.ranked10.slice(0, 3).map(({ code }) => code),
    ]);
    return {
      id: item.persona.id,
      label: item.persona.label,
      selectedQuestionIds: item.answers.map(({ questionId }) => questionId),
      consumedChoiceIds: item.answers.map(({ choiceId }) => choiceId),
      publicTraitScores: Object.fromEntries(TRAIT_CODES.map((code) => [code, item.scores.public[code].score])),
      hiddenScores: Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, item.scores.hidden[code].score])),
      ordering0: item.ranked0.map(({ code }) => code),
      ordering10: item.ranked10.map(({ code }) => code),
      eraDiagnostics: [...item.eras].sort((a, b) => a.rank0 - b.rank0).map(publicEraView),
      relevantEraHiddenDimensions: Object.fromEntries(
        [...relevantCodes].map((code) => [code, item.eras.find((era) => era.code === code)?.hiddenDimensions]),
      ),
    };
  });

  const eraAggregates = ERAS.map(({ code, name }) => {
    const rows = calculations.map((item) => item.eras.find((era) => era.code === code)!);
    return {
      code,
      name,
      averageHiddenDistance: round(mean(rows.map(({ hiddenDistance }) => hiddenDistance))),
      averageHiddenAdvantage: round(mean(rows.map(({ hiddenAdvantage }) => hiddenAdvantage))),
      averageFinalDistanceShift: round(mean(rows.map(({ finalDistanceShift }) => finalDistanceShift))),
      rankGains: rows.filter(({ rankMovement }) => rankMovement > 0).length,
      rankLosses: rows.filter(({ rankMovement }) => rankMovement < 0).length,
      rankUnchanged: rows.filter(({ rankMovement }) => rankMovement === 0).length,
      meanRankMovement: round(mean(rows.map(({ rankMovement }) => rankMovement))),
      averageDimensionPenalty: Object.fromEntries(HIDDEN_ERA_CODES.map((dimension) => [
        dimension,
        round(mean(rows.map(({ hiddenDimensions }) => hiddenDimensions[dimension].weightedSquaredContribution))),
      ])),
    };
  });

  const focalDiagnostics = ["1989", "MIDNIGHTS"].map((code) => {
    const focal = eraAggregates.find((era) => era.code === code)!;
    const others = eraAggregates.filter((era) => era.code !== code);
    const dimensionAdvantages = HIDDEN_ERA_CODES.map((dimension) => ({
      dimension,
      focalAveragePenalty: focal.averageDimensionPenalty[dimension],
      otherErasAveragePenalty: round(mean(others.map(({ averageDimensionPenalty }) => averageDimensionPenalty[dimension]))),
      penaltyAdvantageVsOtherEras: round(mean(others.map(({ averageDimensionPenalty }) => averageDimensionPenalty[dimension])) - focal.averageDimensionPenalty[dimension]),
    })).sort((a, b) => b.penaltyAdvantageVsOtherEras - a.penaltyAdvantageVsOtherEras);
    return {
      code,
      averageHiddenAdvantage: focal.averageHiddenAdvantage,
      hiddenAdvantageRankAmongEras: [...eraAggregates].sort((a, b) => b.averageHiddenAdvantage - a.averageHiddenAdvantage).findIndex((era) => era.code === code) + 1,
      averageHiddenAdvantageOtherEras: round(mean(others.map(({ averageHiddenAdvantage }) => averageHiddenAdvantage))),
      advantageDifferenceVsOtherEras: round(focal.averageHiddenAdvantage - mean(others.map(({ averageHiddenAdvantage }) => averageHiddenAdvantage))),
      dimensionAdvantages,
    };
  });

  const hiddenScoreDistribution = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => {
    const values = calculations.map(({ scores }) => scores.hidden[code].score);
    return [code, { mean: round(mean(values)), min: Math.min(...values), max: Math.max(...values) }];
  }));

  const report = {
    methodology: {
      personas: calculations.length,
      questionsPerPersona: PILOT_QUESTION_COUNT,
      controlHiddenContribution: 0,
      experimentalHiddenContribution: PILOT_HIDDEN_WEIGHT,
      distanceDirection: "Lower is a better match.",
      hiddenAdvantageDefinition: "publicDistance - hiddenDistance; positive values pull an Era closer at 10%.",
      rankMovementDefinition: "rank0 - rank10; positive values are rank gains.",
      reconstructionVerifiedAgainstRealPilotCalculator: true,
    },
    cases,
    aggregate: {
      hiddenScoreDistribution,
      eras: eraAggregates,
      focalEraDiagnostics: focalDiagnostics,
    },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to generate hidden-layer diagnostics.");
  process.exitCode = 1;
});
