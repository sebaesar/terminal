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
        <p className="landing-kicker">Execution ownership</p>
        <h2 id="approach-title">
          I step in as the person responsible for execution.
        </h2>
      </div>
    </section>
  );
}
