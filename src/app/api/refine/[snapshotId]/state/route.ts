import { NextResponse } from "next/server";
import { CATALOG_VERSION, QUESTIONS, SCORING_VERSION } from "@/lib/data/catalog";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { refinementErrorResponse } from "@/lib/living/refinement-errors";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function GET(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    const compatible =
      owned.snapshot.catalog_version === CATALOG_VERSION &&
      owned.snapshot.scoring_version === SCORING_VERSION;
    const remainingCount = QUESTIONS.length - new Set(owned.answers.map((a) => a.questionId)).size;

    const activeResponse = await supabase.from("game_sessions")
      .select("id")
      .eq("profile_id", owned.user.id)
      .eq("base_snapshot_id", snapshotId)
      .eq("session_type", "DEEPEN_PROFILE")
      .eq("status", "IN_PROGRESS")
      .maybeSingle();
    if (activeResponse.error) throw activeResponse.error;

    let activeAnswerCount = 0;
    if (activeResponse.data) {
      const activeAnswersResponse = await supabase.from("answers")
        .select("id", { count: "exact", head: true })
        .eq("session_id", activeResponse.data.id)
        .eq("profile_id", owned.user.id);
      if (activeAnswersResponse.error) throw activeAnswersResponse.error;
      activeAnswerCount = activeAnswersResponse.count ?? 0;
    }

    let previous = null;
    if (owned.snapshot.previous_snapshot_id) {
      const [snapshotResponse, traitsResponse] = await Promise.all([
        supabase.from("eraprint_snapshots")
          .select("id,primary_era_code,secondary_era_code,hidden_era_code,clarity")
          .eq("id", owned.snapshot.previous_snapshot_id).maybeSingle(),
        supabase.from("eraprint_trait_scores")
          .select("trait_code,score").eq("snapshot_id", owned.snapshot.previous_snapshot_id),
      ]);
      if (snapshotResponse.error) throw snapshotResponse.error;
      if (traitsResponse.error) throw traitsResponse.error;
      previous = snapshotResponse.data ? {
        ...snapshotResponse.data,
        traits: traitsResponse.data ?? [],
      } : null;
    }

    return NextResponse.json({
      owned: true,
      isLatest: owned.isLatest,
      latestSnapshotId: owned.latestSnapshotId,
      answerCount: owned.answers.length,
      remainingCount,
      compatible,
      canRefine: compatible && owned.isLatest && remainingCount > 0,
      activeRefinement: activeResponse.data ? {
        sessionId: activeResponse.data.id,
        answeredCount: owned.answers.length + activeAnswerCount,
        remainingCount: Math.max(0, remainingCount - activeAnswerCount),
      } : null,
      previous,
    });
  } catch (error) {
    return refinementErrorResponse(error, "Unable to load refinement state.");
  }
}
