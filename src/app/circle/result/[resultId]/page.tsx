import Link from "next/link";
import { CircleResultDisplay } from "@/components/circle-result-display";
import { fetchPublicCircleResult } from "@/lib/repositories/circle-public-repository";

export default async function CircleResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await params;
  const result = await fetchPublicCircleResult(resultId);
  if (!result) return <main className="result-shell"><section className="empty-result-card"><p className="eyebrow">CIRCLE RESULT</p><h1>This Circle result is not available.</h1><p>Check the link and try again.</p><Link className="primary-button" href="/">Back to EraPrint</Link></section></main>;
  return <CircleResultDisplay result={result} />;
}
