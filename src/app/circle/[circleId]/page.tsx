import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleLobbyClient } from "@/components/circle-lobby-client";
import { fetchPublicCircle } from "@/lib/repositories/circle-public-repository";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";

export default async function CircleLobbyPage({ params, searchParams }: { params: Promise<{ circleId: string }>; searchParams: Promise<{ snapshotId?: string; fromSnapshotId?: string }> }) {
  const { circleId: rawCircleId } = await params;
  const { snapshotId, fromSnapshotId } = await searchParams;
  const circleId = rawCircleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
  if (circleId && rawCircleId !== circleId) {
    const query = new URLSearchParams();
    if (snapshotId) query.set("snapshotId", snapshotId);
    if (fromSnapshotId) query.set("fromSnapshotId", fromSnapshotId);
    redirect(`/circle/${circleId}${query.size ? `?${query.toString()}` : ""}`);
  }
  if (!circleId) return <main className="result-shell"><section className="empty-result-card"><p className="eyebrow">CIRCLE</p><h1>This Circle is not available.</h1><p>The link may be invalid or no longer exist.</p><Link className="primary-button" href="/">Back to EraPrint</Link></section></main>;
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
