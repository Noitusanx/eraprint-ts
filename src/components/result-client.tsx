"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  persistCompletedEraPrint,
  type PersistenceStatus,
} from "@/lib/repositories/eraprint-repository";
import type { Answer, EraPrintResult } from "@/lib/scoring/types";
import { ResultDisplay } from "./result-display";
import { getPendingSocialAction } from "@/lib/social/pending-action";

const STORAGE_KEY = "eraprint:lastSession";

type StoredSession = {
  answers: Answer[];
  clientRequestId: string;
};

async function fetchEraPrint(answers: Answer[]): Promise<EraPrintResult> {
  const response = await fetch("/api/game/result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });

  const body = (await response.json()) as {
    result?: EraPrintResult;
    error?: string;
  };

  if (!response.ok || !body.result) {
    throw new Error(body.error ?? "Unable to calculate EraPrint.");
  }

  return body.result;
}

function ResultLoading() {
  return (
    <main
      className="result-shell result-loading-shell"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="result-card result-processing">
        <header className="result-topbar">
          <Link className="wordmark" href="/">
            EraPrint
          </Link>

          <span className="result-version">ERA PROFILE</span>
        </header>

        <div className="result-processing-body">
          <div className="result-processing-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <p className="eyebrow">YOUR ERAPRINT IS TAKING SHAPE</p>

          <h1>Turning your choices into your EraPrint.</h1>

          <p className="result-processing-copy">
            Scoring your signals and preparing your result.
          </p>

          <div className="result-processing-track" aria-hidden="true">
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}

export function ResultClient() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null | undefined>(
    undefined,
  );
  const [result, setResult] = useState<EraPrintResult | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<PersistenceStatus | null>(
    null,
  );

  useEffect(() => {
    const timerId = setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSession(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredSession;
        if (!Array.isArray(parsed.answers) || !parsed.clientRequestId) {
          setSession(null);
          return;
        }
        setSession(parsed);
      } catch {
        setSession(null);
      }
    }, 0);

    return () => clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    fetchEraPrint(session.answers)
      .then(async (nextResult) => {
        if (cancelled) return;

        const status = await persistCompletedEraPrint(
          session.clientRequestId,
          session.answers,
        );

        if (cancelled) return;

        if (
          status.mode === "supabase" &&
          status.persisted &&
          status.snapshotId
        ) {
          const pendingAction = getPendingSocialAction();
          if (pendingAction?.type === "match") {
            router.replace(
              `/match/${pendingAction.inviteId}?snapshotId=${status.snapshotId}`,
            );
            return;
          }
          if (pendingAction?.type === "circle") {
            router.replace(
              `/circle/${pendingAction.circleId}?snapshotId=${status.snapshotId}`,
            );
            return;
          }
          router.replace(`/result/${status.snapshotId}`);
          return;
        }

        setResult(nextResult);
        setPersistence(status);
      })
      .catch((error) => {
        if (!cancelled) {
          setResultError(
            error instanceof Error ? error.message : "Unable to load EraPrint.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, router]);

  if (session === undefined || (session && !result && !resultError)) {
    return <ResultLoading />;
  }

  if (!session) {
    return (
      <main className="result-shell">
        <section className="empty-result-card">
          <p className="eyebrow">NO ERAPRINT FOUND</p>
          <h1>Play the eight choices first.</h1>
          <p>Your result is generated from the choices you make.</p>
          <Link className="primary-button" href="/play">
            Start EraPrint
          </Link>
        </section>
      </main>
    );
  }

  if (!result || resultError) {
    return (
      <main className="result-shell">
        <section className="empty-result-card">
          <p className="eyebrow">RESULT ERROR</p>
          <h1>We couldn&apos;t open this result.</h1>
          <p>{resultError ?? "Please retake the EraPrint."}</p>
          <Link className="primary-button" href="/play">
            Retake EraPrint
          </Link>
        </section>
      </main>
    );
  }

  return (
    <ResultDisplay
      result={result}
      shareSource={{ type: "answers", answers: session.answers }}
      persistence={persistence}
    />
  );
}
