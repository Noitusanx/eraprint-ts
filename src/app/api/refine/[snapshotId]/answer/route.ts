import { NextResponse } from "next/server";
import { PUBLIC_QUESTIONS } from "@/lib/data/public-catalog";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { RefinementError, refinementErrorResponse } from "@/lib/living/refinement-errors";
import { buildRefinementProgress } from "@/lib/living/refinement-session";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const body = await request.json() as { sessionId?: string; questionId?: string; choiceId?: string };
    if (!body.sessionId || !body.questionId || !body.choiceId) {
      throw new RefinementError("INVALID_ANSWER", "A refinement answer is required.", 400);
    }

    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) {
      throw new RefinementError("NOT_LATEST_SNAPSHOT", "Refinement must update your latest EraPrint.", 409);
    }

    const sessionResponse = await supabase.from("game_sessions")
      .select("id,base_snapshot_id")
      .eq("id", body.sessionId).eq("profile_id", owned.user.id)
      .eq("status", "IN_PROGRESS").eq("session_type", "DEEPEN_PROFILE").maybeSingle();
    if (sessionResponse.error) throw sessionResponse.error;
    if (!sessionResponse.data || sessionResponse.data.base_snapshot_id !== snapshotId) {
      throw new RefinementError("INVALID_SESSION", "Refinement session not found.", 404);
    }

    const answersResponse = await supabase.from("answers")
      .select("question_id,choice_id,sequence_no")
      .eq("session_id", body.sessionId).order("sequence_no");
    if (answersResponse.error) throw answersResponse.error;
    const sessionAnswers: Answer[] = (answersResponse.data ?? []).map((answer) => ({
      questionId: answer.question_id,
      choiceId: answer.choice_id,
    }));
    const submitted: Answer = { questionId: body.questionId, choiceId: body.choiceId };
    const alreadySaved = sessionAnswers.find((answer) => answer.questionId === submitted.questionId);
    let updatedAnswers = sessionAnswers;
    if (alreadySaved) {
      if (alreadySaved.choiceId !== submitted.choiceId) {
        throw new RefinementError("INVALID_ANSWER", "That question already has a different saved choice.", 409);
      }
    } else {
      const progress = buildRefinementProgress(owned.answers, [...sessionAnswers, submitted]);
      if (progress.errors.length) throw new RefinementError("INVALID_ANSWER", progress.errors[0], 400);

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
    const progress = buildRefinementProgress(owned.answers, updatedAnswers);
    const next = progress.nextQuestion;
    const question = next ? PUBLIC_QUESTIONS.find((item) => item.id === next.id) : null;
    if (next && !question) throw new Error("Public question data is missing.");

    return NextResponse.json({
      sessionAnswerCount: progress.sessionAnswerCount,
      cumulativeAnswerCount: progress.cumulativeAnswerCount,
      remainingCount: progress.remainingCount,
      shouldFinalize: progress.catalogExhausted,
      question,
    });
  } catch (error) {
    return refinementErrorResponse(error, "Unable to save refinement answer.");
  }
}
