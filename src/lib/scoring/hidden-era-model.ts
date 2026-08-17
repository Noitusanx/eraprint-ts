import type { HiddenEraCode } from "./types";

export const HIDDEN_ERA_WEIGHT = 0.1;

export const HIDDEN_ERA_DIMENSIONS = [
  { code: "NAR", name: "Narrative Distance", low: "direct and personally immediate", high: "fictional and narratively distanced" },
  { code: "PRO", name: "Emotional Processing", low: "analytical and ruminative", high: "expressive and cathartic" },
  { code: "STG", name: "Emotional Stage", low: "active and unresolved", high: "aftermath and resolution" },
  { code: "PRF", name: "Performance Orientation", low: "private and intimate", high: "public and performative" },
] as const;

export const ERA_HIDDEN_PROFILES: Record<string, Record<HiddenEraCode, number>> = {
  DEBUT: { NAR: 25, PRO: 65, STG: 35, PRF: 45 },
  FEARLESS: { NAR: 45, PRO: 70, STG: 45, PRF: 60 },
  SPEAK_NOW: { NAR: 25, PRO: 90, STG: 35, PRF: 70 },
  RED: { NAR: 10, PRO: 75, STG: 15, PRF: 60 },
  "1989": { NAR: 25, PRO: 60, STG: 70, PRF: 85 },
  REPUTATION: { NAR: 20, PRO: 70, STG: 45, PRF: 80 },
  LOVER: { NAR: 25, PRO: 70, STG: 75, PRF: 55 },
  FOLKLORE: { NAR: 95, PRO: 45, STG: 65, PRF: 20 },
  EVERMORE: { NAR: 85, PRO: 55, STG: 90, PRF: 20 },
  MIDNIGHTS: { NAR: 20, PRO: 15, STG: 50, PRF: 35 },
  TTPD: { NAR: 10, PRO: 95, STG: 25, PRF: 70 },
  SHOWGIRL: { NAR: 25, PRO: 80, STG: 80, PRF: 100 },
};

// Kept separate from the public catalog so browser bundles never receive scoring weights.
export const HIDDEN_CHOICE_EFFECTS: Record<string, Partial<Record<HiddenEraCode, number>>> = {
  Q01_A: { NAR: -1, PRO: 2, STG: -1 }, Q01_B: { PRO: -1 }, Q01_C: { NAR: -1, PRO: -2 }, Q01_D: { NAR: -1, PRF: 1 },
  Q02_A: { NAR: -2, PRO: -1, STG: -2 }, Q02_B: { STG: 2 }, Q02_C: { PRO: -1, PRF: -1 }, Q02_D: { NAR: 2 },
  Q03_A: { PRF: -2 }, Q03_B: { PRF: -1 }, Q03_C: { PRF: 1 }, Q03_D: { PRF: 2 },
  Q04_A: { PRO: 2, STG: -2 }, Q04_B: { PRO: -2 }, Q04_C: { STG: 2 }, Q04_D: { STG: 1 },
  Q06_A: { STG: -1 }, Q06_B: { STG: 2 },
  Q08_A: { PRO: 2, STG: -1 }, Q08_B: { PRO: -2 },
  Q09_A: {}, Q09_B: {}, Q09_C: {}, Q09_D: { STG: -1 },
  Q10_A: { PRO: 2, PRF: 1 }, Q10_B: { PRO: -1 }, Q10_C: { PRO: -2, STG: -1 }, Q10_D: {},
  Q11_A: { STG: 1 }, Q11_B: { STG: 2 }, Q11_C: { NAR: 2 }, Q11_D: { NAR: -2 },
  Q12_A: { NAR: -1, STG: -1 }, Q12_B: { NAR: -1, STG: 1 }, Q12_C: { STG: 2 }, Q12_D: { NAR: 2, PRO: 2 },
  Q15_A: { STG: -1 }, Q15_B: { STG: 2 }, Q15_C: {}, Q15_D: {},
  Q16_A: { STG: -1 }, Q16_B: { STG: 2 }, Q16_C: { PRO: -2 }, Q16_D: { STG: 1 },
  Q17_A: { PRF: -2 }, Q17_B: { PRF: -1 }, Q17_C: { PRF: 2 },
  Q18_A: { PRF: -2 }, Q18_B: { PRF: 1 }, Q18_C: { PRF: 2 }, Q18_D: { PRF: -1 },
  Q19_A: { NAR: -2 }, Q19_B: { NAR: 2 },
  Q20_A: { PRO: 2, STG: -1 }, Q20_B: { PRO: -2 }, Q20_C: { STG: -1 }, Q20_D: { STG: 2 },
  Q21_A: { NAR: -2, PRO: -1, STG: -2 }, Q21_B: { STG: 2 }, Q21_C: { NAR: -1, PRO: 2, STG: -2 }, Q21_D: { PRO: -1 },
  Q22_A: { STG: 2 }, Q22_B: { STG: -2 },
  Q23_A: { NAR: -2 }, Q23_B: { NAR: 2 },
  Q24_A: { STG: -1 }, Q24_B: { STG: 2 },
  Q26_A: { STG: -1 }, Q26_B: { PRO: 1, STG: -1 }, Q26_C: { PRO: -1 },
  Q27_A: { PRF: -2 }, Q27_B: { PRF: 2 }, Q27_C: { PRO: 2, STG: -2 }, Q27_D: { PRF: -2 },
  Q28_A: { STG: 1 }, Q28_B: { NAR: -1, PRO: -2, STG: -1 }, Q28_C: { NAR: -2, PRO: 2 }, Q28_D: { NAR: 2, PRO: 2 },
  Q29_A: { PRF: -2 }, Q29_B: { PRF: -1 }, Q29_C: { PRF: 2 }, Q29_D: { PRO: -1 },
  Q30_A: {}, Q30_B: { PRO: -2 }, Q30_C: { PRO: 2, STG: -1 }, Q30_D: {},
};
