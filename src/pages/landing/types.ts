export type LandingSectionId =
  | "hero"
  | "recognition"
  | "approach"
  | "work"
  | "about";

export type SectionNavigation = (sectionId: LandingSectionId) => void;

export type LandingSectionProps = {
  hidden: boolean;
};
