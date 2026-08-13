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
  setCircleMemberDisplayName,
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
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

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
      .then((state) => {
        setParticipant(state);
        setDisplayName(state.displayName ?? "");
      })
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
      const memberCount = await joinCircle(lobby.circleId, participant.snapshotId);
      clearPendingSocialAction();
      setParticipant({
        ...participant,
        isMember: true,
        memberIndex: memberCount,
        displayName: null,
      });
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
          url,
        });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const saveDisplayName = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingName(true);
    setNameError(null);
    try {
      const savedName = await setCircleMemberDisplayName(
        lobby.circleId,
        displayName,
      );
      setDisplayName(savedName ?? "");
      setParticipant((current) =>
        current ? { ...current, displayName: savedName } : current,
      );
      setEditingName(false);
      router.refresh();
    } catch (caught) {
      setNameError(
        caught instanceof Error ? caught.message : "Unable to save your name.",
      );
    } finally {
      setSavingName(false);
    }
  };

  const startEraPrint = () =>
    setPendingSocialAction({ type: "circle", circleId: lobby.circleId });
  const full = lobby.memberCount >= lobby.maxMembers;
  const ready = lobby.memberCount >= 3;
  const isOwner = participant?.isOwner === true;
  const isJoinedMember = participant?.isMember === true && !isOwner;
  const mySnapshotId = backSnapshotId ?? participant?.snapshotId;

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
              ? `${isOwner ? "Your" : "This"} Circle is full and ready to reveal.`
              : ready
                ? `${isOwner ? "Your" : "This"} Circle is ready to reveal.`
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
            {lobby.members.map((member, index) => {
              const memberIndex = index + 1;
              const isViewer = participant?.memberIndex === memberIndex;
              const isCreator =
                (lobby.creatorMemberIndex ?? 1) === memberIndex;
              const badge = isViewer
                ? isCreator
                  ? "YOU · CREATOR"
                  : "YOU"
                : isCreator
                  ? "CREATOR"
                  : null;
              const shownName = isViewer
                ? participant?.displayName
                : member.displayName;

              return (
                <article
                  className={isViewer ? "circle-member-is-viewer" : undefined}
                  key={`${member.archetype}-${index}`}
                >
                  <div className="circle-member-label">
                    <span>
                      {isViewer && editingName
                        ? "YOUR NAME"
                        : shownName || `PROFILE ${memberIndex}`}
                    </span>
                    {badge && <b>{badge}</b>}
                  </div>

                  {isViewer && editingName && (
                    <form
                      className="circle-name-editor"
                      onSubmit={saveDisplayName}
                    >
                      <input
                        aria-label="Your name in this Circle"
                        autoFocus
                        maxLength={32}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder={`Profile ${memberIndex}`}
                        type="text"
                        value={displayName}
                      />
                      <div className="circle-name-editor-actions">
                        <button disabled={savingName} type="submit">
                          {savingName ? "Saving…" : "Save"}
                        </button>
                        <button
                          disabled={savingName}
                          onClick={() => {
                            setDisplayName(participant.displayName ?? "");
                            setNameError(null);
                            setEditingName(false);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                      {nameError && (
                        <p className="circle-name-error" role="alert">
                          {nameError}
                        </p>
                      )}
                    </form>
                  )}

                  <strong>{member.archetype}</strong>
                  <p>
                    {member.primaryEra.name} × {member.secondaryEra.name}
                  </p>

                  {isViewer && !editingName && lobby.status === "OPEN" && (
                    <button
                      className="circle-name-action"
                      onClick={() => {
                        setDisplayName(participant.displayName ?? "");
                        setNameError(null);
                        setEditingName(true);
                      }}
                      type="button"
                    >
                      {participant.displayName ? "Edit name" : "Add name"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="circle-lobby-actions">
          {lobby.status === "EXPIRED" ? (
            <p role="alert">This Circle invite has expired.</p>
          ) : joining ? (
            <p aria-live="polite">Joining Circle…</p>
          ) : loading ? (
            <p aria-live="polite">
              Checking your EraPrint…
            </p>
          ) : (
            <>
              {isOwner && ready && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={reveal}
                  disabled={finalizing}
                >
                  {finalizing ? "Revealing…" : "Reveal Circle Result"}
                </button>
              )}
              {isOwner && !full && (
                <button
                  className={ready ? "secondary-button" : "primary-button"}
                  type="button"
                  onClick={inviteFriends}
                >
                  {copied
                    ? "Invite link copied"
                    : ready
                      ? "Invite more"
                      : "Invite friends"}
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
              {isJoinedMember && (
                <div className="circle-joined-state">
                  <strong>You&apos;re in the Circle.</strong>
                  <p>Waiting for the creator to reveal the result.</p>
                </div>
              )}
            </>
          )}
          {error && (
            <p className="game-error" role="alert">
              {error}
            </p>
          )}
          {participant?.isMember && mySnapshotId && (
            <Link
              className="circle-back-action"
              href={`/result/${mySnapshotId}?fromCircleLobby=${lobby.circleId}`}
            >
              ← Back to my EraPrint
            </Link>
          )}
        </section>
      </section>
    </main>
  );
}
