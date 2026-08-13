import type { PUBLIC_TRAITS } from "@/lib/data/public-catalog";

type PublicTrait = (typeof PUBLIC_TRAITS)[number];

type TraitScore = {
  label?: string;
  value: number;
  tone?: "default" | "profile-a" | "profile-b";
};

export function TraitScoreDisplay({
  trait,
  scores,
  showPoles = true,
}: {
  trait: PublicTrait;
  scores: [TraitScore] | [TraitScore, TraitScore];
  showPoles?: boolean;
}) {
  const comparison = scores.length > 1;

  return (
    <div
      className={`trait-score-display ${comparison ? "trait-score-comparison" : ""}`}
    >
      <div className="trait-score-heading">
        <span>{trait.name}</span>
        {!comparison && <strong>{Math.round(scores[0].value)}</strong>}
      </div>
      {showPoles && (
        <div className="trait-score-poles">
          <span className="trait-low">{trait.lowLabel}</span>
          <span className="trait-high">{trait.highLabel}</span>
        </div>
      )}
      <div className="trait-score-bars">
        {scores.map((score, index) => (
          <div className="trait-score-entry" key={score.label ?? index}>
            {comparison && (
              <div className="trait-score-profile">
                <span>{score.label}</span>
                <strong>{Math.round(score.value)}</strong>
              </div>
            )}
            <div className="trait-track">
              <div
                className={`trait-fill trait-fill-${score.tone ?? "default"}`}
                style={{ width: `${score.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
