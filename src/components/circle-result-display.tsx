"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PUBLIC_TRAITS } from "@/lib/data/public-catalog";
import { buildCircleSummary } from "@/lib/circle/circle-copy";
import type { PublicCircleResult } from "@/lib/circle/types";
import { matchTraitName } from "@/lib/match/era-match-copy";
import { traitDisplayDirection } from "@/lib/scoring/result-copy";
import { getCircleResultViewerState } from "@/lib/repositories/circle-repository";
import { TraitScoreDisplay } from "./trait-score-display";

export function CircleResultDisplay({
  result,
}: {
  result: PublicCircleResult;
}) {
  const [copied, setCopied] = useState(false);
  const [viewerMemberIndex, setViewerMemberIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    getCircleResultViewerState(result.circleResultId).then((viewer) =>
      setViewerMemberIndex(viewer.memberIndex),
    );
  }, [result.circleResultId]);
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Our EraPrint Circle",
          text: `${result.memberCount} EraPrints: ${result.primaryEra.name} × ${result.secondaryEra.name}`,
          url: window.location.href,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    await copy();
  };

  return (
    <main className="result-shell circle-result-shell">
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <section className="result-card">
        <header className="result-topbar">
          <Link className="wordmark" href="/">
            EraPrint
          </Link>
        </header>
        <div className="reveal-block circle-result-hero">
          <p className="eyebrow">CIRCLE RESULT</p>
          <h1>
            {result.primaryEra.name} × {result.secondaryEra.name}
          </h1>
          <p className="result-summary">{buildCircleSummary(result)}</p>
          <div className="era-trio circle-era-trio">
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
        </div>

        <section className="result-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">THE CIRCLE&apos;S STRONGEST SIGNALS</p>
              <h2>What stands out together</h2>
            </div>
          </div>
          <p className="circle-explain">
            These are the signals that stand out most across the Circle.
          </p>
          <div className="dominant-grid">
            {result.strongestSignals.map((trait) => {
              const definition = PUBLIC_TRAITS.find(
                (item) => item.code === trait.code,
              )!;
              return (
                <article className="dominant-card" key={trait.code}>
                  <TraitScoreDisplay
                    trait={definition}
                    scores={[{ value: trait.score }]}
                    showPoles={false}
                  />
                  <p>{traitDisplayDirection(trait.code, trait.score)}</p>
                </article>
              );
            })}
          </div>
          <p className="circle-trait-scale-explain">
            These scores show the Circle&apos;s average. Around 50 is more
            balanced, farther from 50 shows a clearer lean.
          </p>
          <div className="circle-trait-list">
            {PUBLIC_TRAITS.map((definition) => {
              const trait = result.traits.find(
                (item) => item.code === definition.code,
              )!;
              return (
                <TraitScoreDisplay
                  key={definition.code}
                  trait={definition}
                  scores={[{ value: trait.score }]}
                />
              );
            })}
          </div>
        </section>

        <section className="result-section circle-insight-pair">
          <article>
            <p className="eyebrow">CLOSEST TOGETHER</p>
            <h2>{matchTraitName(result.mostUnitedTrait.code)}</h2>
            <p>Members are most similar to one another on this signal.</p>
          </article>
          <article>
            <p className="eyebrow">MOST VARIED</p>
            <h2>{matchTraitName(result.mostDifferentTrait.code)}</h2>
            <p>This is where members differ most from one another.</p>
          </article>
        </section>

        <section className="result-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">THE CIRCLE&apos;S ERA BLEND</p>
              <h2>Where the group lands across all 12 Eras</h2>
            </div>
          </div>
          <p className="circle-explain">
            Each member&apos;s Era Blend contributes to the Circle&apos;s
            overall blend.
          </p>
          <div className="era-list">
            {result.eraBlend.map((era, index) => (
              <div
                className={`era-row ${index < 3 ? "era-row-emphasized" : ""}`}
                key={era.code}
              >
                <div className="era-row-head">
                  <span>{era.name}</span>
                  <strong>{era.percentage.toFixed(1)}%</strong>
                </div>
                <div className="era-track">
                  <div
                    className="era-fill"
                    style={{ width: `${era.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="result-section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">MEMBERS</p>
              <h2>Meet the Circle</h2>
            </div>
          </div>
          <div className="circle-result-members">
            {result.members.map((member, index) => {
              const memberIndex = index + 1;
              const isViewer = viewerMemberIndex === memberIndex;
              const isCreator = result.creatorMemberIndex === memberIndex;
              const badge = isViewer
                ? isCreator
                  ? "YOU · CREATOR"
                  : "YOU"
                : isCreator
                  ? "CREATOR"
                  : null;

              return (
                <article
                  className={isViewer ? "circle-member-is-viewer" : undefined}
                  key={member.snapshotId}
                >
                  <div className="circle-member-label">
                    <span>
                      {member.displayName || `PROFILE ${memberIndex}`}
                    </span>
                    {badge && <b>{badge}</b>}
                  </div>
                  <strong>{member.archetype}</strong>
                  <p>
                    {member.primaryEra.name} × {member.secondaryEra.name}
                  </p>
                  <Link
                    href={`/result/${member.snapshotId}?fromCircle=${result.circleResultId}`}
                  >
                    View profile
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="share-panel">
          <div>
            <p className="eyebrow">SHARE YOUR CIRCLE</p>
            <h2>Share this Circle result.</h2>
          </div>
          <div className="share-actions circle-share-actions">
            <button className="button-reset" type="button" onClick={share}>
              Share Circle
            </button>
            <button className="button-reset" type="button" onClick={copy}>
              {copied ? "Link copied" : "Copy Circle Link"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
