import type { EraBlendItem, EraPrintResult, TraitCode } from "../scoring/types";

export const MATCH_VERSION = "MATCH_V1" as const;

export type MatchProfile = Pick<
  EraPrintResult,
  | "traitScores"
  | "eraBlend"
  | "primaryEra"
  | "secondaryEra"
  | "hiddenEra"
  | "archetype"
>;

export interface MatchTraitInsight {
  code: TraitCode;
  similarity: number;
  difference: number;
  scoreA: number;
  scoreB: number;
}

export interface SharedEraInsight {
  code: string;
  name: string;
  strength: number;
  percentageA: number;
  percentageB: number;
}

export interface EraMatchCalculation {
  traitSimilarity: number;
  eraSimilarity: number;
  matchScore: number;
  matchVersion: typeof MATCH_VERSION;
  mostInSync: [MatchTraitInsight, MatchTraitInsight];
  biggestContrast: MatchTraitInsight;
  sharedEra: SharedEraInsight;
}

export interface PublicMatchProfile {
  archetype: string;
  primaryEra: EraBlendItem;
  secondaryEra: EraBlendItem;
  hiddenEra: EraBlendItem;
  traitScores: Record<TraitCode, number>;
  eraBlend: EraBlendItem[];
}

export interface PublicEraMatchResult extends EraMatchCalculation {
  matchId: string;
  snapshotAId?: string;
  snapshotBId?: string;
  profileA: PublicMatchProfile;
  profileB: PublicMatchProfile;
  createdAt: string;
}

export type PublicInviteState = {
  inviteId: string;
  status: "OPEN" | "COMPLETED" | "EXPIRED";
  expiresAt: string;
  matchId: string | null;
  owner: {
    archetype: string;
    primaryEra: { code: string; name: string };
    secondaryEra: { code: string; name: string };
  };
};
