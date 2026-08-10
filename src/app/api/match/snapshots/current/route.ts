import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/authenticated-server";
import { safeSupabaseError } from "@/lib/supabase/safe-error";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase.rpc("get_my_latest_eraprint_snapshot");
    if (error) throw error;
    return NextResponse.json({ snapshotId: (data as string | null) ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: safeSupabaseError(error, "Unable to find an EraPrint.") },
      { status: 400 },
    );
  }
}
