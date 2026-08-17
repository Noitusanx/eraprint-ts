import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CATALOG_VERSION,
} from "@/lib/data/catalog";
import {
  calculateEraPrint,
  INITIAL_DECISIONS,
  validateInitialGameSequence,
} from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const authorization = request.headers.get("authorization");

    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 503 },
      );
    }

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authenticated Supabase session." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      answers?: Answer[];
      clientRequestId?: string;
    };
    const answers = body.answers ?? [];
    const clientRequestId = body.clientRequestId;

    if (!clientRequestId || !Array.isArray(answers) || answers.length !== INITIAL_DECISIONS) {
      return NextResponse.json(
        { error: `Persistence requires a request id and exactly ${INITIAL_DECISIONS} answers.` },
        { status: 400 },
      );
    }

    const sequenceErrors = validateInitialGameSequence(answers);
    if (sequenceErrors.length > 0) {
      return NextResponse.json(
        { error: sequenceErrors[0] },
        { status: 400 },
      );
    }

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const userResponse = await supabase.auth.getUser(
      authorization.slice("Bearer ".length),
    );
    if (userResponse.error || !userResponse.data.user) {
      throw userResponse.error ?? new Error("Unable to resolve authenticated user.");
    }

    const user = userResponse.data.user;
    const result = calculateEraPrint(answers);

    const profileInsert = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: "Anonymous Swiftie",
      },
      { onConflict: "id" },
    );
    if (profileInsert.error) throw profileInsert.error;

    const existingSession = await supabase
      .from("game_sessions")
      .select("id")
      .eq("client_request_id", clientRequestId)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (existingSession.error) throw existingSession.error;
    if (existingSession.data) {
      const existingSnapshot = await supabase
        .from("eraprint_snapshots")
        .select("id")
        .eq("game_session_id", existingSession.data.id)
        .single();
      if (existingSnapshot.error) throw existingSnapshot.error;
      return NextResponse.json({
        persisted: true,
        sessionId: existingSession.data.id,
        snapshotId: existingSnapshot.data.id,
      });
    }

    const sessionInsert = await supabase
      .from("game_sessions")
      .insert(
        {
          client_request_id: clientRequestId,
          profile_id: user.id,
          session_type: "INITIAL",
          status: "COMPLETED",
          scoring_version: result.scoringVersion,
          completed_at: new Date().toISOString(),
        },
      )
      .select("id")
      .single();

    if (sessionInsert.error) throw sessionInsert.error;
    const sessionId = sessionInsert.data.id as string;

    const answerRows = answers.map((answer, index) => ({
      session_id: sessionId,
      profile_id: user.id,
      question_id: answer.questionId,
      choice_id: answer.choiceId,
      sequence_no: index + 1,
    }));

    const answerInsert = await supabase
      .from("answers")
      .insert(answerRows);
    if (answerInsert.error) throw answerInsert.error;

    const snapshotInsert = await supabase
      .from("eraprint_snapshots")
      .insert(
        {
          profile_id: user.id,
          game_session_id: sessionId,
          answer_count: answers.length,
          catalog_version: CATALOG_VERSION,
          scoring_version: result.scoringVersion,
          primary_era_code: result.primaryEra.code,
          secondary_era_code: result.secondaryEra.code,
          hidden_era_code: result.hiddenEra.code,
          archetype: result.archetype,
          clarity: result.clarity,
          fingerprint_code: result.fingerprintCode,
          era_blend: result.eraBlend,
        },
      )
      .select("id")
      .single();

    if (snapshotInsert.error) throw snapshotInsert.error;
    const snapshotId = snapshotInsert.data.id as string;

    const manifestInsert = await supabase
      .from("eraprint_snapshot_answers")
      .insert(
        answers.map((answer, index) => ({
          snapshot_id: snapshotId,
          question_id: answer.questionId,
          choice_id: answer.choiceId,
          sequence_no: index + 1,
        })),
      );
    if (manifestInsert.error) throw manifestInsert.error;

    const traitRows = Object.values(result.traitScores).map((trait) => ({
      snapshot_id: snapshotId,
      trait_code: trait.code,
      score: trait.score,
      evidence_count: trait.evidenceCount,
      total_effect: trait.totalEffect,
      reliability: trait.reliability,
    }));

    const traitInsert = await supabase
      .from("eraprint_trait_scores")
      .insert(traitRows);
    if (traitInsert.error) throw traitInsert.error;

    return NextResponse.json({ persisted: true, sessionId, snapshotId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to persist EraPrint.",
      },
      { status: 400 },
    );
  }
}
