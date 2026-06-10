import type { LandingSectionId } from "./types";
import { getLandingWallpaper } from "./wallpaperCatalog";

type ShaderWallpaperProps = {
  activeSection: LandingSectionId;
};

export function ShaderWallpaper({ activeSection }: ShaderWallpaperProps) {
  const activeWallpaper = getLandingWallpaper(activeSection);

  return (
    <div
      aria-hidden="true"
      className="landing-shaderWallpaper"
      data-wallpaper={activeWallpaper.id}
    />
  );
}
