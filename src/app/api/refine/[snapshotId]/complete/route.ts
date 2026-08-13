import { NextResponse } from "next/server";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { buildRefinedEraPrint, type RefinementMode } from "@/lib/living/refinement-mode";
import { selectNextAdaptiveQuestion, validateLivingEraPrintAnswers } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const body = await request.json() as { sessionId?: string };
    if (!body.sessionId) throw new Error("A refinement session is required.");

    const supabase = await getAuthenticatedSupabase(request);
    const userResponse = await supabase.auth.getUser();
    if (userResponse.error || !userResponse.data.user) throw new Error("Authentication is required.");

    const sessionResponse = await supabase.from("game_sessions")
      .select("id,status,profile_id,base_snapshot_id,refinement_mode,refinement_target_count")
      .eq("id", body.sessionId).eq("profile_id", userResponse.data.user.id).maybeSingle();
    if (sessionResponse.error) throw sessionResponse.error;
    const session = sessionResponse.data;
    if (!session || session.base_snapshot_id !== snapshotId) {
      throw new Error("Refinement session not found or not owned by this session.");
    }

    const existingSnapshot = await supabase.from("eraprint_snapshots")
      .select("id").eq("game_session_id", session.id).maybeSingle();
    if (existingSnapshot.error) throw existingSnapshot.error;
    if (existingSnapshot.data) {
      return NextResponse.json({ persisted: true, snapshotId: existingSnapshot.data.id });
    }
    if (session.status !== "IN_PROGRESS") throw new Error("This refinement session cannot be completed.");

    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) throw new Error("Refinement must update your latest EraPrint.");
    const mode = session.refinement_mode as RefinementMode;
    if (mode !== "CONTINUOUS") throw new Error("Invalid refinement mode.");

    const answersResponse = await supabase.from("answers")
      .select("question_id,choice_id,sequence_no").eq("session_id", session.id).order("sequence_no");
    if (answersResponse.error) throw answersResponse.error;
    const refinementAnswers: Answer[] = (answersResponse.data ?? []).map((answer) => ({
      questionId: answer.question_id,
      choiceId: answer.choice_id,
    }));
    const target = Number(session.refinement_target_count);
    if (!Number.isInteger(target) || target < 1) throw new Error("Invalid refinement target.");
    const catalogExhausted = selectNextAdaptiveQuestion([...owned.answers, ...refinementAnswers]) === null;
    const finished = refinementAnswers.length === target || catalogExhausted;
    if (!finished) {
      throw new Error(`This refinement still has ${target - refinementAnswers.length} choices remaining.`);
    }
    const errors = validateLivingEraPrintAnswers(owned.answers, refinementAnswers, target);
    if (errors.length) throw new Error(errors[0]);

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete refinement." },
      { status: 400 },
    );
  }
}
