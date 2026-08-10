import { NextResponse } from "next/server";
import { selectNextAdaptiveQuestion, validateInitialGameSequence } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { answers?: Answer[] };
    const answers = body.answers ?? [];

    if (!Array.isArray(answers) || answers.length < 5 || answers.length >= 8) {
      return NextResponse.json(
        { error: "Adaptive selection expects 5-7 valid answers." },
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

    const next = selectNextAdaptiveQuestion(answers);
    if (!next) {
      return NextResponse.json({ questionId: null });
    }

    return NextResponse.json({ questionId: next.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to select next question.",
      },
      { status: 400 },
    );
  }
}
