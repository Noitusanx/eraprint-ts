import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await context.params;
    if (!UUID_PATTERN.test(inviteId)) {
      return NextResponse.json({ error: "Invalid invite ID." }, { status: 400 });
    }

    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc(
      "get_eraprint_match_invite_viewer_state",
      { p_invite_id: inviteId },
    );
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: safeSupabaseError(error, "Unable to check invite access.") },
      { status: 400 },
    );
  }
}
