import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicQuestion } from "@/lib/data/public-catalog";
import type { Answer } from "@/lib/scoring/types";

async function authenticatedFetch(path: string, init?: RequestInit) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = await supabase.auth.getSession();
  if (!session.data.session?.access_token) throw new Error("This EraPrint is not owned by this browser session.");
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      Authorization: `Bearer ${session.data.session.access_token}`,
    },
  });
}

export type LivingState = {
  owned: boolean;
  isLatest: boolean;
  answerCount: number;
  remainingCount: number;
  canRefine: boolean;
  previous: null | {
    id: string;
    primary_era_code: string;
    secondary_era_code: string;
    hidden_era_code: string;
    clarity: number;
    traits: { trait_code: string; score: number }[];
  };
};

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Living EraPrint request failed.");
  return body;
}

export async function fetchLivingState(snapshotId: string): Promise<LivingState> {
  return readJson(await authenticatedFetch(`/api/refine/${snapshotId}/state`));
}

export async function fetchRefinementQuestion(snapshotId: string, answers: Answer[]) {
  return readJson<{ question: PublicQuestion | null }>(await authenticatedFetch(
    `/api/refine/${snapshotId}/next`,
    { method: "POST", body: JSON.stringify({ answers }) },
  ));
}

export async function completeRefinement(
  snapshotId: string,
  answers: Answer[],
  clientRequestId: string,
) {
  return readJson<{ persisted: true; snapshotId: string }>(await authenticatedFetch(
    `/api/refine/${snapshotId}/complete`,
    { method: "POST", body: JSON.stringify({ answers, clientRequestId }) },
  ));
}
