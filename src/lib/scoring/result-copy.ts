import type { EraPrintResult, TraitCode } from "./types";
import { PUBLIC_TRAITS } from "../data/public-catalog";

const ERA_COPY: Record<string, string> = {
  DEBUT: "You notice the small things and usually mean what you say.",

  FEARLESS: "You tend to go for it first and figure out the rest as you go.",

  SPEAK_NOW:
    "You think things through, feel them fully, then say what you mean.",

  RED: "You do not experience memories quietly. They arrive in full color.",

  "1989":
    "When something stops fitting, you are not afraid to become someone new.",

  REPUTATION:
    "You do not let everyone in, but when you decide something, you mean it.",

  LOVER: "You care openly and do not see that as something to hide.",

  FOLKLORE:
    "You notice the details, read between the lines, and spend a lot of time in your own head.",

  EVERMORE:
    "You sit with things longer than most people and usually find more than one meaning in them.",

  MIDNIGHTS:
    "You can look calm while running an entire late-night investigation inside your head.",

  TTPD: "You feel things hard, think about them harder, and rarely leave a memory alone.",

  SHOWGIRL:
    "You like being seen, saying what you mean, and making the room feel a little more alive.",
};

export function buildResultSummary(result: EraPrintResult): string {
  return (
    ERA_COPY[result.primaryEra.code] ??
    "Your choices form a pattern that is distinctly yours."
  );
}

export function getDominantTraits(result: EraPrintResult, limit = 3) {
  return [...PUBLIC_TRAITS]
    .map((trait) => ({
      ...trait,
      score: result.traitScores[trait.code].score,
      distanceFromNeutral: Math.abs(result.traitScores[trait.code].score - 50),
    }))
    .sort((a, b) => b.distanceFromNeutral - a.distanceFromNeutral)
    .slice(0, limit);
}

export function traitDisplayDirection(code: TraitCode, score: number): string {
  const directions: Record<TraitCode, { low: string; high: string }> = {
    ROM: { low: "Leans more realistic about romance.", high: "Leans idealistic about romance." },
    EMO: { low: "Leans emotionally steady.", high: "Leans emotionally intense." },
    NOS: { low: "Leans future-focused.", high: "Leans nostalgic." },
    AUT: { low: "Leans more accommodating.", high: "Leans independent and self-directed." },
    REF: { low: "Leans action-first and outward-focused.", high: "Leans reflective and inward-looking." },
    ESC: { low: "Leans concrete and literal.", high: "Leans imaginative." },
    SOC: { low: "Leans private and low-key.", high: "Leans socially expressive." },
    GRD: { low: "Leans open and accessible.", high: "Leans private and protective." },
  };
  if (score >= 45 && score <= 55) {
    return "More balanced between the two.";
  }
  return score > 55 ? directions[code].high : directions[code].low;
}

export function buildClarityExplanation(result: EraPrintResult): string {
  const valueExplanation =
    result.clarity >= 70
      ? "your answers formed a clear profile, though a few signals are still closer to the middle."
      : result.clarity >= 50
        ? "your answers formed a fairly clear profile, while some signals are still closer to the middle."
        : "your profile is starting to take shape, but several signals are still close to the middle.";

  return `Clarity shows how clearly your answers came together to form your EraPrint. It is not an accuracy score. At ${Math.round(result.clarity)}%, ${valueExplanation}`;
}

export const ERA_BLEND_EXPLANATION =
  "Your eight signals make up your EraPrint. Each Era has its own mix of those signals. The closer that mix is to yours, the more strongly the Era appears in your Era Blend.";

const ERA_ALIGNMENT_TRAITS: Record<string, [TraitCode, TraitCode]> = {
  DEBUT: ["ROM", "SOC"],
  FEARLESS: ["ROM", "AUT"],
  SPEAK_NOW: ["AUT", "EMO"],
  RED: ["EMO", "NOS"],
  "1989": ["AUT", "SOC"],
  REPUTATION: ["GRD", "AUT"],
  LOVER: ["ROM", "SOC"],
  FOLKLORE: ["ESC", "REF"],
  EVERMORE: ["REF", "NOS"],
  MIDNIGHTS: ["REF", "EMO"],
  TTPD: ["EMO", "ESC"],
  SHOWGIRL: ["SOC", "AUT"],
};

export function buildTopEraAlignmentReasons(result: EraPrintResult) {
  return result.eraBlend.slice(0, 3).map((era) => {
    const codes = ERA_ALIGNMENT_TRAITS[era.code] ?? (["REF", "AUT"] as const);
    const signals = codes.map((code) => ({
      name: PUBLIC_TRAITS.find((item) => item.code === code)?.name ?? code,
      score: result.traitScores[code].score,
    }));

    return {
      era,
      reason: `Your ${signals[0].name} (${Math.round(signals[0].score)}) and ${signals[1].name} (${Math.round(signals[1].score)}) are two reasons ${era.name} appears in your top three.`,
    };
  });
}
