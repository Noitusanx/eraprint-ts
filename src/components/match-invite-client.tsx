"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicInviteState } from "@/lib/match/types";
import {
  clearPendingSocialAction,
  setPendingSocialAction,
} from "@/lib/social/pending-action";
import {
  completeMatchInvite,
  getMyLatestSnapshotId,
} from "@/lib/repositories/era-match-repository";

export function MatchInviteClient({
  invite,
  returnSnapshotId,
}: {
  invite: PublicInviteState;
  returnSnapshotId?: string;
}) {
  const router = useRouter();
  const [snapshotId, setSnapshotId] = useState<string | null>(returnSnapshotId ?? null);
  const [loading, setLoading] = useState(!returnSnapshotId);
  const [joining, setJoining] = useState(Boolean(returnSnapshotId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPendingSocialAction({ type: "match", inviteId: invite.inviteId });

    if (invite.status === "COMPLETED" && invite.matchId) {
      clearPendingSocialAction();
      router.replace(`/match/result/${invite.matchId}`);
      return;
    }

    if (invite.status === "EXPIRED") {
      clearPendingSocialAction();
      return;
    }

    if (returnSnapshotId) {
      completeMatchInvite(invite.inviteId, returnSnapshotId)
        .then((matchId) => {
          clearPendingSocialAction();
          router.replace(`/match/result/${matchId}`);
        })
        .catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Unable to join this EraMatch.");
          setJoining(false);
        });
      return;
    }

    getMyLatestSnapshotId()
      .then(setSnapshotId)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to check your EraPrint."))
      .finally(() => setLoading(false));
  }, [invite, returnSnapshotId, router]);

  const join = async () => {
    if (!snapshotId) return;
    setJoining(true);
    setError(null);
    try {
      const matchId = await completeMatchInvite(invite.inviteId, snapshotId);
      clearPendingSocialAction();
      router.replace(`/match/result/${matchId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to join this EraMatch.");
      setJoining(false);
    }
  };

  return (
    <main className="result-shell">
      <div className="ambient ambient-two" />
      <section className="empty-result-card match-invite-card">
        <p className="eyebrow">ERAMATCH INVITE</p>
        <h1>{invite.owner.archetype} wants to compare EraPrints.</h1>
        <p>
          Their profile begins with {invite.owner.primaryEra.name} × {invite.owner.secondaryEra.name}.
          Join with your EraPrint to see how your profiles compare.
        </p>

        {invite.status === "EXPIRED" ? (
          <div className="match-action-stack">
            <p role="alert">This EraMatch invite has expired.</p>
            <Link className="primary-button" href="/">Back to EraPrint</Link>
          </div>
        ) : loading ? (
          <p aria-live="polite">Checking for your EraPrint…</p>
        ) : snapshotId ? (
          <div className="match-action-stack">
            <button className="primary-button" type="button" onClick={join} disabled={joining}>
              {joining ? "Creating EraMatch…" : "Use my EraPrint"}
            </button>
            <Link className="secondary-button" href="/play">Take a new EraPrint</Link>
          </div>
        ) : (
          <div className="match-action-stack">
            <Link className="primary-button" href="/play">Take EraPrint to join</Link>
          </div>
        )}

        {error && <p className="game-error" role="alert">{error}</p>}
        <p className="fine-print">EraMatch is just for fun. It isn&apos;t a measure of compatibility.</p>
      </section>
    </main>
  );
}
