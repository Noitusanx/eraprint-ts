import { PUBLIC_TRAITS } from "../data/public-catalog";
import type { PublicEraMatchResult } from "./types";

export function matchTraitName(code: string): string {
  return PUBLIC_TRAITS.find((trait) => trait.code === code)?.name ?? code;
}

export function buildEraMatchSummary(result: PublicEraMatchResult): string {
  if (result.matchScore >= 85) {
    return "Your EraPrints share a very strong overall pattern, with only a few differences.";
  }

  if (result.matchScore >= 70) {
    return "You share a strong overall pattern, with a few meaningful differences.";
  }

  if (result.matchScore >= 50) {
    return "Your EraPrints share part of the same pattern, alongside some clear differences.";
  }

  return "Your EraPrints follow different overall patterns, with a few points of overlap.";
}
