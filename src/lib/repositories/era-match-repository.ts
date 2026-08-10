import { getSupabaseBrowserClient } from "@/lib/supabase/client";

async function accessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is required for EraMatch.");

  const sessionResponse = await supabase.auth.getSession();
  let session = sessionResponse.data.session;

  if (!session) {
    const anonymous = await supabase.auth.signInAnonymously();
    if (anonymous.error) throw anonymous.error;
    session = anonymous.data.session;
  }

  if (!session?.access_token) {
    throw new Error("Supabase did not return an authenticated session.");
  }

  return session.access_token;
}

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const body = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "EraMatch request failed.");
  }

  return body;
}

export async function createMatchInvite(snapshotId: string): Promise<string> {
  const body = await authenticatedRequest<{ inviteId: string }>(
    "/api/match/invites",
    { method: "POST", body: JSON.stringify({ snapshotId }) },
  );
  return body.inviteId;
}

export async function getMyLatestSnapshotId(): Promise<string | null> {
  const body = await authenticatedRequest<{ snapshotId: string | null }>(
    "/api/match/snapshots/current",
  );
  return body.snapshotId;
}

export async function completeMatchInvite(
  inviteId: string,
  snapshotId: string,
): Promise<string> {
  const body = await authenticatedRequest<{ matchId: string }>(
    `/api/match/invites/${inviteId}/complete`,
    { method: "POST", body: JSON.stringify({ snapshotId }) },
  );
  return body.matchId;
}
