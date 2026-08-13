import { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  try {
    const { resultId } = await params;
    if (!UUID_PATTERN.test(resultId)) {
      return NextResponse.json(
        { error: "A valid Circle result ID is required." },
        { status: 400 },
      );
    }

    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc(
      "get_eraprint_circle_result_viewer_state",
      { p_result_id: resultId },
    );
    if (error) throw error;
    return NextResponse.json(data ?? { memberIndex: null });
  } catch (error) {
    return NextResponse.json(
      { error: safeSupabaseError(error, "Unable to identify this Circle member.") },
      { status: 400 },
    );
  }
}
