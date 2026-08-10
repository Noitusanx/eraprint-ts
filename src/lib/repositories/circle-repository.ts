import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CircleParticipantState } from "@/lib/circle/types";

async function accessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is required for Circle.");
  const current = await supabase.auth.getSession();
  let session = current.data.session;
  if (!session) {
    const anonymous = await supabase.auth.signInAnonymously();
    if (anonymous.error) throw anonymous.error;
    session = anonymous.data.session;
  }
  if (!session?.access_token) throw new Error("Supabase did not return an authenticated session.");
  return session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Circle request failed.");
  return body;
}

export async function createCircle(snapshotId: string): Promise<string> {
  return (await request<{ circleId: string }>("/api/circle", { method: "POST", body: JSON.stringify({ snapshotId }) })).circleId;
}

export async function getCircleParticipantState(circleId: string): Promise<CircleParticipantState> {
  return request<CircleParticipantState>(`/api/circle/${circleId}/participant`);
}

export async function joinCircle(circleId: string, snapshotId: string): Promise<number> {
  return (await request<{ memberCount: number }>(`/api/circle/${circleId}/join`, { method: "POST", body: JSON.stringify({ snapshotId }) })).memberCount;
}

export async function finalizeCircle(circleId: string): Promise<string> {
  return (await request<{ circleResultId: string }>(`/api/circle/${circleId}/finalize`, { method: "POST" })).circleResultId;
}
