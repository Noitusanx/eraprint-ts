import { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { matchId } = await params;
    if (!UUID_PATTERN.test(matchId)) {
      return NextResponse.json(
        { error: "A valid EraMatch result ID is required." },
        { status: 400 },
      );
    }

    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc(
      "get_eraprint_match_result_viewer_side",
      { p_match_id: matchId },
    );
    if (error) throw error;

    return NextResponse.json({
      side: data === "A" || data === "B" ? data : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeSupabaseError(error, "Unable to identify this EraMatch participant.") },
      { status: 400 },
    );
  }
}
