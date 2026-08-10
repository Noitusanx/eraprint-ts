import { PUBLIC_TRAITS } from "@/lib/data/public-catalog";
import type { PublicEraMatchResult } from "./types";

export function matchTraitName(code: string): string {
  return PUBLIC_TRAITS.find((trait) => trait.code === code)?.name ?? code;
}

export function buildEraMatchSummary(result: PublicEraMatchResult): string {
  const first = matchTraitName(result.mostInSync[0].code).toLowerCase();
  const contrast = matchTraitName(result.biggestContrast.code).toLowerCase();

  if (result.matchScore >= 85) {
    return `You have a lot in common, especially in ${first}. Your biggest difference is ${contrast}.`;
  }

  if (result.matchScore >= 70) {
    return `You share some strong similarities, especially in ${first}. You differ most in ${contrast}.`;
  }

  if (result.matchScore >= 50) {
    return `You have some things in common, especially in ${first}. Your clearest difference is ${contrast}.`;
  }

  return `Your EraPrints are quite different. You are closest in ${first}, and furthest apart in ${contrast}.`;
}
