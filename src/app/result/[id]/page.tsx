import { notFound } from "next/navigation";
import { fetchSnapshotAsResult } from "@/lib/repositories/eraprint-public-repository";
import { ResultDisplay } from "@/components/result-display";
import {
  fetchPublicMatchResult,
  UUID_PATTERN,
} from "@/lib/repositories/era-match-public-repository";
import {
  fetchPublicCircle,
  fetchPublicCircleResult,
} from "@/lib/repositories/circle-public-repository";

export default async function PublicResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    fromMatch?: string;
    fromCircle?: string;
    fromCircleLobby?: string;
  }>;
}) {
  const { id: snapshotId } = await params;
  const { fromMatch, fromCircle, fromCircleLobby } = await searchParams;
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

  let backToCircleLobbyId: string | undefined;
  if (fromCircleLobby && UUID_PATTERN.test(fromCircleLobby)) {
    const circle = await fetchPublicCircle(fromCircleLobby);
    if (circle) {
      backToCircleLobbyId = circle.circleId;
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
      backToCircleLobbyId={backToCircleLobbyId}
    />
  );
}
