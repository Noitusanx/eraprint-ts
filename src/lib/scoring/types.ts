export const TRAIT_CODES = ["ROM","EMO","NOS","AUT","REF","ESC","SOC","GRD"] as const;
export type TraitCode = (typeof TRAIT_CODES)[number];

export type QuestionType =
  | "SCENARIO"
  | "THIS_OR_THAT"
  | "VISUAL_PICK";

export interface TraitDefinition {
  code: TraitCode;
  name: string;
  lowLabel: string;
  highLabel: string;
}

export interface EraDefinition {
  code: string;
  name: string;
  profile: Record<TraitCode, number>;
}

export interface ChoiceDefinition {
  id: string;
  label: string;
  effects: Partial<Record<TraitCode, number>>;
  hint?: string;
}

export interface QuestionDefinition {
  id: string;
  type: QuestionType;
  category: string;
  prompt: string;
  choices: ChoiceDefinition[];
}

export interface Answer {
  questionId: string;
  choiceId: string;
}

export interface TraitScore {
  code: TraitCode;
  score: number;
  evidenceCount: number;
  totalEffect: number;
  reliability: number;
}

export interface EraBlendItem {
  code: string;
  name: string;
  percentage: number;
  distance: number;
}

export interface EraPrintResult {
  traitScores: Record<TraitCode, TraitScore>;
  eraBlend: EraBlendItem[];
  primaryEra: EraBlendItem;
  secondaryEra: EraBlendItem;
  hiddenEra: EraBlendItem;
  archetype: string;
  clarity: number;
  fingerprintCode: string;
  scoringVersion: string;
}
