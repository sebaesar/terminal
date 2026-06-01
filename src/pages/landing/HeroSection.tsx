import type { MouseEvent } from "react";
import type { LandingSectionProps, SectionNavigation } from "./types";

type HeroSectionProps = LandingSectionProps & {
  onNavigate: SectionNavigation;
};

export function HeroSection({ hidden, onNavigate }: HeroSectionProps) {
  const handleSectionClick =
    (sectionId: Parameters<SectionNavigation>[0]) =>
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onNavigate(sectionId);
    };

  return (
    <section
      id="hero"
      className="landing-slide landing-hero"
      aria-labelledby="landing-title"
      hidden={hidden}
    >
      <div className="landing-heroCenter">
        <div className="landing-heroCopy">
          <h1 id="landing-title" className="landing-title">
            <span>You don&apos;t need another developer.</span>
            <span>You need someone who owns execution.</span>
          </h1>
          <p>
            Products stall when nobody owns technical decisions, delivery, and
            long-term reliability.
          </p>
        </div>

        <nav className="landing-heroActions" aria-label="Explore">
          <a
            className="landing-action landing-actionPrimary"
            href="#approach"
            onClick={handleSectionClick("approach")}
          >
            See how I work
          </a>
          <a
            className="landing-action"
            href="#work"
            onClick={handleSectionClick("work")}
          >
            Read case studies
          </a>
        </nav>
      </div>
    </section>
  );
}
