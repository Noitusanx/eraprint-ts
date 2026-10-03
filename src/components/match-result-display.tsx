"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUBLIC_TRAITS } from "@/lib/data/public-catalog";
import { TraitScoreDisplay } from "./trait-score-display";
import {
  buildEraMatchSummary,
  matchTraitName,
} from "@/lib/match/era-match-copy";
import { EraDynamicSection } from "@/components/era-dynamic-section";
import type { PublicEraMatchResult } from "@/lib/match/types";
import { UUID_PATTERN } from "@/lib/repositories/era-match-public-repository";
import { getMatchViewerSide } from "@/lib/repositories/era-match-repository";
import {
  createShareCardFile,
  downloadShareCard,
  shareShareCard,
} from "@/lib/share/share-card-client";

export function MatchResultDisplay({
  result,
}: {
  result: PublicEraMatchResult;
}) {
  const [viewerSide, setViewerSide] = useState<"A" | "B" | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const hasProfileLinks =
    UUID_PATTERN.test(result.snapshotAId ?? "") &&
    UUID_PATTERN.test(result.snapshotBId ?? "");

  useEffect(() => {
    getMatchViewerSide(result.matchId)
      .then(setViewerSide)
      .catch(() => setViewerSide(null));
  }, [result.matchId]);

  const matchCard = () =>
    createShareCardFile(
      "/api/share-card/match",
      { kind: "match", matchId: result.matchId, viewerSide },
      "eraprint-match.png",
    );

  const copyMatchLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  };

  const withMatchCard = async (
    action: (file: File) => Promise<unknown> | unknown,
  ) => {
    setCardLoading(true);
    setCardError(null);
    try {
      await action(await matchCard());
    } catch (error) {
      setCardError(
        error instanceof Error
          ? error.message
          : "Unable to generate EraMatch card.",
      );
    } finally {
      setCardLoading(false);
    }
  };

  return (
    <main className="result-shell match-result-shell">
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <section className="result-card">
        <header className="result-topbar">
          <Link className="wordmark" href="/">
            Eraprint
          </Link>
        </header>

        <div className="reveal-block match-hero">
          <p className="eyebrow">ERAMATCH</p>
          <div className="match-score">{Math.round(result.matchScore)}%</div>
          <p className="match-score-label">PROFILE SIMILARITY</p>
          <h1>
            {result.profileA.archetype} × {result.profileB.archetype}
          </h1>
          <p className="result-summary">{buildEraMatchSummary(result)}</p>
          <div className="match-metrics">
            <span>
              Traits <strong>{Math.round(result.traitSimilarity)}%</strong>
            </span>
            <span>
              Era Blend <strong>{Math.round(result.eraSimilarity)}%</strong>
            </span>
          </div>
          <div className="match-score-explanation">
            <p>
              EraMatch combines how closely your 8 personality signals align
              with how much your 12-era blends overlap.
            </p>
            <span>70% traits · 30% Era Blend</span>
          </div>
        </div>

        <section className="result-section match-insights">
          <article>
            <p className="eyebrow">MOST IN SYNC</p>
            {result.mostInSync.map((trait) => (
              <div className="match-insight-row" key={trait.code}>
                <span>{matchTraitName(trait.code)}</span>
                <strong>{Math.round(trait.similarity)}%</strong>
              </div>
            ))}
          </article>
          <article>
            <p className="eyebrow">BIGGEST CONTRAST</p>
            <h2>{matchTraitName(result.biggestContrast.code)}</h2>
            <p>{Math.round(result.biggestContrast.difference)} points apart</p>
          </article>
          <article>
            <p className="eyebrow">SHARED ERA</p>
            <h2>{result.sharedEra.name}</h2>
            <p>
              Strongest shared Era · {result.sharedEra.strength.toFixed(1)}%
              overlap
            </p>
          </article>
        </section>

        <EraDynamicSection result={result} />

        <section className="result-section match-profile-section">
          <div className="profile-pair">
            <article>
              <span>
                {viewerSide === "A" ? "PROFILE A (YOU)" : "PROFILE A"}
              </span>
              <strong>
                {result.profileA.primaryEra.name} ×{" "}
                {result.profileA.secondaryEra.name}
              </strong>
              <p>{result.profileA.archetype}</p>
              {hasProfileLinks && viewerSide && (
                <Link
                  className="match-profile-link"
                  href={`/result/${result.snapshotAId}?fromMatch=${result.matchId}`}
                >
                  {viewerSide === "A" ? "View My Profile" : "View Profile"}
                </Link>
              )}
            </article>
            <article>
              <span>
                {viewerSide === "B" ? "PROFILE B (YOU)" : "PROFILE B"}
              </span>
              <strong>
                {result.profileB.primaryEra.name} ×{" "}
                {result.profileB.secondaryEra.name}
              </strong>
              <p>{result.profileB.archetype}</p>
              {hasProfileLinks && viewerSide && (
                <Link
                  className="match-profile-link"
                  href={`/result/${result.snapshotBId}?fromMatch=${result.matchId}`}
                >
                  {viewerSide === "B"
                    ? "View My Profile"
                    : "View Their Profile"}
                </Link>
              )}
            </article>
          </div>
        </section>

        <section className="result-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">TRAIT COMPARISON</p>
              <h2 className="">Eight signals, side by side</h2>
            </div>
          </div>
          <div
            className="match-profile-legend"
            aria-label="Trait comparison colors"
          >
            <span>
              <i className="profile-a-dot" />
              Profile A{viewerSide === "A" ? " (You)" : ""} ·{" "}
              {result.profileA.archetype}
            </span>
            <span>
              <i className="profile-b-dot" />
              Profile B{viewerSide === "B" ? " (You)" : ""} ·{" "}
              {result.profileB.archetype}
            </span>
          </div>
          <div className="match-trait-list">
            {PUBLIC_TRAITS.map((trait) => {
              const scoreA = result.profileA.traitScores[trait.code];
              const scoreB = result.profileB.traitScores[trait.code];
              return (
                <TraitScoreDisplay
                  key={trait.code}
                  trait={trait}
                  scores={[
                    { label: "Profile A", value: scoreA, tone: "profile-a" },
                    { label: "Profile B", value: scoreB, tone: "profile-b" },
                  ]}
                />
              );
            })}
          </div>
        </section>

        <section className="result-section match-era-connection-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">ERA BLEND CONNECTION</p>
              <h2>Where your era stories overlap</h2>
            </div>
          </div>
          <div className="shared-era-card">
            <strong>{result.sharedEra.name}</strong>
            <div className="shared-era-evidence">
              <div>
                <span>Profile A{viewerSide === "A" ? " (You)" : ""}</span>
                <strong>{result.sharedEra.percentageA.toFixed(1)}%</strong>
              </div>
              <div>
                <span>Profile B{viewerSide === "B" ? " (You)" : ""}</span>
                <strong>{result.sharedEra.percentageB.toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="share-panel">
          <div>
            <p className="eyebrow">SHARE ERAMATCH</p>
            <h2>Share your EraMatch.</h2>
            <p>Anyone with this link can view the result.</p>
          </div>
          <div className="share-actions match-share-actions">
            <button
              className="button-reset"
              type="button"
              disabled={cardLoading}
              onClick={() =>
                void withMatchCard((file) =>
                  shareShareCard(file),
                )
              }
            >
              {cardLoading ? "Preparing…" : "Share"}
            </button>
            <button
              className="button-reset"
              type="button"
              disabled={cardLoading}
              onClick={() => void withMatchCard(downloadShareCard)}
            >
              Download PNG
            </button>
            <button
              className="button-reset"
              type="button"
              onClick={() => void copyMatchLink()}
            >
              {linkCopied ? "Link copied" : "Copy EraMatch link"}
            </button>
          </div>
          {cardError && (
            <p className="game-error" role="alert">
              {cardError}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
