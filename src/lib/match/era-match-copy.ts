import { PUBLIC_TRAITS } from "../data/public-catalog";
import type { PublicEraMatchResult } from "./types";

export function matchTraitName(code: string): string {
  return PUBLIC_TRAITS.find((trait) => trait.code === code)?.name ?? "Signal";
}

export function buildEraMatchSummary(result: PublicEraMatchResult): string {
  if (result.matchScore >= 85) {
    return "Your EraPrints are very similar overall, with only a few differences.";
  }

  if (result.matchScore >= 70) {
    return "Your EraPrints are similar overall, with some clear differences.";
  }

  if (result.matchScore >= 50) {
    return "Your EraPrints share some patterns but also have clear differences.";
  }

  return "Your EraPrints are mostly different, with a few points of overlap.";
}
