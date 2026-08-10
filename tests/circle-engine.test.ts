import { describe, expect, it } from "vitest";
import { calculateCircle, CANONICAL_ERA_ORDER, validateCircleMembers } from "../src/lib/circle/circle-engine";
import type { CircleMemberInput } from "../src/lib/circle/types";
import { TRAIT_CODES, type TraitCode } from "../src/lib/scoring/types";

function member(
  id: number,
  traits: Partial<Record<TraitCode, number>> = {},
  eras: Partial<Record<string, number>> = {},
): CircleMemberInput {
  const hasCustomEras = Object.keys(eras).length > 0;
  const eraBlend = CANONICAL_ERA_ORDER.map((code) => ({
    code,
    name: code,
    percentage: eras[code] ?? (!hasCustomEras && code === "DEBUT" ? 100 : 0),
    distance: 0,
  }));
  return {
    snapshotId: `snapshot-${id}`,
    scoringVersion: "v1",
    archetype: `Profile ${id}`,
    primaryEra: eraBlend[0],
    secondaryEra: eraBlend[1],
    hiddenEra: eraBlend[2],
    traitScores: Object.fromEntries(TRAIT_CODES.map((code) => [code, traits[code] ?? 50])) as Record<TraitCode, number>,
    eraBlend,
  };
}

describe("CIRCLE_V1", () => {
  it("keeps identical values for three identical members", () => {
    const result = calculateCircle([member(1, { NOS: 72 }), member(2, { NOS: 72 }), member(3, { NOS: 72 })]);
    expect(result.traits.find((trait) => trait.code === "NOS")?.score).toBe(72);
    expect(result.mostUnitedTrait.standardDeviation).toBe(0);
  });

  it("accepts ten valid members", () => {
    expect(() => calculateCircle(Array.from({ length: 10 }, (_, index) => member(index)))).not.toThrow();
  });

  it("calculates arithmetic trait averages", () => {
    const result = calculateCircle([member(1, { NOS: 70 }), member(2, { NOS: 80 }), member(3, { NOS: 66 })]);
    expect(result.traits.find((trait) => trait.code === "NOS")?.score).toBe(72);
  });

  it("averages persisted Era Blend percentages", () => {
    const result = calculateCircle([member(1, {}, { DEBUT: 60, RED: 40 }), member(2, {}, { DEBUT: 30, RED: 70 }), member(3, {}, { DEBUT: 0, RED: 100 })]);
    expect(result.eraBlend.find((era) => era.code === "DEBUT")?.percentage).toBe(30);
    expect(result.eraBlend.find((era) => era.code === "RED")?.percentage).toBe(70);
  });

  it("keeps the averaged Era Blend near 100", () => {
    const result = calculateCircle([member(1, {}, { DEBUT: 60, RED: 40 }), member(2, {}, { DEBUT: 30, RED: 70 }), member(3, {}, { DEBUT: 20, RED: 80 })]);
    expect(result.eraBlend.reduce((sum, era) => sum + era.percentage, 0)).toBeCloseTo(100, 8);
  });

  it("selects primary, secondary, and hidden Eras by average", () => {
    const members = [1, 2, 3].map((id) => member(id, {}, { RED: 40, TTPD: 35, FOLKLORE: 25 }));
    const result = calculateCircle(members);
    expect([result.primaryEra.code, result.secondaryEra.code, result.hiddenEra.code]).toEqual(["RED", "TTPD", "FOLKLORE"]);
  });

  it("uses canonical Era and trait order for ties", () => {
    const result = calculateCircle([member(1, { ROM: 60, EMO: 60 }, { DEBUT: 50, FEARLESS: 50 }), member(2, { ROM: 60, EMO: 60 }, { DEBUT: 50, FEARLESS: 50 }), member(3, { ROM: 60, EMO: 60 }, { DEBUT: 50, FEARLESS: 50 })]);
    expect(result.primaryEra.code).toBe("DEBUT");
    expect(result.strongestSignals[0].code).toBe("ROM");
  });

  it("chooses strongest signals by distance from 50", () => {
    const members = [1, 2, 3].map((id) => member(id, { ROM: 20, EMO: 75, NOS: 60 }));
    expect(calculateCircle(members).strongestSignals.map((trait) => trait.code)).toEqual(["ROM", "EMO", "NOS"]);
  });

  it("selects smallest population deviation as Most United", () => {
    const result = calculateCircle([member(1, { ROM: 50, EMO: 10 }), member(2, { ROM: 51, EMO: 50 }), member(3, { ROM: 49, EMO: 90 })]);
    expect(result.mostUnitedTrait.code).toBe("NOS");
  });

  it("selects largest population deviation as Most Different", () => {
    const result = calculateCircle([member(1, { EMO: 10 }), member(2, { EMO: 50 }), member(3, { EMO: 90 })]);
    expect(result.mostDifferentTrait.code).toBe("EMO");
  });

  it("gives identical members zero deviation on every trait", () => {
    expect(calculateCircle([member(1), member(2), member(3)]).traits.every((trait) => trait.standardDeviation === 0)).toBe(true);
  });

  it("is deterministic", () => {
    const members = [member(1, { ROM: 20 }), member(2, { ROM: 40 }), member(3, { ROM: 60 })];
    expect(calculateCircle(members)).toEqual(calculateCircle(members));
  });

  it("rejects one or two members and accepts three", () => {
    expect(validateCircleMembers([member(1)])).not.toEqual([]);
    expect(validateCircleMembers([member(1), member(2)])).not.toEqual([]);
    expect(validateCircleMembers([member(1), member(2), member(3)])).toEqual([]);
  });

  it("rejects more than ten members and duplicate snapshots", () => {
    expect(validateCircleMembers(Array.from({ length: 11 }, (_, index) => member(index)))).not.toEqual([]);
    expect(validateCircleMembers([member(1), member(1), member(2)])).toContain("A snapshot cannot appear twice in one Circle.");
  });
});
