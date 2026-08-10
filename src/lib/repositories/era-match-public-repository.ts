import { createClient } from "@supabase/supabase-js";
import type {
  PublicEraMatchResult,
  PublicInviteState,
} from "@/lib/match/types";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchPublicMatchInvite(
  inviteId: string,
): Promise<PublicInviteState | null> {
  if (!UUID_PATTERN.test(inviteId)) return null;
  const supabase = publicClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc(
    "get_public_eraprint_match_invite",
    { p_invite_id: inviteId },
  );
  return error || !data ? null : (data as PublicInviteState);
}

export async function fetchPublicMatchResult(
  matchId: string,
): Promise<PublicEraMatchResult | null> {
  if (!UUID_PATTERN.test(matchId)) return null;
  const supabase = publicClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc(
    "get_public_eraprint_match_result",
    { p_match_id: matchId },
  );
  return error || !data ? null : (data as PublicEraMatchResult);
}
