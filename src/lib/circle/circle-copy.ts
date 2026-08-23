import { matchTraitName } from "../match/era-match-copy";
import type { PublicCircleResult } from "./types";

export function buildCircleSummary(result: PublicCircleResult): string {
  const signal = matchTraitName(result.strongestSignals[0].code);
  const united = matchTraitName(result.mostUnitedTrait.code);

  if (result.strongestSignals[0].code === result.mostUnitedTrait.code) {
    return `${result.primaryEra.name} and ${result.secondaryEra.name} lead this Circle. ${signal} is the clearest shared signal and where member scores are closest.`;
  }

  return `${result.primaryEra.name} and ${result.secondaryEra.name} lead this Circle. ${signal} stands out most, while member scores are closest on ${united}.`;
}
