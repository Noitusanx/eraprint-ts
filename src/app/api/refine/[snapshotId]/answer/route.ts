import { NextResponse } from "next/server";
import { PUBLIC_QUESTIONS } from "@/lib/data/public-catalog";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import type { RefinementMode } from "@/lib/living/refinement-mode";
import { selectNextAdaptiveQuestion, validateLivingEraPrintAnswers } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const body = await request.json() as { sessionId?: string; questionId?: string; choiceId?: string };
    if (!body.sessionId || !body.questionId || !body.choiceId) throw new Error("A refinement answer is required.");

    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) throw new Error("Refinement must update your latest EraPrint.");

    const sessionResponse = await supabase.from("game_sessions")
      .select("id,refinement_mode,refinement_target_count,base_snapshot_id")
      .eq("id", body.sessionId).eq("profile_id", owned.user.id)
      .eq("status", "IN_PROGRESS").eq("session_type", "DEEPEN_PROFILE").maybeSingle();
    if (sessionResponse.error) throw sessionResponse.error;
    if (!sessionResponse.data || sessionResponse.data.base_snapshot_id !== snapshotId) {
      throw new Error("Refinement session not found or not owned by this session.");
    }
    const mode = sessionResponse.data.refinement_mode as RefinementMode;
    if (mode !== "CONTINUOUS") throw new Error("Invalid refinement mode.");

    const answersResponse = await supabase.from("answers")
      .select("question_id,choice_id,sequence_no")
      .eq("session_id", body.sessionId).order("sequence_no");
    if (answersResponse.error) throw answersResponse.error;
    const sessionAnswers: Answer[] = (answersResponse.data ?? []).map((answer) => ({
      questionId: answer.question_id,
      choiceId: answer.choice_id,
    }));
    const submitted: Answer = { questionId: body.questionId, choiceId: body.choiceId };
    const target = Number(sessionResponse.data.refinement_target_count);
    if (!Number.isInteger(target) || target < 1) throw new Error("Invalid refinement target.");
    const alreadySaved = sessionAnswers.find((answer) => answer.questionId === submitted.questionId);
    let updatedAnswers = sessionAnswers;
    if (alreadySaved) {
      if (alreadySaved.choiceId !== submitted.choiceId) {
        throw new Error("That question already has a different saved choice.");
      }
    } else {
      const errors = validateLivingEraPrintAnswers(owned.answers, [...sessionAnswers, submitted], target);
      if (errors.length) throw new Error(errors[0]);

      const insert = await supabase.from("answers").insert({
        session_id: body.sessionId,
        profile_id: owned.user.id,
        question_id: submitted.questionId,
        choice_id: submitted.choiceId,
        sequence_no: sessionAnswers.length + 1,
      });
      if (insert.error) throw insert.error;
      updatedAnswers = [...sessionAnswers, submitted];
    }
    const complete = updatedAnswers.length === target;
    const next = complete ? null : selectNextAdaptiveQuestion([...owned.answers, ...updatedAnswers]);
    const question = next ? PUBLIC_QUESTIONS.find((item) => item.id === next.id) : null;
    if (next && !question) throw new Error("Public question data is missing.");

    return NextResponse.json({
      sessionAnswerCount: updatedAnswers.length,
      cumulativeAnswerCount: owned.answers.length + updatedAnswers.length,
      remainingCount: PUBLIC_QUESTIONS.length - owned.answers.length - updatedAnswers.length,
      shouldFinalize: complete || !next,
      question,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save refinement answer." },
      { status: 400 },
    );
  }
}
