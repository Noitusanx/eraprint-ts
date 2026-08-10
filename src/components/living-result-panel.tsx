"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PUBLIC_TRAITS } from "@/lib/data/public-catalog";
import { fetchLivingState, type LivingState } from "@/lib/repositories/living-eraprint-repository";
import type { EraPrintResult, TraitCode } from "@/lib/scoring/types";

export function LivingResultPanel({ snapshotId, result }: { snapshotId: string; result: EraPrintResult }) {
  const [state, setState] = useState<LivingState | null>(null);

  useEffect(() => {
    fetchLivingState(snapshotId).then(setState).catch(() => setState(null));
  }, [snapshotId]);

  const changes = useMemo(() => {
    if (!state?.previous) return [];
    const previous = new Map(state.previous.traits.map((trait) => [trait.trait_code, Number(trait.score)]));
    return PUBLIC_TRAITS.flatMap((trait) => {
      const before = previous.get(trait.code);
      const after = result.traitScores[trait.code as TraitCode].score;
      return before !== undefined && Math.abs(after - before) >= 3
        ? [{ label: trait.name, before: Math.round(before), after: Math.round(after) }]
        : [];
    }).slice(0, 3);
  }, [state, result]);

  if (!state) return null;
  const eraChanged = state.previous && state.previous.primary_era_code !== result.primaryEra.code;
  const previousPrimaryName = state.previous
    ? result.eraBlend.find((era) => era.code === state.previous!.primary_era_code)?.name
      ?? state.previous.primary_era_code.replaceAll("_", " ")
    : "";
  const clarityChanged = state.previous && Math.abs(result.clarity - Number(state.previous.clarity)) >= 3;

  return (
    <>
      {state.previous && (
        <section className="living-change-panel">
          <div className="living-change-heading">
            <p className="eyebrow">WHAT CHANGED</p>
            <h2>
              {changes.length || eraChanged || clarityChanged
                ? "Your EraPrint shifted."
                : "Your EraPrint stayed remarkably steady."}
            </h2>
          </div>

          {eraChanged && (
            <div className="era-transition" aria-label={`Primary Era changed from ${previousPrimaryName} to ${result.primaryEra.name}`}>
              <div>
                <span>Previous</span>
                <strong>{previousPrimaryName}</strong>
              </div>
              <span className="era-transition-arrow" aria-hidden="true">→</span>
              <div>
                <span>Now</span>
                <strong>{result.primaryEra.name}</strong>
              </div>
            </div>
          )}

          {(changes.length > 0 || clarityChanged) && (
            <div className="signal-movements">
              {changes.map((change) => (
                <div className="signal-movement" key={change.label}>
                  <span>{change.label}</span>
                  <div>
                    <strong>{change.before}</strong>
                    <span className="movement-line" aria-hidden="true" />
                    <strong>{change.after}</strong>
                  </div>
                </div>
              ))}
              {clarityChanged && (
                <div className="clarity-movement">
                  <span>Clarity</span>
                  <strong>
                    {Math.round(Number(state.previous.clarity))}% <i>→</i>{" "}
                    {Math.round(result.clarity)}%
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      <section className="living-refine-panel">
        <div>
          <p className="eyebrow">LIVING ERAPRINT</p>
          <h2>Your EraPrint doesn&apos;t have to stop here.</h2>
          <p className="living-answer-count">
            You&apos;ve answered {state.answerCount} choices.
          </p>
          {state.remainingCount >= 3 ? (
            <p>Three more can give your profile more to work with.</p>
          ) : state.remainingCount === 0 ? (
            <p>You&apos;ve answered every question available right now.</p>
          ) : (
            <p>There aren&apos;t enough new questions left for another round.</p>
          )}
        </div>
        {state.canRefine && <Link className="secondary-button" href={`/refine/${snapshotId}`}>Refine my EraPrint</Link>}
        {!state.isLatest && <small>Continue from your latest EraPrint result.</small>}
      </section>
    </>
  );
}
