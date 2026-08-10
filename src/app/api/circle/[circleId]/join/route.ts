import { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function POST(request: Request, { params }: { params: Promise<{ circleId: string }> }) {
  try {
    const { circleId } = await params;
    const body = (await request.json()) as { snapshotId?: string };
    if (!UUID_PATTERN.test(circleId) || !body.snapshotId || !UUID_PATTERN.test(body.snapshotId)) {
      return NextResponse.json({ error: "Valid Circle and snapshot IDs are required." }, { status: 400 });
    }
    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc("join_eraprint_circle", { p_circle_id: circleId, p_snapshot_id: body.snapshotId });
    if (error) throw error;
    return NextResponse.json({ memberCount: Number(data) });
  } catch (error) {
    return NextResponse.json({ error: safeSupabaseError(error, "Unable to join Circle.") }, { status: 400 });
  }
}
