import { NextResponse } from "next/server";
import { PUBLIC_QUESTIONS } from "@/lib/data/public-catalog";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { RefinementError, refinementErrorResponse } from "@/lib/living/refinement-errors";
import { buildRefinementProgress } from "@/lib/living/refinement-session";
import { buildRefinementQuestionPrefetch } from "@/lib/living/refinement-prefetch";
import { selectNextAdaptiveQuestion } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) {
      throw new RefinementError(
        "NOT_LATEST_SNAPSHOT",
        "Refinement must start from your latest EraPrint.",
        409,
      );
    }

    const existing = await supabase.from("game_sessions")
      .select("id,base_snapshot_id")
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
    if (!session) {
      const next = selectNextAdaptiveQuestion(owned.answers);
      if (!next) {
        throw new RefinementError(
          "CATALOG_EXHAUSTED",
          "You have answered every choice available right now.",
          409,
        );
      }
      const inserted = await supabase.from("game_sessions").insert({
        client_request_id: crypto.randomUUID(),
        profile_id: owned.user.id,
        session_type: "DEEPEN_PROFILE",
        status: "IN_PROGRESS",
        scoring_version: owned.snapshot.scoring_version,
        base_snapshot_id: snapshotId,
      }).select("id,base_snapshot_id").single();
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
    const progress = buildRefinementProgress(owned.answers, sessionAnswers);
    if (progress.errors.length) throw new RefinementError("INVALID_ANSWER", progress.errors[0], 409);
    const next = progress.nextQuestion;
    const question = next
      ? PUBLIC_QUESTIONS.find((item) => item.id === next.id) ?? null
      : null;
    if (next && !question) throw new Error("Public question data is missing.");
    const nextByChoice = buildRefinementQuestionPrefetch(
      owned.answers,
      sessionAnswers,
      question,
    );

    return NextResponse.json({
      sessionId: session.id,
      sessionAnswerCount: progress.sessionAnswerCount,
      baseAnswerCount: owned.answers.length,
      totalQuestionCount: PUBLIC_QUESTIONS.length,
      shouldFinalize: progress.catalogExhausted,
      question,
      nextByChoice,
    });
  } catch (error) {
    return refinementErrorResponse(error, "Unable to start refinement.");
  }
}
