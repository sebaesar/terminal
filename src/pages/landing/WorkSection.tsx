import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { caseStudies } from "./content";
import type { LandingSectionProps } from "./types";
import type { WorkNavigationDirection } from "./workNavigation";

type WorkSectionProps = LandingSectionProps & {
  activeCaseStudyIndex: number;
  navigationDirection: WorkNavigationDirection;
};

function ArrowTitle({ before, after }: { before: string; after: string }) {
  return (
    <span className="landing-caseTitleText">
      <span>{before}</span>
      <span aria-hidden="true">{"\u2192"}</span>
      <span>{after}</span>
    </span>
  );
}

export function WorkSection({
  activeCaseStudyIndex,
  hidden,
  navigationDirection,
}: WorkSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const activeCaseStudy = caseStudies[activeCaseStudyIndex] ?? caseStudies[0];
  const activeProgressIndex = activeCaseStudy
    ? caseStudies.indexOf(activeCaseStudy)
    : -1;
  const activeProgressLabel =
    activeProgressIndex >= 0
      ? `Case study ${activeProgressIndex + 1} of ${caseStudies.length}`
      : "No case studies available";

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

        <div className="landing-caseList" aria-live="polite">
          {caseStudies.length > 0 ? (
            <div className="landing-caseProgress">
              <span className="landing-srOnly">{activeProgressLabel}</span>
              <div className="landing-caseProgressTrack" aria-hidden="true">
                {caseStudies.map((caseStudy, index) => (
                  <span
                    className="landing-caseProgressDot"
                    data-active={
                      index === activeProgressIndex ? "true" : undefined
                    }
                    key={`${caseStudy.before}-${caseStudy.after}`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {activeCaseStudy ? (
            <AnimatePresence initial={false} mode="wait">
              <motion.article
                className="landing-caseStudy"
                key={`${activeCaseStudy.before}-${activeCaseStudy.after}`}
                initial={{
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : 14 * navigationDirection,
                }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : -10 * navigationDirection,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0.08 : 0.2,
                  ease: shouldReduceMotion ? "linear" : [0.22, 1, 0.36, 1],
                }}
              >
                <h3>
                  <ArrowTitle
                    before={activeCaseStudy.before}
                    after={activeCaseStudy.after}
                  />
                </h3>
                <div className="landing-caseBody">
                  <p>{activeCaseStudy.situation}</p>
                  <p>{activeCaseStudy.outcome}</p>
                </div>
              </motion.article>
            </AnimatePresence>
          ) : null}
        </div>
      </div>
    </section>
  );
}
