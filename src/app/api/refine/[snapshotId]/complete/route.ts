import { NextResponse } from "next/server";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { calculateEraPrint, REFINEMENT_DECISIONS, validateLivingEraPrintAnswers } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const body = await request.json() as { answers?: Answer[]; clientRequestId?: string };
    const refinementAnswers = body.answers ?? [];
    if (!body.clientRequestId || refinementAnswers.length !== REFINEMENT_DECISIONS) {
      throw new Error("Refinement completion requires exactly three new answers.");
    }

    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) throw new Error("Refinement must update your latest EraPrint.");
    const errors = validateLivingEraPrintAnswers(owned.answers, refinementAnswers);
    if (errors.length) throw new Error(errors[0]);

    const existingSession = await supabase.from("game_sessions")
      .select("id").eq("client_request_id", body.clientRequestId).maybeSingle();
    if (existingSession.error) throw existingSession.error;
    if (existingSession.data) {
      const existingSnapshot = await supabase.from("eraprint_snapshots")
        .select("id").eq("game_session_id", existingSession.data.id).single();
      if (existingSnapshot.error) throw existingSnapshot.error;
      return NextResponse.json({ persisted: true, snapshotId: existingSnapshot.data.id });
    }

    const cumulativeAnswers = [...owned.answers, ...refinementAnswers];
    const result = calculateEraPrint(cumulativeAnswers);
    const sessionInsert = await supabase.from("game_sessions").insert({
      client_request_id: body.clientRequestId,
      profile_id: owned.user.id,
      session_type: "DEEPEN_PROFILE",
      status: "COMPLETED",
      scoring_version: result.scoringVersion,
      completed_at: new Date().toISOString(),
    }).select("id").single();
    if (sessionInsert.error) throw sessionInsert.error;

    const answerInsert = await supabase.from("answers").insert(
      refinementAnswers.map((answer, index) => ({
        session_id: sessionInsert.data.id,
        profile_id: owned.user.id,
        question_id: answer.questionId,
        choice_id: answer.choiceId,
        sequence_no: index + 1,
      })),
    );
    if (answerInsert.error) throw answerInsert.error;

    const snapshotInsert = await supabase.from("eraprint_snapshots").insert({
      profile_id: owned.user.id,
      game_session_id: sessionInsert.data.id,
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

    return NextResponse.json({ persisted: true, snapshotId: newSnapshotId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete refinement." },
      { status: 400 },
    );
  }
}
