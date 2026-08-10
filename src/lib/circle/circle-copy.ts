import { matchTraitName } from "../match/era-match-copy";
import type { PublicCircleResult } from "./types";

export function buildCircleSummary(result: PublicCircleResult): string {
  const signal = matchTraitName(result.strongestSignals[0].code).toLowerCase();
  const united = matchTraitName(result.mostUnitedTrait.code).toLowerCase();
  return `${result.primaryEra.name} and ${result.secondaryEra.name} lead this group, with ${signal} standing out most. The group is closest together on ${united}.`;
}
