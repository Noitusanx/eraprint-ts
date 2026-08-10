import { TRAIT_CODES } from "../scoring/types";
import type { EraBlendItem } from "../scoring/types";
import {
  MATCH_VERSION,
  type EraMatchCalculation,
  type MatchProfile,
  type MatchTraitInsight,
  type SharedEraInsight,
} from "./types";

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

function eraMap(blend: EraBlendItem[]): Map<string, EraBlendItem> {
  return new Map(blend.map((era) => [era.code, era]));
}

export function calculateEraMatch(
  profileA: MatchProfile,
  profileB: MatchProfile,
): EraMatchCalculation {
  const traitInsights = TRAIT_CODES.map((code, index) => {
    const scoreA = profileA.traitScores[code].score;
    const scoreB = profileB.traitScores[code].score;
    const difference = Math.abs(scoreA - scoreB);

    return {
      code,
      scoreA,
      scoreB,
      difference: round2(difference),
      similarity: round2(clamp(100 - difference)),
      index,
    };
  });

  const squaredDifferences = traitInsights.map(
    ({ scoreA, scoreB }) => ((scoreA - scoreB) / 100) ** 2,
  );
  const traitDistance = Math.sqrt(
    squaredDifferences.reduce((sum, value) => sum + value, 0) /
      squaredDifferences.length,
  );
  const traitSimilarity = round2(clamp(100 * (1 - traitDistance)));

  const blendA = eraMap(profileA.eraBlend);
  const blendB = eraMap(profileB.eraBlend);
  const eraCodes = [...new Set([...blendA.keys(), ...blendB.keys()])].sort();

  const sharedEras: Array<SharedEraInsight & { index: number }> = eraCodes.map(
    (code, index) => {
      const eraA = blendA.get(code);
      const eraB = blendB.get(code);
      const percentageA = eraA?.percentage ?? 0;
      const percentageB = eraB?.percentage ?? 0;

      return {
        code,
        name: eraA?.name ?? eraB?.name ?? code,
        strength: round2(Math.min(percentageA, percentageB)),
        percentageA,
        percentageB,
        index,
      };
    },
  );

  const eraSimilarity = round2(
    clamp(sharedEras.reduce((sum, era) => sum + era.strength, 0)),
  );
  const matchScore = round2(
    clamp(0.7 * traitSimilarity + 0.3 * eraSimilarity),
  );

  const bySimilarity = [...traitInsights].sort(
    (a, b) => b.similarity - a.similarity || a.index - b.index,
  );
  const byContrast = [...traitInsights].sort(
    (a, b) => b.difference - a.difference || a.index - b.index,
  );
  const sharedEra = [...sharedEras].sort(
    (a, b) => b.strength - a.strength || a.index - b.index,
  )[0];

  if (!sharedEra || bySimilarity.length < 2 || !byContrast[0]) {
    throw new Error("MATCH_V1 requires eight traits and an Era Blend.");
  }

  const cleanTrait = (insight: typeof bySimilarity[number]): MatchTraitInsight => ({
    code: insight.code,
    similarity: insight.similarity,
    difference: insight.difference,
    scoreA: insight.scoreA,
    scoreB: insight.scoreB,
  });
  const cleanSharedEra: SharedEraInsight = {
    code: sharedEra.code,
    name: sharedEra.name,
    strength: sharedEra.strength,
    percentageA: sharedEra.percentageA,
    percentageB: sharedEra.percentageB,
  };

  return {
    traitSimilarity,
    eraSimilarity,
    matchScore,
    matchVersion: MATCH_VERSION,
    mostInSync: [cleanTrait(bySimilarity[0]), cleanTrait(bySimilarity[1])],
    biggestContrast: cleanTrait(byContrast[0]),
    sharedEra: cleanSharedEra,
  };
}
