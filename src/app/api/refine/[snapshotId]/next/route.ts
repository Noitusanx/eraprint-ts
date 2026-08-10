import { NextResponse } from "next/server";
import { PUBLIC_QUESTIONS } from "@/lib/data/public-catalog";
import { getOwnedSnapshotContext } from "@/lib/living/living-server";
import { selectNextAdaptiveQuestion, validateLivingEraPrintAnswers } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";

export async function POST(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  try {
    const { snapshotId } = await context.params;
    const body = await request.json() as { answers?: Answer[] };
    const refinementAnswers = body.answers ?? [];
    const supabase = await getAuthenticatedSupabase(request);
    const owned = await getOwnedSnapshotContext(supabase, snapshotId);
    if (!owned.isLatest) throw new Error("Refinement must start from your latest EraPrint.");
    const errors = validateLivingEraPrintAnswers(owned.answers, refinementAnswers);
    if (errors.length) throw new Error(errors[0]);

    const next = selectNextAdaptiveQuestion([...owned.answers, ...refinementAnswers]);
    if (!next) return NextResponse.json({ question: null });
    const question = PUBLIC_QUESTIONS.find((item) => item.id === next.id);
    if (!question) throw new Error("Public question data is missing.");
    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to select a refinement question." },
      { status: 400 },
    );
  }
}
