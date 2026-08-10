import type { EraBlendItem, TraitCode } from "../scoring/types";

export const CIRCLE_VERSION = "CIRCLE_V1" as const;
export const MIN_CIRCLE_MEMBERS = 3;
export const MAX_CIRCLE_MEMBERS = 10;

export interface CircleMemberInput {
  snapshotId: string;
  scoringVersion: string;
  archetype: string;
  primaryEra: EraBlendItem;
  secondaryEra: EraBlendItem;
  hiddenEra: EraBlendItem;
  traitScores: Record<TraitCode, number>;
  eraBlend: EraBlendItem[];
}

export interface CircleTraitResult {
  code: TraitCode;
  score: number;
  standardDeviation: number;
}

export interface CircleCalculation {
  circleVersion: typeof CIRCLE_VERSION;
  scoringVersion: string;
  memberCount: number;
  traits: CircleTraitResult[];
  eraBlend: EraBlendItem[];
  primaryEra: EraBlendItem;
  secondaryEra: EraBlendItem;
  hiddenEra: EraBlendItem;
  strongestSignals: [CircleTraitResult, CircleTraitResult, CircleTraitResult];
  mostUnitedTrait: CircleTraitResult;
  mostDifferentTrait: CircleTraitResult;
}

export interface PublicCircleMember {
  snapshotId?: string;
  archetype: string;
  primaryEra: EraBlendItem;
  secondaryEra: EraBlendItem;
  hiddenEra?: EraBlendItem;
}

export interface PublicCircleLobby {
  circleId: string;
  status: "OPEN" | "FINALIZED" | "EXPIRED";
  circleVersion: typeof CIRCLE_VERSION;
  expiresAt: string;
  memberCount: number;
  maxMembers: number;
  resultId: string | null;
  members: PublicCircleMember[];
}

export interface CircleParticipantState {
  isOwner: boolean;
  isMember: boolean;
  snapshotId: string | null;
}

export interface PublicCircleResult extends CircleCalculation {
  circleResultId: string;
  members: Array<Required<PublicCircleMember>>;
  createdAt: string;
}
