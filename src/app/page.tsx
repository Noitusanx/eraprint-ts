import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="landing-card">
        <div className="brand-row">
          <span className="brand-mark">13</span>
          <span className="brand-name">EraPrint</span>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">YOUR ERAPRINT STARTS HERE</p>
          <h1>
            There are millions of fans.
            <br />
            Your EraPrint is still yours.
          </h1>
          <p className="hero-subtitle">
            Make <span className="hero-thirteen">13</span> choices and see what
            your EraPrint looks like.
          </p>
        </div>

        <div className="landing-actions">
          <Link className="primary-button" href="/play">
            Discover my EraPrint
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="feature-strip"></div>
      </section>
    </main>
  );
}
