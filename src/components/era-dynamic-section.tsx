import { buildEraDynamic } from "../lib/match/era-dynamic";
import type { PublicEraMatchResult } from "../lib/match/types";

export function EraDynamicSection({ result }: { result: PublicEraMatchResult }) {
  const dynamic = buildEraDynamic(result);

  return (
    <section className="result-section era-dynamic-section">
      <div className="era-dynamic-heading">
        <p className="eyebrow">YOUR ERA DYNAMIC</p>
        <h2>
          <span>{dynamic.eraA}</span>
          <i aria-hidden="true">×</i>
          <span>{dynamic.eraB}</span>
        </h2>
        <div className="era-dynamic-copy">
          <p>{dynamic.sharedCopy} {dynamic.contrastCopy}</p>
        </div>
        <p className="era-dynamic-summary">
          <span><b>Shared:</b> {dynamic.shared.name}</span>
          <span><b>Contrast:</b> {dynamic.contrast.name}</span>
        </p>
      </div>
    </section>
  );
}
