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
  getMatchInviteViewerState,
  getMyLatestSnapshotId,
  type MatchInviteViewerState,
} from "@/lib/repositories/era-match-repository";

export function MatchInviteClient({
  invite,
  returnSnapshotId,
}: {
  invite: PublicInviteState;
  returnSnapshotId?: string;
}) {
  const router = useRouter();
  const [snapshotId, setSnapshotId] = useState<string | null>(
    returnSnapshotId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(Boolean(returnSnapshotId));
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<MatchInviteViewerState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (invite.status === "EXPIRED") {
      clearPendingSocialAction();
      return;
    }

    let cancelled = false;
    getMatchInviteViewerState(invite.inviteId)
      .then(async (nextViewer) => {
        if (cancelled) return;
        setViewer(nextViewer);

        if (nextViewer.isOwner) {
          clearPendingSocialAction();
          setJoining(false);
          return;
        }

        if (invite.status === "COMPLETED" && invite.matchId) {
          clearPendingSocialAction();
          router.replace(`/match/result/${invite.matchId}`);
          return;
        }

        setPendingSocialAction({ type: "match", inviteId: invite.inviteId });
        if (returnSnapshotId) {
          const matchId = await completeMatchInvite(
            invite.inviteId,
            returnSnapshotId,
          );
          clearPendingSocialAction();
          router.replace(`/match/result/${matchId}`);
          return;
        }

        setSnapshotId(await getMyLatestSnapshotId());
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to check this EraMatch invite.",
        ),
      )
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setJoining(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invite, returnSnapshotId, router]);

  useEffect(() => {
    if (!viewer?.isOwner || invite.status !== "OPEN") return;

    const refreshInvite = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const intervalId = window.setInterval(refreshInvite, 3000);
    window.addEventListener("focus", refreshInvite);
    document.addEventListener("visibilitychange", refreshInvite);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshInvite);
      document.removeEventListener("visibilitychange", refreshInvite);
    };
  }, [invite.status, router, viewer?.isOwner]);

  const copyInvite = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const join = async () => {
    if (!snapshotId) return;
    setJoining(true);
    setError(null);
    try {
      const matchId = await completeMatchInvite(invite.inviteId, snapshotId);
      clearPendingSocialAction();
      router.replace(`/match/result/${matchId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to join this EraMatch.",
      );
      setJoining(false);
    }
  };

  return (
    <main className="result-shell">
      <div className="ambient ambient-two" />
      <section className="empty-result-card match-invite-card">
        <p className="eyebrow">ERAMATCH INVITE</p>
        <h1>
          {viewer?.isOwner
            ? invite.status === "COMPLETED"
              ? "Your EraMatch is ready."
              : "Waiting for your friend…"
            : `${invite.owner.archetype} wants to compare EraPrints.`}
        </h1>
        <p>
          {viewer?.isOwner
            ? invite.status === "COMPLETED"
              ? "Your friend has joined. See what your EraPrints share and where they differ."
              : "Your invite is ready to share. This page will update automatically when your friend joins."
            : <>Their EraPrint is {invite.owner.primaryEra.name} ×{" "}
                {invite.owner.secondaryEra.name}. Join with your EraPrint to see
                what you share and where you differ.</>}
        </p>

        {invite.status === "EXPIRED" ? (
          <div className="match-action-stack">
            <p role="alert">This EraMatch invite has expired.</p>
            <Link className="primary-button" href="/">
              Back to EraPrint
            </Link>
          </div>
        ) : loading ? (
          <div className="match-invite-loading" aria-live="polite">
            <span aria-hidden="true" />
            <p>Checking this EraMatch invite…</p>
          </div>
        ) : viewer?.isOwner ? (
          <div className="match-owner-status">
            {invite.status === "COMPLETED" && invite.matchId ? (
              <Link
                className="primary-button"
                href={`/match/result/${invite.matchId}`}
              >
                View EraMatch Result
              </Link>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={() => void copyInvite()}
              >
                {copied ? "Link copied" : "Copy invite link"}
              </button>
            )}
            {viewer.snapshotId && (
              <Link className="secondary-button" href={`/result/${viewer.snapshotId}`}>
                ← Back to My EraPrint
              </Link>
            )}
          </div>
        ) : snapshotId ? (
          <div className="match-action-stack">
            <button
              className="primary-button"
              type="button"
              onClick={join}
              disabled={joining}
            >
              {joining ? "Creating EraMatch…" : "Use my EraPrint"}
            </button>
            <Link className="secondary-button" href="/play">
              Take a new EraPrint
            </Link>
          </div>
        ) : (
          <div className="match-action-stack">
            <Link className="primary-button" href="/play">
              Take EraPrint to join
            </Link>
          </div>
        )}

        {error && (
          <p className="game-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
