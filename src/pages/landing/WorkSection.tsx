import { caseStudies } from "./content";
import type { LandingSectionProps } from "./types";

function ArrowTitle({ before, after }: { before: string; after: string }) {
  return (
    <span className="landing-caseTitleText">
      <span>{before}</span>
      <span aria-hidden="true">{"\u2192"}</span>
      <span>{after}</span>
    </span>
  );
}

export function WorkSection({ hidden }: LandingSectionProps) {
  return (
    <section
      id="work"
      className="landing-slide landing-section landing-work"
      aria-labelledby="work-title"
      hidden={hidden}
    >
      <div className="landing-sectionInner">
        <header className="landing-sectionHeader">
          <p className="landing-kicker">Selected work</p>
          <h2 id="work-title">
            Case studies where ownership changed the outcome.
          </h2>
        </header>

        <div className="landing-caseList">
          {caseStudies.map((item) => (
            <article
              className="landing-caseStudy"
              key={`${item.before}-${item.after}`}
            >
              <h3>
                <ArrowTitle before={item.before} after={item.after} />
              </h3>
              <div className="landing-caseBody">
                <p>{item.situation}</p>
                <p>{item.outcome}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
