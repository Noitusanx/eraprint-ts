import { TRAIT_CODES, type EraBlendItem } from "../scoring/types";
import {
  CIRCLE_VERSION,
  MAX_CIRCLE_MEMBERS,
  MIN_CIRCLE_MEMBERS,
  type CircleCalculation,
  type CircleMemberInput,
  type CircleTraitResult,
} from "./types";

export const CANONICAL_ERA_ORDER = [
  "DEBUT", "FEARLESS", "SPEAK_NOW", "RED", "1989", "REPUTATION",
  "LOVER", "FOLKLORE", "EVERMORE", "MIDNIGHTS", "TTPD", "SHOWGIRL",
] as const;

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationStandardDeviation(values: number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

export function validateCircleMembers(members: CircleMemberInput[]): string[] {
  const errors: string[] = [];
  if (members.length < MIN_CIRCLE_MEMBERS) {
    errors.push(`Circle requires at least ${MIN_CIRCLE_MEMBERS} members.`);
  }
  if (members.length > MAX_CIRCLE_MEMBERS) {
    errors.push(`Circle cannot exceed ${MAX_CIRCLE_MEMBERS} members.`);
  }
  if (new Set(members.map((member) => member.snapshotId)).size !== members.length) {
    errors.push("A snapshot cannot appear twice in one Circle.");
  }
  if (new Set(members.map((member) => member.scoringVersion)).size > 1) {
    errors.push("All Circle members must use the same scoring version.");
  }
  for (const member of members) {
    if (TRAIT_CODES.some((code) => !Number.isFinite(member.traitScores[code]))) {
      errors.push("Every Circle member must contain all eight trait scores.");
      break;
    }
    if (CANONICAL_ERA_ORDER.some((code) => !member.eraBlend.some((era) => era.code === code))) {
      errors.push("Every Circle member must contain all twelve Era percentages.");
      break;
    }
  }
  return errors;
}

export function calculateCircle(members: CircleMemberInput[]): CircleCalculation {
  const errors = validateCircleMembers(members);
  if (errors.length > 0) throw new Error(errors[0]);

  const traits = TRAIT_CODES.map((code) => {
    const values = members.map((member) => member.traitScores[code]);
    return {
      code,
      score: mean(values),
      standardDeviation: populationStandardDeviation(values),
    };
  });

  const eraBlend = CANONICAL_ERA_ORDER.map((code, canonicalIndex) => {
    const memberEras = members.map((member) => member.eraBlend.find((era) => era.code === code)!);
    return {
      code,
      name: memberEras[0].name,
      percentage: mean(memberEras.map((era) => era.percentage)),
      distance: 0,
      canonicalIndex,
    };
  }).sort((a, b) => b.percentage - a.percentage || a.canonicalIndex - b.canonicalIndex);

  const cleanEra = (era: typeof eraBlend[number]): EraBlendItem => ({
    code: era.code,
    name: era.name,
    percentage: era.percentage,
    distance: era.distance,
  });
  const rankedEras = eraBlend.map(cleanEra);

  const indexedTraits = traits.map((trait, index) => ({ ...trait, index }));
  const strongest = [...indexedTraits].sort(
    (a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50) || a.index - b.index,
  );
  const united = [...indexedTraits].sort(
    (a, b) => a.standardDeviation - b.standardDeviation || a.index - b.index,
  )[0];
  const different = [...indexedTraits].sort(
    (a, b) => b.standardDeviation - a.standardDeviation || a.index - b.index,
  )[0];
  const cleanTrait = (trait: typeof indexedTraits[number]): CircleTraitResult => ({
    code: trait.code,
    score: trait.score,
    standardDeviation: trait.standardDeviation,
  });

  return {
    circleVersion: CIRCLE_VERSION,
    scoringVersion: members[0].scoringVersion,
    memberCount: members.length,
    traits,
    eraBlend: rankedEras,
    primaryEra: rankedEras[0],
    secondaryEra: rankedEras[1],
    hiddenEra: rankedEras[2],
    strongestSignals: [cleanTrait(strongest[0]), cleanTrait(strongest[1]), cleanTrait(strongest[2])],
    mostUnitedTrait: cleanTrait(united),
    mostDifferentTrait: cleanTrait(different),
  };
}
