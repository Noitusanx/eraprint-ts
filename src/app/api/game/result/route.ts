import { NextResponse } from "next/server";
import { calculateEraPrint, validateInitialGameSequence } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { answers?: Answer[] };
    const answers = body.answers ?? [];

    if (!Array.isArray(answers) || answers.length !== 8) {
      return NextResponse.json(
        { error: "EraPrint result requires exactly 8 answers." },
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

    const result = calculateEraPrint(answers);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to calculate EraPrint.",
      },
      { status: 400 },
    );
  }
}
