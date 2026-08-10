import { createClient } from "@supabase/supabase-js";
import type { EraPrintResult, TraitCode, TraitScore } from "@/lib/scoring/types";

export async function fetchSnapshotAsResult(
  snapshotId: string,
): Promise<EraPrintResult | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  // Basic UUID validation before calling RPC
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(snapshotId)) return null;

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.rpc("get_public_eraprint_result", {
    p_snapshot_id: snapshotId,
  });

  if (error || !data) return null;

  type RPCTrait = {
    traitCode: TraitCode;
    score: number;
    evidenceCount: number;
    totalEffect: number;
    reliability: number;
  };

  type RPCEraBlend = {
    code: string;
    name: string;
    percentage: number;
    distance: number;
  };

  type RPCResult = {
    primaryEraCode: string;
    secondaryEraCode: string;
    hiddenEraCode: string;
    archetype: string;
    clarity: number;
    fingerprintCode: string;
    scoringVersion: string;
    traits: RPCTrait[];
    eraBlend: RPCEraBlend[];
  };

  const result = data as RPCResult;

  // Reconstruct EraPrintResult strictly from the fetched payload
  // without recalculating scores.

  const traitScores = {} as Record<TraitCode, TraitScore>;
  
  if (Array.isArray(result.traits)) {
    for (const t of result.traits) {
      traitScores[t.traitCode as TraitCode] = {
        code: t.traitCode,
        score: t.score,
        evidenceCount: t.evidenceCount,
        totalEffect: t.totalEffect,
        reliability: t.reliability,
      };
    }
  }

  // Find specific eras from eraBlend
  const eraBlend = Array.isArray(result.eraBlend) ? result.eraBlend : [];
  
  const primaryEra = eraBlend.find((e: RPCEraBlend) => e.code === result.primaryEraCode);
  const secondaryEra = eraBlend.find((e: RPCEraBlend) => e.code === result.secondaryEraCode);
  const hiddenEra = eraBlend.find((e: RPCEraBlend) => e.code === result.hiddenEraCode);

  if (!primaryEra || !secondaryEra || !hiddenEra) {
    return null; // Corrupted snapshot data
  }

  return {
    traitScores,
    eraBlend,
    primaryEra,
    secondaryEra,
    hiddenEra,
    archetype: result.archetype,
    clarity: result.clarity,
    fingerprintCode: result.fingerprintCode,
    scoringVersion: result.scoringVersion,
  };
}
