import Link from "next/link";
import { MatchResultDisplay } from "@/components/match-result-display";
import { fetchPublicMatchResult } from "@/lib/repositories/era-match-public-repository";

export default async function MatchResultPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const result = await fetchPublicMatchResult(matchId);

  if (!result) {
    return <main className="result-shell"><section className="empty-result-card"><p className="eyebrow">ERAMATCH RESULT</p><h1>This match result is not available.</h1><p>Check the link and try again.</p><Link className="primary-button" href="/">Back to EraPrint</Link></section></main>;
  }

  return <MatchResultDisplay result={result} />;
}
