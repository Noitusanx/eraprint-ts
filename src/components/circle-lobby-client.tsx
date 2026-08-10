"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CircleParticipantState,
  PublicCircleLobby,
} from "@/lib/circle/types";
import {
  clearPendingSocialAction,
  setPendingSocialAction,
} from "@/lib/social/pending-action";
import {
  finalizeCircle,
  getCircleParticipantState,
  joinCircle,
} from "@/lib/repositories/circle-repository";

export function CircleLobbyClient({
  lobby,
  returnSnapshotId,
  backSnapshotId,
}: {
  lobby: PublicCircleLobby;
  returnSnapshotId?: string;
  backSnapshotId?: string;
}) {
  const router = useRouter();
  const [participant, setParticipant] = useState<CircleParticipantState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(Boolean(returnSnapshotId));
  const [finalizing, setFinalizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lobby.status === "FINALIZED" && lobby.resultId) {
      clearPendingSocialAction();
      router.replace(`/circle/result/${lobby.resultId}`);
      return;
    }
    if (lobby.status === "EXPIRED") {
      clearPendingSocialAction();
      return;
    }
    if (returnSnapshotId) {
      joinCircle(lobby.circleId, returnSnapshotId)
        .then(() => {
          clearPendingSocialAction();
          router.replace(`/circle/${lobby.circleId}`);
          router.refresh();
        })
        .catch((caught) => {
          setError(
            caught instanceof Error ? caught.message : "Unable to join Circle.",
          );
          setJoining(false);
        });
      return;
    }
    getCircleParticipantState(lobby.circleId)
      .then(setParticipant)
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to check Circle access.",
        ),
      )
      .finally(() => setLoading(false));
  }, [lobby.circleId, lobby.resultId, lobby.status, returnSnapshotId, router]);

  const join = async () => {
    if (!participant?.snapshotId) return;
    setJoining(true);
    setError(null);
    try {
      await joinCircle(lobby.circleId, participant.snapshotId);
      clearPendingSocialAction();
      setParticipant({ ...participant, isMember: true });
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to join Circle.",
      );
    } finally {
      setJoining(false);
    }
  };

  const reveal = async () => {
    setFinalizing(true);
    setError(null);
    try {
      const resultId = await finalizeCircle(lobby.circleId);
      router.push(`/circle/result/${resultId}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reveal Circle result.",
      );
      setFinalizing(false);
    }
  };

  const inviteFriends = async () => {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my EraPrint Circle",
          text: "Bring your EraPrint into our Circle.",
          url,
        });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const startEraPrint = () =>
    setPendingSocialAction({ type: "circle", circleId: lobby.circleId });
  const full = lobby.memberCount >= lobby.maxMembers;
  const ready = lobby.memberCount >= 3;

  return (
    <main className="result-shell circle-lobby-shell">
      <div className="ambient ambient-two" />
      <section className="result-card circle-lobby-card">
        <header className="result-topbar">
          <Link className="wordmark" href="/">
            EraPrint
          </Link>
        </header>
        <div className="circle-lobby-hero">
          <p className="eyebrow">CIRCLE</p>
          {lobby.status === "OPEN" && (
            <span className="circle-status-label">OPEN CIRCLE</span>
          )}
          <h1>Bring your EraPrints together.</h1>
          <strong>
            {lobby.memberCount} of {lobby.maxMembers} joined
          </strong>
          <p>
            {full
              ? "Your Circle is full and ready to reveal."
              : ready
                ? "Your Circle is ready to reveal."
                : `${3 - lobby.memberCount} more ${3 - lobby.memberCount === 1 ? "person" : "people"} needed to reveal the result.`}
          </p>
        </div>

        <section className="result-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">MEMBERS</p>
              <h2>The group so far</h2>
            </div>
          </div>
          <div className="circle-member-grid">
            {lobby.members.map((member, index) => (
              <article key={`${member.archetype}-${index}`}>
                <span>PROFILE {index + 1}</span>
                <strong>{member.archetype}</strong>
                <p>
                  {member.primaryEra.name} × {member.secondaryEra.name}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="circle-lobby-actions">
          {lobby.status === "EXPIRED" ? (
            <p role="alert">This Circle invite has expired.</p>
          ) : loading || joining ? (
            <p aria-live="polite">
              {joining ? "Joining Circle…" : "Checking your EraPrint…"}
            </p>
          ) : (
            <>
              {participant?.isOwner && ready && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={reveal}
                  disabled={finalizing}
                >
                  {finalizing ? "Revealing…" : "Reveal Circle Result"}
                </button>
              )}
              {participant?.isOwner && !full && (
                <button
                  className={ready ? "secondary-button" : "primary-button"}
                  type="button"
                  onClick={inviteFriends}
                >
                  {copied ? "Invite link copied" : ready ? "Invite more" : "Invite friends"}
                </button>
              )}
              {!participant?.isMember && participant?.snapshotId && !full && (
                <button className="primary-button" type="button" onClick={join}>
                  Join with my EraPrint
                </button>
              )}
              {!participant?.isMember && !participant?.snapshotId && !full && (
                <Link
                  className="primary-button"
                  href="/play"
                  onClick={startEraPrint}
                >
                  Take EraPrint to join
                </Link>
              )}
              {!participant?.isMember && full && (
                <p>This Circle already has 10 members.</p>
              )}
            </>
          )}
          {error && (
            <p className="game-error" role="alert">
              {error}
            </p>
          )}
          {backSnapshotId && (
            <Link
              className="secondary-button circle-back-action"
              href={`/result/${backSnapshotId}`}
            >
              ← Back to my EraPrint
            </Link>
          )}
        </section>
      </section>
    </main>
  );
}
