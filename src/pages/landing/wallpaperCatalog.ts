import type { LandingSectionId } from "./types";

export const landingWallpaperVariants = [
  { id: "nebula", name: "Dust smoke galaxy" },
  { id: "aurora", name: "Liquid aurora" },
  { id: "magnetic", name: "Blue ember wash" },
  { id: "prism", name: "Gold blue wash" },
  { id: "topography", name: "Green ember wash" },
] as const;

export type LandingWallpaperVariant = (typeof landingWallpaperVariants)[number];
export type LandingWallpaperId = LandingWallpaperVariant["id"];

const sectionWallpaperMap: Record<LandingSectionId, LandingWallpaperId> = {
  hero: "nebula",
  recognition: "aurora",
  approach: "magnetic",
  work: "prism",
  about: "topography",
};

export function getLandingWallpaper(sectionId: LandingSectionId) {
  return landingWallpaperVariants.find(
    (variant) => variant.id === sectionWallpaperMap[sectionId],
  ) ?? landingWallpaperVariants[0];
}

export function getLandingWallpaperIndex(sectionId: LandingSectionId) {
  return landingWallpaperVariants.indexOf(getLandingWallpaper(sectionId));
}
