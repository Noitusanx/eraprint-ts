import { NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function GET(request: Request, { params }: { params: Promise<{ circleId: string }> }) {
  try {
    const { circleId } = await params;
    if (!UUID_PATTERN.test(circleId)) return NextResponse.json({ error: "A valid Circle ID is required." }, { status: 400 });
    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc("get_eraprint_circle_participant_state", { p_circle_id: circleId });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: safeSupabaseError(error, "Unable to check Circle access.") }, { status: 400 });
  }
}
