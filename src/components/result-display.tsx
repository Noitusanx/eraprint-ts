"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PUBLIC_TRAITS } from "@/lib/data/public-catalog";
import {
  buildClarityExplanation,
  buildResultSummary,
  buildTopEraAlignmentReasons,
  ERA_BLEND_EXPLANATION,
  getDominantTraits,
  traitDisplayDirection,
} from "@/lib/scoring/result-copy";
import type { Answer, EraPrintResult } from "@/lib/scoring/types";
import type { PersistenceStatus } from "@/lib/repositories/eraprint-repository";
import { createMatchInvite } from "@/lib/repositories/era-match-repository";
import { createCircle } from "@/lib/repositories/circle-repository";
import { LivingResultPanel } from "./living-result-panel";
import { TraitScoreDisplay } from "./trait-score-display";

export type ShareSource =
  | {
      type: "snapshot";
      snapshotId: string;
    }
  | {
      type: "answers";
      answers: Answer[];
    };

export type ResultDisplayProps = {
  result: EraPrintResult;
  shareSource: ShareSource;
  persistence?: PersistenceStatus | null; // Optional, only shown for local results
  backToMatchId?: string;
  backToCircleResultId?: string;
  backToCircleLobbyId?: string;
  pilotFeedback?: ReactNode;
};

