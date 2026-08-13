import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateEraMatch } from "../src/lib/match/era-match";
import { buildEraDynamic } from "../src/lib/match/era-dynamic";
import { buildEraMatchSummary } from "../src/lib/match/era-match-copy";
import { EraDynamicSection } from "../src/components/era-dynamic-section";
import type { MatchProfile, PublicEraMatchResult, PublicMatchProfile } from "../src/lib/match/types";
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

function namedPrimary(source: MatchProfile, code: string, name: string): MatchProfile {
  const primaryEra = { ...source.primaryEra, code, name };
  return { ...source, primaryEra };
}

function publicProfile(source: MatchProfile): PublicMatchProfile {
  return {
    archetype: source.archetype,
    primaryEra: source.primaryEra,
    secondaryEra: source.secondaryEra,
    hiddenEra: source.hiddenEra,
    eraBlend: source.eraBlend,
    traitScores: Object.fromEntries(
      TRAIT_CODES.map((code) => [code, source.traitScores[code].score]),
    ) as Record<TraitCode, number>,
  };
}

function publicMatch(a: MatchProfile, b: MatchProfile): PublicEraMatchResult {
  return {
    ...calculateEraMatch(a, b),
    matchId: "10000000-0000-4000-8000-000000000001",
    snapshotAId: "10000000-0000-4000-8000-000000000002",
    snapshotBId: "10000000-0000-4000-8000-000000000003",
    profileA: publicProfile(a),
    profileB: publicProfile(b),
    createdAt: "2026-08-11T00:00:00.000Z",
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

  it("keeps the hero summary general instead of repeating key trait findings", () => {
    const result = publicMatch(profile({ SOC: 82 }), profile({ SOC: 80, NOS: 20 }));
    const summary = buildEraMatchSummary(result);

    expect(summary).not.toContain("Social Energy");
    expect(summary).not.toContain("Nostalgia");
    expect(summary).not.toContain("closest");
    expect(summary).not.toContain("furthest");
  });

  it("builds deterministic Era Dynamic evidence from persisted match profiles", () => {
    const a = namedPrimary(profile({ REF: 82, AUT: 84 }), "SPEAK_NOW", "Speak Now");
    const b = namedPrimary(profile({ REF: 80, AUT: 24 }), "MIDNIGHTS", "Midnights");
    const result = publicMatch(a, b);

    expect(buildEraDynamic(result)).toEqual(buildEraDynamic(result));
    expect(buildEraDynamic(result).shared.code).toBe("REF");
    expect(buildEraDynamic(result).contrast.code).toBe("AUT");
    expect(buildEraDynamic(result)).toMatchObject({ eraA: "Speak Now", eraB: "Midnights" });
  });

  it("can describe the same Era pair differently when persisted traits differ", () => {
    const first = publicMatch(
      namedPrimary(profile({ REF: 82, AUT: 84 }), "SPEAK_NOW", "Speak Now"),
      namedPrimary(profile({ REF: 80, AUT: 24 }), "MIDNIGHTS", "Midnights"),
    );
    const second = publicMatch(
      namedPrimary(profile({ ESC: 84, SOC: 20 }), "SPEAK_NOW", "Speak Now"),
      namedPrimary(profile({ ESC: 82, SOC: 88 }), "MIDNIGHTS", "Midnights"),
    );

    expect(buildEraDynamic(first).shared.code).not.toBe(buildEraDynamic(second).shared.code);
    expect(buildEraDynamic(first).contrast.code).not.toBe(buildEraDynamic(second).contrast.code);
    expect(buildEraDynamic(first).sharedCopy).not.toBe(buildEraDynamic(second).sharedCopy);
  });

  it("renders Era Dynamic inside EraMatch and safely preserves long visible Era names", () => {
    const result = publicMatch(
      namedPrimary(profile({ REF: 80 }), "TTPD", "The Tortured Poets Department"),
      namedPrimary(profile({ REF: 78 }), "SHOWGIRL", "The Life of a Showgirl"),
    );
    const html = renderToStaticMarkup(createElement(EraDynamicSection, { result }));

    expect(html).toContain("YOUR ERA DYNAMIC");
    expect(html).toContain("The Tortured Poets Department");
    expect(html).toContain("The Life of a Showgirl");
    expect(html).toContain("Shared:");
    expect(html).toContain("Contrast:");
    expect(html).not.toContain("era-dynamic-direction");
  });

  it("takes narrative direction from persisted trait scores rather than Era names", () => {
    const speakNowHigher = publicMatch(
      namedPrimary(profile({ ROM: 71 }), "SPEAK_NOW", "Speak Now"),
      namedPrimary(profile({ ROM: 44 }), "MIDNIGHTS", "Midnights"),
    );
    const midnightsHigher = publicMatch(
      namedPrimary(profile({ ROM: 44 }), "SPEAK_NOW", "Speak Now"),
      namedPrimary(profile({ ROM: 71 }), "MIDNIGHTS", "Midnights"),
    );

    expect(buildEraDynamic(speakNowHigher).contrastCopy).toContain(
      "the Speak Now side is more likely to idealize things and go all-in",
    );
    expect(buildEraDynamic(midnightsHigher).contrastCopy).toContain(
      "the Midnights side is more likely to idealize things and go all-in",
    );
  });

  it("stays attached to the snapshots persisted on the match", () => {
    const persisted = publicMatch(
      namedPrimary(profile({ REF: 80 }), "SPEAK_NOW", "Speak Now"),
      namedPrimary(profile({ REF: 78 }), "MIDNIGHTS", "Midnights"),
    );
    const newerRefinedProfile = namedPrimary(profile({ SOC: 95 }), "LOVER", "Lover");

    expect(newerRefinedProfile.primaryEra.name).toBe("Lover");
    expect(buildEraDynamic(persisted)).toMatchObject({ eraA: "Speak Now", eraB: "Midnights" });
    expect(persisted.snapshotAId).toBe("10000000-0000-4000-8000-000000000002");
  });

  it("does not introduce dating-language copy", () => {
    const dynamic = buildEraDynamic(publicMatch(profile({ REF: 80 }), profile({ REF: 75 })));
    const copy = `${dynamic.sharedCopy} ${dynamic.contrastCopy}`.toLowerCase();
    for (const phrase of ["soulmate", "chemistry", "dating", "perfect match", "romantic match", "relationship compatibility"]) {
      expect(copy).not.toContain(phrase);
    }
  });
});
