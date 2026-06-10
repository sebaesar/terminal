import type { LandingSectionProps } from "./types";

export function ApproachSection({ hidden }: LandingSectionProps) {
  return (
    <section
      id="approach"
      className="landing-slide landing-section landing-approach"
      aria-labelledby="approach-title"
      hidden={hidden}
    >
      <div className="landing-statement">
        <p className="landing-kicker">Methodical execution</p>
        <h2 id="approach-title">
          I turn uncertainty into named constraints, small proofs, and owned release paths.
        </h2>
      </div>
    </section>
  );
}
