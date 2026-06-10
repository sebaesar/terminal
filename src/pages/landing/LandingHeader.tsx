import type { MouseEvent } from "react";
import type { LandingSectionId, SectionNavigation } from "./types";

type LandingHeaderProps = {
  activeSection: LandingSectionId;
  blogHref: string;
  homeHref: string;
  onNavigate: SectionNavigation;
};

export function LandingHeader({
  activeSection,
  blogHref,
  homeHref,
  onNavigate,
}: LandingHeaderProps) {
  const handleSectionClick =
    (sectionId: LandingSectionId) =>
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onNavigate(sectionId);
    };

  return (
    <header className="landing-header" aria-label="Primary">
      <a href={homeHref} onClick={handleSectionClick("hero")}>
        <div>
          <p className="landing-brand">Milad</p>
          <span className="landing-brandSubtitle">
            Methodical Founder&apos;s Engineer
          </span>
        </div>
      </a>
      <nav className="landing-nav" aria-label="Main navigation">
        <a
          href="#work"
          onClick={handleSectionClick("work")}
          aria-current={activeSection === "work" ? "page" : undefined}
        >
          Case Studies
        </a>
        <a href={blogHref}>Thinking</a>
        <a
          href="#about"
          onClick={handleSectionClick("about")}
          aria-current={activeSection === "about" ? "page" : undefined}
        >
          About
        </a>
      </nav>
    </header>
  );
}
