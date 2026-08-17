import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_VERSION, SCORING_VERSION } from "../data/catalog";
import type { Answer } from "../scoring/types";
import { RefinementError } from "./refinement-errors";

export function assertCurrentRefinementVersion(snapshot: {
  catalog_version: string;
  scoring_version: string;
}) {
  if (
    snapshot.catalog_version !== CATALOG_VERSION ||
    snapshot.scoring_version !== SCORING_VERSION
  ) {
    throw new RefinementError(
      "INCOMPATIBLE_SCORING_VERSION",
      "This EraPrint uses an earlier scoring version and remains available as a historical result.",
      409,
    );
  }
}

export async function getOwnedSnapshotContext(
  supabase: SupabaseClient,
  snapshotId: string,
) {
  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;
  if (userResponse.error || !user) {
    throw new RefinementError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  const [snapshotResponse, latestResponse, answersResponse] = await Promise.all([
    supabase
      .from("eraprint_snapshots")
      .select("id,profile_id,previous_snapshot_id,answer_count,catalog_version,scoring_version,primary_era_code,secondary_era_code,hidden_era_code,clarity")
      .eq("id", snapshotId)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.rpc("get_latest_owned_eraprint_snapshot"),
    supabase
      .from("eraprint_snapshot_answers")
      .select("question_id,choice_id,sequence_no")
      .eq("snapshot_id", snapshotId)
      .order("sequence_no"),
  ]);
  if (snapshotResponse.error) throw snapshotResponse.error;
  if (!snapshotResponse.data) {
    throw new RefinementError(
      "NOT_OWNER",
      "This EraPrint is not owned by the current session.",
      403,
    );
  }

  if (latestResponse.error) throw latestResponse.error;
  if (answersResponse.error) throw answersResponse.error;

  const answers: Answer[] = (answersResponse.data ?? []).map((row) => ({
    questionId: row.question_id as string,
    choiceId: row.choice_id as string,
  }));
  if (answers.length !== snapshotResponse.data.answer_count) {
    throw new RefinementError(
      "INVALID_SNAPSHOT",
      "This EraPrint has an incomplete answer history.",
      409,
    );
  }

  return {
    user,
    snapshot: snapshotResponse.data,
    answers,
    isLatest: latestResponse.data === snapshotId,
    latestSnapshotId: latestResponse.data as string | null,
  };
}
