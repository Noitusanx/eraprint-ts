import { NextResponse } from "next/server";
import { assertCurrentRefinementVersion, getOwnedSnapshotContext } from "@/lib/living/living-server";
import { buildRefinedEraPrint } from "@/lib/living/refinement-result";
import { RefinementError, refinementErrorResponse } from "@/lib/living/refinement-errors";
import { selectNextAdaptiveQuestion, validateLivingEraPrintAnswers } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const body = await request.json() as { sessionId?: string };
    if (!body.sessionId) throw new RefinementError("INVALID_SESSION", "A refinement session is required.", 400);

    const supabase = await getAuthenticatedSupabase(request);
    const userResponse = await supabase.auth.getUser();
    if (userResponse.error || !userResponse.data.user) {
      throw new RefinementError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    const sessionResponse = await supabase.from("game_sessions")
      .select("id,status,profile_id,base_snapshot_id")
      .eq("id", body.sessionId).eq("profile_id", userResponse.data.user.id).maybeSingle();
    if (sessionResponse.error) throw sessionResponse.error;
    const session = sessionResponse.data;
    if (!session || session.base_snapshot_id !== snapshotId) {
      throw new RefinementError("INVALID_SESSION", "Refinement session not found.", 404);
    }

    const existingSnapshot = await supabase.from("eraprint_snapshots")
      .select("id").eq("game_session_id", session.id).maybeSingle();
    if (existingSnapshot.error) throw existingSnapshot.error;
    if (existingSnapshot.data) {
      return NextResponse.json({ persisted: true, snapshotId: existingSnapshot.data.id });
    }
    if (session.status !== "IN_PROGRESS") {
      throw new RefinementError("INVALID_SESSION", "This refinement session cannot be completed.", 409);
    }

    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    assertCurrentRefinementVersion(owned.snapshot);
    if (!owned.isLatest) {
      throw new RefinementError("NOT_LATEST_SNAPSHOT", "Refinement must update your latest EraPrint.", 409);
    }

    const answersResponse = await supabase.from("answers")
      .select("question_id,choice_id,sequence_no").eq("session_id", session.id).order("sequence_no");
    if (answersResponse.error) throw answersResponse.error;
    const refinementAnswers: Answer[] = (answersResponse.data ?? []).map((answer) => ({
      questionId: answer.question_id,
      choiceId: answer.choice_id,
    }));
    const catalogExhausted = selectNextAdaptiveQuestion([...owned.answers, ...refinementAnswers]) === null;
    if (!catalogExhausted) {
      throw new RefinementError(
        "INVALID_SESSION",
        "This refinement still has unused choices available.",
        409,
      );
    }
    const errors = validateLivingEraPrintAnswers(owned.answers, refinementAnswers);
    if (errors.length) throw new RefinementError("INVALID_ANSWER", errors[0], 409);

    const { cumulativeAnswers, result } = buildRefinedEraPrint(owned.answers, refinementAnswers);
    const snapshotInsert = await supabase.from("eraprint_snapshots").insert({
      profile_id: owned.user.id,
      game_session_id: session.id,
      previous_snapshot_id: snapshotId,
      answer_count: cumulativeAnswers.length,
      catalog_version: owned.snapshot.catalog_version,
      scoring_version: result.scoringVersion,
      primary_era_code: result.primaryEra.code,
      secondary_era_code: result.secondaryEra.code,
      hidden_era_code: result.hiddenEra.code,
      archetype: result.archetype,
      clarity: result.clarity,
      fingerprint_code: result.fingerprintCode,
      era_blend: result.eraBlend,
    }).select("id").single();
    if (snapshotInsert.error) throw snapshotInsert.error;

    const newSnapshotId = snapshotInsert.data.id as string;
    const [traitsInsert, manifestInsert] = await Promise.all([
      supabase.from("eraprint_trait_scores").insert(
        Object.values(result.traitScores).map((trait) => ({
          snapshot_id: newSnapshotId,
          trait_code: trait.code,
          score: trait.score,
          evidence_count: trait.evidenceCount,
          total_effect: trait.totalEffect,
          reliability: trait.reliability,
        })),
      ),
      supabase.from("eraprint_snapshot_answers").insert(
        cumulativeAnswers.map((answer, index) => ({
          snapshot_id: newSnapshotId,
          question_id: answer.questionId,
          choice_id: answer.choiceId,
          sequence_no: index + 1,
        })),
      ),
    ]);
    if (traitsInsert.error) throw traitsInsert.error;
    if (manifestInsert.error) throw manifestInsert.error;

    const sessionUpdate = await supabase.from("game_sessions").update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    }).eq("id", session.id).eq("profile_id", owned.user.id);
    if (sessionUpdate.error) throw sessionUpdate.error;

    return NextResponse.json({ persisted: true, snapshotId: newSnapshotId });
  } catch (error) {
    return refinementErrorResponse(error, "Unable to complete refinement.");
  }
}
