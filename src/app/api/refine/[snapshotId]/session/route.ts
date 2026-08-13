import { NextResponse } from "next/server";
import { PUBLIC_QUESTIONS } from "@/lib/data/public-catalog";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { refinementTarget } from "@/lib/living/refinement-mode";
import { selectNextAdaptiveQuestion, validateLivingEraPrintAnswers } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    await request.json();
    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) throw new Error("Refinement must start from your latest EraPrint.");

    const existing = await supabase.from("game_sessions")
      .select("id,base_snapshot_id,refinement_mode,refinement_target_count")
      .eq("profile_id", owned.user.id)
      .eq("session_type", "DEEPEN_PROFILE")
      .eq("status", "IN_PROGRESS")
      .maybeSingle();
    if (existing.error) throw existing.error;

    let session = existing.data;
    if (session && session.base_snapshot_id !== snapshotId) {
      const abandonResponse = await supabase.from("game_sessions")
        .update({ status: "ABANDONED" })
        .eq("id", session.id)
        .eq("profile_id", owned.user.id)
        .eq("status", "IN_PROGRESS");
      if (abandonResponse.error) throw abandonResponse.error;
      session = null;
    }
    if (session && session.refinement_mode !== "CONTINUOUS") {
      throw new Error("The saved refinement session cannot be resumed.");
    }
    if (!session) {
      const target = refinementTarget(owned.answers.length);
      if (target === 0) throw new Error("No unused refinement question is available.");
      const inserted = await supabase.from("game_sessions").insert({
        client_request_id: crypto.randomUUID(),
        profile_id: owned.user.id,
        session_type: "DEEPEN_PROFILE",
        status: "IN_PROGRESS",
        scoring_version: owned.snapshot.scoring_version,
        base_snapshot_id: snapshotId,
        refinement_mode: "CONTINUOUS",
        refinement_target_count: target,
      }).select("id,base_snapshot_id,refinement_mode,refinement_target_count").single();
      if (inserted.error) throw inserted.error;
      session = inserted.data;
    }

    const answersResponse = await supabase.from("answers")
      .select("question_id,choice_id,sequence_no")
      .eq("session_id", session.id).order("sequence_no");
    if (answersResponse.error) throw answersResponse.error;
    const sessionAnswers: Answer[] = (answersResponse.data ?? []).map((answer) => ({
      questionId: answer.question_id,
      choiceId: answer.choice_id,
    }));
    const mode = session.refinement_mode as "CONTINUOUS";
    const target = Number(session.refinement_target_count);
    if (!Number.isInteger(target) || target < 1) throw new Error("The saved refinement target is invalid.");
    const errors = validateLivingEraPrintAnswers(
      owned.answers,
      sessionAnswers,
      target,
    );
    if (errors.length) throw new Error(errors[0]);

    const complete = sessionAnswers.length === target;
    const next = complete ? null : selectNextAdaptiveQuestion([...owned.answers, ...sessionAnswers]);
    const question = next ? PUBLIC_QUESTIONS.find((item) => item.id === next.id) : null;
    if (next && !question) throw new Error("Public question data is missing.");

    return NextResponse.json({
      sessionId: session.id,
      mode,
      sessionAnswerCount: sessionAnswers.length,
      baseAnswerCount: owned.answers.length,
      totalQuestionCount: PUBLIC_QUESTIONS.length,
      targetNewAnswers: target,
      shouldFinalize: complete,
      question,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start refinement." },
      { status: 400 },
    );
  }
}
