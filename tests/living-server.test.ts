import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnedSnapshotContext } from "../src/lib/living/living-server";

function fakeSupabase(ownerId: string, currentUserId: string) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: currentUserId } }, error: null }),
    },
    rpc: async () => ({ data: "snapshot-1", error: null }),
    from(table: string) {
      if (table === "eraprint_snapshots") {
        const filters = new Map<string, string>();
        const query = {
          select: () => query,
          eq: (column: string, value: string) => { filters.set(column, value); return query; },
          maybeSingle: async () => ({
            data: filters.get("id") === "snapshot-1" && filters.get("profile_id") === ownerId
              ? {
                  id: "snapshot-1",
                  profile_id: ownerId,
                  previous_snapshot_id: null,
                  answer_count: 8,
                  catalog_version: "v1.0.0",
                  scoring_version: "v1.0.0",
                  primary_era_code: "RED",
                  secondary_era_code: "1989",
                  hidden_era_code: "LOVER",
                  clarity: 60,
                }
              : null,
            error: null,
          }),
        };
        return query;
      }

      const answersQuery = {
        select: () => answersQuery,
        eq: () => answersQuery,
        order: async () => ({
          data: Array.from({ length: 8 }, (_, index) => ({
            question_id: `Q${String(index + 1).padStart(2, "0")}`,
            choice_id: `Q${String(index + 1).padStart(2, "0")}_A`,
            sequence_no: index + 1,
          })),
          error: null,
        }),
      };
      return answersQuery;
    },
  } as unknown as SupabaseClient;
}

describe("Living EraPrint ownership", () => {
  it("allows the current anonymous owner to load refinement context", async () => {
    const context = await getOwnedSnapshotContext(fakeSupabase("owner-a", "owner-a"), "snapshot-1");
    expect(context.user.id).toBe("owner-a");
    expect(context.answers).toHaveLength(8);
    expect(context.isLatest).toBe(true);
  });

  it("does not expose another profile's snapshot for refinement", async () => {
    await expect(
      getOwnedSnapshotContext(fakeSupabase("owner-a", "visitor-b"), "snapshot-1"),
    ).rejects.toThrow("Snapshot not found or not owned by this session.");
  });
});
