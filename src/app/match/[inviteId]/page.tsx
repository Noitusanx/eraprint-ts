import Link from "next/link";
import { MatchInviteClient } from "@/components/match-invite-client";
import { fetchPublicMatchInvite, UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";

export default async function MatchInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteId: string }>;
  searchParams: Promise<{ snapshotId?: string }>;
}) {
  const { inviteId } = await params;
  const { snapshotId } = await searchParams;
  const invite = await fetchPublicMatchInvite(inviteId);

  if (!invite) {
    return <main className="result-shell"><section className="empty-result-card"><p className="eyebrow">ERAMATCH INVITE</p><h1>This invite is not available.</h1><p>It may be invalid or no longer exist.</p><Link className="primary-button" href="/">Back to EraPrint</Link></section></main>;
  }

  return <MatchInviteClient invite={invite} returnSnapshotId={snapshotId && UUID_PATTERN.test(snapshotId) ? snapshotId : undefined} />;
}
