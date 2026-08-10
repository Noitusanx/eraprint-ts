import { notFound } from "next/navigation";
import { fetchSnapshotAsResult } from "@/lib/repositories/eraprint-public-repository";
import { ResultDisplay } from "@/components/result-display";
import {
  fetchPublicMatchResult,
  UUID_PATTERN,
} from "@/lib/repositories/era-match-public-repository";
import { fetchPublicCircleResult } from "@/lib/repositories/circle-public-repository";

export default async function PublicResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromMatch?: string; fromCircle?: string }>;
}) {
  const { id: snapshotId } = await params;
  const { fromMatch, fromCircle } = await searchParams;
  const result = await fetchSnapshotAsResult(snapshotId);

  if (!result) {
    notFound();
  }

  let backToCircleResultId: string | undefined;
  if (fromCircle && UUID_PATTERN.test(fromCircle)) {
    const circle = await fetchPublicCircleResult(fromCircle);
    if (circle?.members.some((member) => member.snapshotId === snapshotId)) {
      backToCircleResultId = circle.circleResultId;
    }
  }

  let backToMatchId: string | undefined;
  if (fromMatch && UUID_PATTERN.test(fromMatch)) {
    const match = await fetchPublicMatchResult(fromMatch);
    if (
      match &&
      (match.snapshotAId === snapshotId || match.snapshotBId === snapshotId)
    ) {
      backToMatchId = match.matchId;
    }
  }

  return (
    <ResultDisplay
      result={result}
      shareSource={{ type: "snapshot", snapshotId }}
      backToMatchId={backToMatchId}
      backToCircleResultId={backToCircleResultId}
    />
  );
}
