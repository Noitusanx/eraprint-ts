import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { snapshotId?: string };
    if (!body.snapshotId || !UUID_PATTERN.test(body.snapshotId)) {
      return NextResponse.json({ error: "A valid snapshot ID is required." }, { status: 400 });
    }

    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc("create_eraprint_match_invite", {
      p_snapshot_id: body.snapshotId,
    });
    if (error) throw error;

    return NextResponse.json({ inviteId: data as string });
  } catch (error) {
    return NextResponse.json(
      { error: safeSupabaseError(error, "Unable to create invite.") },
      { status: 400 },
    );
  }
}