function EraBar({
  name,
  percentage,
  emphasized = false,
}: {
  name: string;
  percentage: number;
  emphasized?: boolean;
}) {
  return (
    <div className={`era-row ${emphasized ? "era-row-emphasized" : ""}`}>
      <div className="era-row-head">
        <span>{name}</span>
        <strong>{percentage.toFixed(1)}%</strong>
      </div>
      <div className="era-track">
        <div className="era-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function ResultDisplay({
  result,
  shareSource,
  persistence,
  backToMatchId,
  backToCircleResultId,
  backToCircleLobbyId,
  pilotFeedback,
}: ResultDisplayProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [circleLoading, setCircleLoading] = useState(false);
  const [circleError, setCircleError] = useState<string | null>(null);

  const dominantTraits = useMemo(
    () => (result ? getDominantTraits(result) : []),
    [result],
  );
  const topEraReasons = useMemo(
    () => buildTopEraAlignmentReasons(result),
    [result],
  );

  const getShareUrl = () => {
    if (shareSource.type === "snapshot" && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.pathname = `/result/${shareSource.snapshotId}`;
      url.search = "";
      return url.toString();
    }
    return null;
  };

  const shareUrl = getShareUrl();

  const shareText = [
    `My EraPrint: ${result.primaryEra.name} × ${result.secondaryEra.name}`,
    result.archetype,
    `Hidden era: ${result.hiddenEra.name}`,
    `Code: ${result.fingerprintCode}`,
    shareUrl ? shareUrl : "",
  ]
    .filter(Boolean)
    .join("\n");

  const copyResult = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const createShareCardFile = async () => {
    const payload =
      shareSource.type === "snapshot"
        ? { snapshotId: shareSource.snapshotId }
        : { answers: shareSource.answers };

    const response = await fetch("/api/share-card", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json()) as {
        error?: string;
      };

      throw new Error(body.error ?? "Unable to generate share card.");
    }

    const blob = await response.blob();

    return new File([blob], `eraprint-${result.fingerprintCode}.png`, {
      type: "image/png",
    });
  };

  const downloadCardFile = (file: File) => {
    const url = URL.createObjectURL(file);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const downloadCard = async () => {
    try {
      setCardLoading(true);
      setCardError(null);

      const file = await createShareCardFile();

      downloadCardFile(file);
    } catch (error) {
      setCardError(
        error instanceof Error ? error.message : "Unable to download card.",
      );
    } finally {
      setCardLoading(false);
    }
  };

  const shareCard = async () => {
    try {
      setCardLoading(true);
      setCardError(null);

      const file = await createShareCardFile();

      const canShareFile =
        typeof navigator.share === "function" &&
        navigator.canShare?.({
          files: [file],
        });

      if (canShareFile) {
        await navigator.share({
          title: "My EraPrint",
          text: shareText,
          files: [file],
        });

        return;
      }

      // Desktop/browser yang tidak mendukung share file:
      // otomatis download PNG.
      downloadCardFile(file);
    } catch (error) {
      // User menutup native share dialog bukan error sebenarnya.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setCardError(
        error instanceof Error
          ? error.message
          : "Unable to share EraPrint card.",
      );
    } finally {
      setCardLoading(false);
    }
  };

  const compareWithFriend = async () => {
    if (shareSource.type !== "snapshot") return;
    setInviteLoading(true);
    setCardError(null);
    try {
      const inviteId = await createMatchInvite(shareSource.snapshotId);
      const nextUrl = new URL(
        `/match/${inviteId}`,
        window.location.origin,
      ).toString();
      setInviteUrl(nextUrl);
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Compare EraPrints with me",
            text: "Join my EraMatch invite and compare our EraPrint profiles.",
            url: nextUrl,
          });
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError"))
            throw error;
        }
      }
    } catch (error) {
      setCardError(
        error instanceof Error
          ? error.message
          : "Unable to create EraMatch invite.",
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1500);
  };

  const createNewCircle = async () => {
    if (shareSource.type !== "snapshot") return;
    setCircleLoading(true);
    setCircleError(null);
    try {
      const circleId = await createCircle(shareSource.snapshotId);
      router.push(
        `/circle/${circleId}?fromSnapshotId=${shareSource.snapshotId}`,
      );
    } catch (error) {
      setCircleError(
        error instanceof Error ? error.message : "Unable to create Circle.",
      );
      setCircleLoading(false);
    }
  };

  return (
    <main
      className={`result-shell ${
        shareSource.type === "snapshot" ? "persisted-result" : ""
      }`}
    >
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="result-card">
        <header className="result-topbar">
          <Link className="wordmark" href="/">
            EraPrint
          </Link>
        </header>

        <div className="reveal-block">
          <p className="eyebrow">WE FOUND YOUR ERAPRINT</p>
          <h1>{result.archetype}</h1>
          <p className="result-summary">{buildResultSummary(result)}</p>

          <div className="era-trio">
            <article>
              <span>Primary</span>
              <strong>{result.primaryEra.name}</strong>
              <em>{result.primaryEra.percentage.toFixed(1)}%</em>
            </article>
            <article>
              <span>Secondary</span>
              <strong>{result.secondaryEra.name}</strong>
              <em>{result.secondaryEra.percentage.toFixed(1)}%</em>
            </article>
            <article>
              <span>Hidden</span>
              <strong>{result.hiddenEra.name}</strong>
              <em>{result.hiddenEra.percentage.toFixed(1)}%</em>
            </article>
          </div>

          <div className="identity-code">
            <span>Your EraPrint fingerprint</span>
            <code>{result.fingerprintCode}</code>
            <p className="microcopy">
              This code belongs to this result only. If you retake EraPrint, you
              may get a different code.
            </p>
          </div>
        </div>

        <section className="result-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LIVING PROFILE</p>
              <h2>Your strongest signals</h2>
            </div>
          </div>

          <details className="trait-glossary result-disclosure signal-builder-explainer">
            <summary>HOW YOUR SIGNALS ARE BUILT</summary>
            <div className="result-disclosure-copy">
              <p>
                Your choices each leave small signals across different traits.
                When several of your choices point in the same direction, that
                trait moves farther from the middle.
              </p>
            </div>
          </details>

          <div className="dominant-grid">
            {dominantTraits.map((trait) => (
              <article key={trait.code} className="dominant-card">
                <TraitScoreDisplay
                  trait={trait}
                  scores={[{ value: trait.score }]}
                  showPoles={false}
                />
                <p>{traitDisplayDirection(trait.code, trait.score)}</p>
              </article>
            ))}
          </div>

          <div className="signal-subsection clarity-subsection">
            <div className="section-heading compact clarity-heading">
              <div>
                <p className="eyebrow">CLARITY</p>
                <h2>How clearly your pattern formed</h2>
              </div>
              <div
                className="clarity-ring"
                aria-label={`EraPrint clarity ${result.clarity}%`}
              >
                <strong>{Math.round(result.clarity)}%</strong>
                <span>clarity</span>
              </div>
            </div>
            <details className="trait-glossary result-disclosure clarity-explainer">
              <summary>WHAT CLARITY MEANS</summary>
              <div className="result-disclosure-copy">
                <p>{buildClarityExplanation(result)}</p>
              </div>
            </details>
          </div>

          <div className="signal-subsection all-signals-subsection">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">ALL 8 SIGNALS</p>
                <h2>Your complete signal breakdown</h2>
              </div>
            </div>
            <p className="circle-trait-scale-explain">
              Around 50 is more balanced, farther from 50 shows a clearer lean.
            </p>
            <div className="circle-trait-list result-trait-list">
              {PUBLIC_TRAITS.map((trait) => (
                <div className="trait-result-row" key={trait.code}>
                  <TraitScoreDisplay
                    trait={trait}
                    scores={[{ value: result.traitScores[trait.code].score }]}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="result-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">ERA BLEND</p>
              <h2>How the 12 profiles matched</h2>
            </div>
          </div>

          <aside className="result-explainer era-blend-explainer">
            <strong>How Era Blend is calculated</strong>
            <p>{ERA_BLEND_EXPLANATION}</p>
          </aside>

          <div className="era-reason-grid">
            {topEraReasons.map(({ era, reason }, index) => (
              <article key={era.code}>
                <span>#{index + 1} why it matches</span>
                <strong>{era.name}</strong>
                <p>{reason}</p>
              </article>
            ))}
          </div>

          <div className="era-list">
            {result.eraBlend.map((era, index) => (
              <EraBar
                key={era.code}
                name={era.name}
                percentage={era.percentage}
                emphasized={index < 3}
              />
            ))}
          </div>
          <p className="fine-print">
            Era percentages show how closely each Era matches your answers.
          </p>
        </section>

        {shareSource.type === "snapshot" && (
          <LivingResultPanel
            snapshotId={shareSource.snapshotId}
            result={result}
          />
        )}

        {pilotFeedback}

        {!pilotFeedback && <section className="share-panel">
          <div>
            <p className="eyebrow">SHARE YOUR ERAPRINT</p>

            <h2>Made for sharing.</h2>

            <p>Save your EraPrint card or share it straight to your story.</p>

            {cardError && <p role="alert">{cardError}</p>}
          </div>

          <div className="share-actions">
            <button
              className="button-reset"
              type="button"
              onClick={shareCard}
              disabled={cardLoading}
            >
              Share card
            </button>

            <button
              className="button-reset"
              type="button"
              onClick={downloadCard}
              disabled={cardLoading}
            >
              Download PNG
            </button>

            <button className="button-reset" type="button" onClick={copyResult}>
              {copied ? "Result copied" : "Copy result text"}
            </button>
          </div>
        </section>}

        {shareSource.type === "snapshot" && (
          <section className="explore-together">
            <header className="explore-heading">
              <p className="eyebrow">EXPLORE TOGETHER</p>
              <h2>See what happens when EraPrints meet.</h2>
              <p>Compare one-on-one or bring the whole group into the story.</p>
            </header>

            <div className="explore-options">
              <article className="explore-option">
                <p className="eyebrow">ERAMATCH</p>
                <h3>Compare with one friend</h3>
                <p>See where your profiles align, contrast, and connect.</p>
                <div className="match-action-stack">
                  {backToMatchId && (
                    <Link
                      className="secondary-button match-return-button"
                      href={`/match/result/${backToMatchId}`}
                    >
                      ← Back to Match Result
                    </Link>
                  )}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={compareWithFriend}
                    disabled={inviteLoading}
                  >
                    {inviteLoading
                      ? "Creating invite…"
                      : inviteUrl
                        ? "Create another invite"
                        : "Compare with a friend"}
                  </button>
                  {inviteUrl && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={copyInvite}
                    >
                      {inviteCopied ? "Invite link copied" : "Copy invite link"}
                    </button>
                  )}
                </div>
              </article>

              <article className="explore-option">
                <p className="eyebrow">CIRCLE</p>
                <h3>Bring the group together</h3>
                <p>
                  Combine 3–10 EraPrints and discover what your group has in
                  common.
                </p>
                {circleError && (
                  <p className="game-error" role="alert">
                    {circleError}
                  </p>
                )}
                <div className="match-action-stack">
                  {backToCircleResultId && (
                    <Link
                      className="secondary-button match-return-button"
                      href={`/circle/result/${backToCircleResultId}`}
                    >
                      ← Back to Circle Result
                    </Link>
                  )}
                  {backToCircleLobbyId && !backToCircleResultId && (
                    <Link
                      className="secondary-button match-return-button"
                      href={`/circle/${backToCircleLobbyId}?fromSnapshotId=${shareSource.snapshotId}`}
                    >
                      ← Back to Circle
                    </Link>
                  )}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={createNewCircle}
                    disabled={circleLoading}
                  >
                    {circleLoading ? "Creating Circle…" : "Create a Circle"}
                  </button>
                </div>
              </article>
            </div>
          </section>
        )}

        {!pilotFeedback && <footer className="result-footer">
          {persistence !== undefined && (
            <div>
              <strong>Your result</strong>
              <span>
                {!persistence
                  ? "Checking…"
                  : persistence.mode === "demo"
                    ? "Available in this browser for now"
                    : persistence.persisted
                      ? "Saved"
                      : "error" in persistence
                        ? `We couldn't save this result: ${persistence.error}`
                        : "This result wasn't saved"}
              </span>
            </div>
          )}
          <Link className="text-link" href="/play">
            Retake EraPrint →
          </Link>
        </footer>}
      </section>
    </main>
  );
}
