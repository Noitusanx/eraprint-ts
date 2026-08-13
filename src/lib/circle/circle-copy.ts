import { matchTraitName } from "../match/era-match-copy";
import type { PublicCircleResult } from "./types";

export function buildCircleSummary(result: PublicCircleResult): string {
  const signal = matchTraitName(result.strongestSignals[0].code);
  const united = matchTraitName(result.mostUnitedTrait.code);

  if (result.strongestSignals[0].code === result.mostUnitedTrait.code) {
    return `${result.primaryEra.name} and ${result.secondaryEra.name} shape this Circle most. ${signal} stands out strongly and is also where your scores are closest.`;
  }

  return `${result.primaryEra.name} and ${result.secondaryEra.name} shape this Circle most. ${signal} is the signal that stands out strongest, while ${united} is where your scores are closest.`;
}
