import Link from "next/link";
import { CircleLobbyClient } from "@/components/circle-lobby-client";
import { fetchPublicCircle } from "@/lib/repositories/circle-public-repository";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";

export default async function CircleLobbyPage({ params, searchParams }: { params: Promise<{ circleId: string }>; searchParams: Promise<{ snapshotId?: string; fromSnapshotId?: string }> }) {
  const { circleId } = await params;
  const { snapshotId, fromSnapshotId } = await searchParams;
  const lobby = await fetchPublicCircle(circleId);
  if (!lobby) return <main className="result-shell"><section className="empty-result-card"><p className="eyebrow">CIRCLE</p><h1>This Circle is not available.</h1><p>The link may be invalid or no longer exist.</p><Link className="primary-button" href="/">Back to EraPrint</Link></section></main>;
  return (
    <CircleLobbyClient
      lobby={lobby}
      returnSnapshotId={
        snapshotId && UUID_PATTERN.test(snapshotId) ? snapshotId : undefined
      }
      backSnapshotId={
        fromSnapshotId && UUID_PATTERN.test(fromSnapshotId)
          ? fromSnapshotId
          : undefined
      }
    />
  );
}
