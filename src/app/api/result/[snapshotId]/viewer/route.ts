import { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    const { snapshotId } = await params;
    if (!UUID_PATTERN.test(snapshotId)) {
      return NextResponse.json({ error: "A valid snapshot ID is required." }, { status: 400 });
    }
    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc(
      "is_eraprint_snapshot_owned_by_viewer",
      { p_snapshot_id: snapshotId },
    );
    if (error) throw error;
    return NextResponse.json({ isOwner: data === true });
  } catch (error) {
    return NextResponse.json(
      { error: safeSupabaseError(error, "Unable to verify result ownership.") },
      { status: 400 },
    );
  }
}
