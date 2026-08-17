import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicQuestion } from "@/lib/data/public-catalog";
import type { RefinementQuestionTree } from "@/lib/living/refinement-prefetch";

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
  latestSnapshotId: string | null;
  answerCount: number;
  remainingCount: number;
  compatible: boolean;
  canRefine: boolean;
  activeRefinement: null | {
    sessionId: string;
    answeredCount: number;
    remainingCount: number;
  };
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
  const body = await response.json() as T & { error?: string; code?: string };
  if (!response.ok) {
    const error = new Error(body.error ?? "Living EraPrint request failed.");
    error.name = body.code ?? "LIVING_ERAPRINT_ERROR";
    throw error;
  }
  return body;
}

export async function fetchLivingState(snapshotId: string): Promise<LivingState> {
  return readJson(await authenticatedFetch(`/api/refine/${snapshotId}/state`));
}

export type RefinementSessionState = {
  sessionId: string;
  sessionAnswerCount: number;
  baseAnswerCount: number;
  totalQuestionCount: number;
  shouldFinalize: boolean;
  question: PublicQuestion | null;
  nextByChoice: RefinementQuestionTree;
};

export async function startOrResumeRefinement(snapshotId: string) {
  return readJson<RefinementSessionState>(await authenticatedFetch(
    `/api/refine/${snapshotId}/session`,
    { method: "POST" },
  ));
}

export async function saveRefinementAnswer(
  snapshotId: string,
  sessionId: string,
  questionId: string,
  choiceId: string,
) {
  return readJson<{
    sessionAnswerCount: number;
    cumulativeAnswerCount: number;
    remainingCount: number;
    shouldFinalize: boolean;
    question: PublicQuestion | null;
    nextByChoice: RefinementQuestionTree;
  }>(await authenticatedFetch(`/api/refine/${snapshotId}/answer`, {
    method: "POST",
    body: JSON.stringify({ sessionId, questionId, choiceId }),
  }));
}

export async function completeRefinement(
  snapshotId: string,
  sessionId: string,
) {
  return readJson<{ persisted: true; snapshotId: string }>(await authenticatedFetch(
    `/api/refine/${snapshotId}/complete`,
    { method: "POST", body: JSON.stringify({ sessionId }) },
  ));
}
