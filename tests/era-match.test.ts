import { describe, expect, it } from "vitest";
import { calculateEraMatch } from "../src/lib/match/era-match";
import type { MatchProfile } from "../src/lib/match/types";
import { TRAIT_CODES, type TraitCode, type TraitScore } from "../src/lib/scoring/types";

const ERA_CODES = ["DEBUT", "FEARLESS", "SPEAK_NOW", "RED", "1989", "REPUTATION", "LOVER", "FOLKLORE", "EVERMORE", "MIDNIGHTS", "TTPD", "SHOWGIRL"];

function profile(
  traits: Partial<Record<TraitCode, number>> = {},
  percentages: Partial<Record<string, number>> = { DEBUT: 100 },
): MatchProfile {
  const traitScores = Object.fromEntries(TRAIT_CODES.map((code) => [code, {
    code,
    score: traits[code] ?? 50,
    evidenceCount: 1,
    totalEffect: 0,
    reliability: 0.5,
  }])) as Record<TraitCode, TraitScore>;
  const eraBlend = ERA_CODES.map((code) => ({
    code,
    name: code === "SPEAK_NOW" ? "Speak Now" : code,
    percentage: percentages[code] ?? 0,
    distance: 0,
  }));

  return {
    traitScores,
    eraBlend,
    primaryEra: eraBlend[0],
    secondaryEra: eraBlend[1],
    hiddenEra: eraBlend[2],
    archetype: "Test Profile",
  };
}

describe("MATCH_V1", () => {
  it("gives identical trait vectors 100 trait similarity", () => {
    expect(calculateEraMatch(profile(), profile()).traitSimilarity).toBe(100);
  });

  it("gives maximally opposite trait vectors zero trait similarity", () => {
    const low = profile(Object.fromEntries(TRAIT_CODES.map((code) => [code, 0])));
    const high = profile(Object.fromEntries(TRAIT_CODES.map((code) => [code, 100])));
    expect(calculateEraMatch(low, high).traitSimilarity).toBe(0);
  });

  it("gives identical Era Blends 100 era similarity", () => {
    expect(calculateEraMatch(profile(), profile()).eraSimilarity).toBe(100);
  });

  it("gives non-overlapping Era Blends zero era similarity", () => {
    expect(calculateEraMatch(profile({}, { DEBUT: 100 }), profile({}, { RED: 100 })).eraSimilarity).toBe(0);
  });

  it("weights traits at 70% and Era Blend at 30%", () => {
    const result = calculateEraMatch(profile({}, { DEBUT: 100 }), profile({}, { RED: 100 }));
    expect(result.traitSimilarity).toBe(100);
    expect(result.eraSimilarity).toBe(0);
    expect(result.matchScore).toBe(70);
  });

  it("always clamps scores to 0..100", () => {
    const result = calculateEraMatch(profile({ ROM: -50 }), profile({ ROM: 150 }));
    for (const score of [result.traitSimilarity, result.eraSimilarity, result.matchScore]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic for the same inputs", () => {
    const a = profile({ ROM: 20, SOC: 80 }, { DEBUT: 60, RED: 40 });
    const b = profile({ ROM: 25, SOC: 30 }, { DEBUT: 20, RED: 80 });
    expect(calculateEraMatch(a, b)).toEqual(calculateEraMatch(a, b));
  });

  it("selects the two strongest shared traits", () => {
    const result = calculateEraMatch(profile(), profile({ ROM: 1, EMO: 2, NOS: 20 }));
    expect(result.mostInSync.map((trait) => trait.code)).toEqual(["AUT", "REF"]);
  });

  it("selects the biggest contrast", () => {
    const result = calculateEraMatch(profile(), profile({ ROM: 10, SOC: 100 }));
    expect(result.biggestContrast.code).toBe("SOC");
  });

  it("selects the strongest shared Era", () => {
    const result = calculateEraMatch(
      profile({}, { DEBUT: 20, SPEAK_NOW: 80 }),
      profile({}, { DEBUT: 70, SPEAK_NOW: 30 }),
    );
    expect(result.sharedEra).toMatchObject({ code: "SPEAK_NOW", strength: 30 });
  });
});
