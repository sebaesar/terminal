import { describe, expect, it } from "vitest";
import type { LandingSectionId } from "../types";
import {
  getLandingWallpaper,
  getLandingWallpaperIndex,
  landingWallpaperVariants,
} from "../wallpaperCatalog";

const landingSections: LandingSectionId[] = [
  "hero",
  "recognition",
  "approach",
  "work",
  "about",
];

describe("landing wallpaper catalog", () => {
  it("defines five distinct static wallpaper palettes", () => {
    const wallpaperIds = landingWallpaperVariants.map((variant) => variant.id);

    expect(landingWallpaperVariants).toHaveLength(5);
    expect(new Set(wallpaperIds).size).toBe(5);
  });

  it("maps every landing section to a distinct wallpaper", () => {
    const sectionWallpaperIds = landingSections.map(
      (sectionId) => getLandingWallpaper(sectionId).id,
    );

    expect(sectionWallpaperIds).toEqual([
      "nebula",
      "aurora",
      "magnetic",
      "prism",
      "topography",
    ]);
  });

  it("returns stable palette indices for section transitions", () => {
    expect(landingSections.map(getLandingWallpaperIndex)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });
});
