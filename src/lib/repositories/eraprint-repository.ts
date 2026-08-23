import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Answer } from "@/lib/scoring/types";

async function authenticatedAccessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is required to verify this result.");
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) throw new Error("No authenticated EraPrint session was found.");
  return session.access_token;
}

export async function isSnapshotOwnedByViewer(snapshotId: string): Promise<boolean> {
  const token = await authenticatedAccessToken();
  const response = await fetch(`/api/result/${snapshotId}/viewer`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  return ((await response.json()) as { isOwner?: boolean }).isOwner === true;
}

export type PersistenceStatus =
  | { mode: "demo"; persisted: false }
  | { mode: "supabase"; persisted: true; sessionId: string; snapshotId: string }
  | { mode: "supabase"; persisted: false; error: string };

export async function persistCompletedEraPrint(
  clientRequestId: string,
  answers: Answer[],
): Promise<PersistenceStatus> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return { mode: "demo", persisted: false };
  }

  try {
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

    const response = await fetch("/api/game/persist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ clientRequestId, answers }),
    });

    const body = (await response.json()) as {
      persisted?: boolean;
      sessionId?: string;
      snapshotId?: string;
      error?: string;
    };

    if (!response.ok || !body.persisted || !body.sessionId || !body.snapshotId) {
      throw new Error(body.error ?? "Server did not persist the EraPrint.");
    }

    return {
      mode: "supabase",
      persisted: true,
      sessionId: body.sessionId,
      snapshotId: body.snapshotId,
    };
  } catch (error) {
    return {
      mode: "supabase",
      persisted: false,
      error: error instanceof Error ? error.message : "Unknown persistence error",
    };
  }
}
