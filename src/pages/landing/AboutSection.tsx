import { ownershipPrinciples } from "./content";
import type { LandingSectionProps } from "./types";

export function AboutSection({ hidden }: LandingSectionProps) {
  return (
    <section
      id="about"
      className="landing-slide landing-section landing-about"
      aria-labelledby="about-title"
      hidden={hidden}
    >
      <div className="landing-sectionInner landing-aboutGrid">
        <div>
          <p className="landing-kicker">Quiet credibility</p>
          <h2 id="about-title">I work where delivery risk is the problem.</h2>
        </div>
        <div
          className="landing-principles"
          aria-label="How execution is owned"
        >
          {ownershipPrinciples.map((item) => (
            <section key={item.title} className="landing-principle">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
