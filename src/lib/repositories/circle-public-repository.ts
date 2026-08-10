import { createClient } from "@supabase/supabase-js";
import type { PublicCircleLobby, PublicCircleResult } from "@/lib/circle/types";
import { UUID_PATTERN } from "./era-match-public-repository";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function fetchPublicCircle(circleId: string): Promise<PublicCircleLobby | null> {
  if (!UUID_PATTERN.test(circleId)) return null;
  const supabase = client();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_eraprint_circle", { p_circle_id: circleId });
  return error || !data ? null : (data as PublicCircleLobby);
}

export async function fetchPublicCircleResult(resultId: string): Promise<PublicCircleResult | null> {
  if (!UUID_PATTERN.test(resultId)) return null;
  const supabase = client();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_eraprint_circle_result", { p_result_id: resultId });
  return error || !data ? null : (data as PublicCircleResult);
}
