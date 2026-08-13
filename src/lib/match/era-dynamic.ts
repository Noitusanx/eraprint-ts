import { PUBLIC_TRAITS } from "../data/public-catalog";
import { TRAIT_CODES, type TraitCode } from "../scoring/types";
import type { PublicEraMatchResult } from "./types";

type TraitLanguage = {
  topic: string;
  highShared: string;
  lowShared: string;
  higher: string;
  lower: string;
};

const TRAIT_LANGUAGE: Record<TraitCode, TraitLanguage> = {
  ROM: {
    topic: "romance",
    highShared:
      "You both tend to go all-in when you really care about someone.",
    lowShared:
      "You both tend to keep your expectations about romance pretty grounded.",
    higher: "is more likely to idealize things and go all-in",
    lower: "tends to be more cautious about romance",
  },

  EMO: {
    topic: "emotional intensity",
    highShared: "You both feel things pretty deeply.",
    lowShared: "You both tend to keep your emotions fairly steady.",
    higher: "feels things more intensely",
    lower: "tends to stay more emotionally steady",
  },

  NOS: {
    topic: "the past",
    highShared: "You both hold on to memories that mean something to you.",
    lowShared: "You both find it easier to leave the past where it is.",
    higher: "keeps coming back to old memories",
    lower: "lets go of the past more easily",
  },

  AUT: {
    topic: "speaking your mind",
    highShared: "You both tend to know what you want and say it.",
    lowShared: "You both tend to avoid pushing your point too hard.",
    higher: "is more direct about what they want",
    lower: "is more likely to meet people halfway",
  },

  REF: {
    topic: "how much you think things through",
    highShared: "You both spend a lot of time in your own heads.",
    lowShared: "You both tend to act first and figure things out as you go.",
    higher: "thinks things through for longer",
    lower: "is quicker to act instead of sitting with it",
  },

  ESC: {
    topic: "imagination",
    highShared: "You both spend plenty of time thinking about what could be.",
    lowShared:
      "You both tend to stay focused on what's actually in front of you.",
    higher: "gets pulled further into ideas and what-ifs",
    lower: "stays more focused on what's actually happening",
  },

  SOC: {
    topic: "social energy",
    highShared: "You both get a lot of energy from being around people.",
    lowShared: "You both seem more comfortable in quieter settings.",
    higher: "is more energized by being around people",
    lower: "needs more space and quiet to recharge",
  },

  GRD: {
    topic: "opening up",
    highShared: "You both take some time before really letting people in.",
    lowShared: "You both tend to open up pretty easily.",
    higher: "takes longer to let people in",
    lower: "opens up more easily",
  },
};

export type EraDynamic = {
  eraA: string;
  eraB: string;
  shared: { code: TraitCode; name: string };
  contrast: {
    code: TraitCode;
    name: string;
  };
  sharedCopy: string;
  contrastCopy: string;
};

function traitName(code: TraitCode) {
  return PUBLIC_TRAITS.find((trait) => trait.code === code)?.name ?? code;
}

export function buildEraDynamic(result: PublicEraMatchResult): EraDynamic {
  const traits = TRAIT_CODES.map((code, index) => {
    const scoreA = Number(result.profileA.traitScores[code]);
    const scoreB = Number(result.profileB.traitScores[code]);
    const difference = Math.abs(scoreA - scoreB);
    const similarity = 100 - difference;
    const expressedAlignment = Math.min(
      Math.abs(scoreA - 50),
      Math.abs(scoreB - 50),
    );
    return {
      code,
      scoreA,
      scoreB,
      difference,
      similarity,
      expressedAlignment,
      index,
    };
  });

  const shared = [...traits].sort(
    (a, b) =>
      b.similarity +
        b.expressedAlignment * 0.5 -
        (a.similarity + a.expressedAlignment * 0.5) || a.index - b.index,
  )[0];
  const contrast = [...traits].sort(
    (a, b) => b.difference - a.difference || a.index - b.index,
  )[0];

  const eraA = result.profileA.primaryEra.name;
  const eraB = result.profileB.primaryEra.name;
  const labelA = eraA === eraB ? "Profile A" : `the ${eraA} side`;
  const labelB = eraA === eraB ? "Profile B" : `the ${eraB} side`;
  const sharedLanguage = TRAIT_LANGUAGE[shared.code];
  const sharedCopy =
    (shared.scoreA + shared.scoreB) / 2 >= 50
      ? sharedLanguage.highShared
      : sharedLanguage.lowShared;

  const aIsHigher = contrast.scoreA >= contrast.scoreB;
  const higherLabel = aIsHigher ? labelA : labelB;
  const lowerLabel = aIsHigher ? labelB : labelA;
  const contrastLanguage = TRAIT_LANGUAGE[contrast.code];
  const contrastCopy =
    contrast.difference < 3
      ? `Even when it comes to ${contrastLanguage.topic}, there isn't much distance between you.`
      : `Where you differ is ${contrastLanguage.topic}: ${higherLabel} ${contrastLanguage.higher}, while ${lowerLabel} ${contrastLanguage.lower}.`;

  return {
    eraA,
    eraB,
    shared: { code: shared.code, name: traitName(shared.code) },
    contrast: {
      code: contrast.code,
      name: traitName(contrast.code),
    },
    sharedCopy,
    contrastCopy,
  };
}
