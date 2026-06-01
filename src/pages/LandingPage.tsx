import {
  type MouseEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AboutSection } from "./landing/AboutSection";
import { ApproachSection } from "./landing/ApproachSection";
import { HeroSection } from "./landing/HeroSection";
import { LandingHeader } from "./landing/LandingHeader";
import { RecognitionSection } from "./landing/RecognitionSection";
import { WorkSection } from "./landing/WorkSection";
import type { LandingSectionId } from "./landing/types";

const configuredBasePath = import.meta.env.BASE_URL || "/";
const basePath = configuredBasePath.replace(/\/$/, "");
const homeHref = configuredBasePath;
const blogHref = `${basePath}/blog`;
const contextMenuWidth = 180;
const contextMenuHeight = 98;
const contextMenuMargin = 8;
const wheelThreshold = 60;
const wheelLockMs = 560;

const landingSectionOrder: LandingSectionId[] = [
  "hero",
  "recognition",
  "approach",
  "work",
  "about",
];

type LandingPageProps = {
  onAskAi: () => void;
  onOpenTerminal: () => void;
};

function getInitialSectionIndex() {
  if (typeof window === "undefined") return 0;
  const sectionId = window.location.hash.slice(1) as LandingSectionId;
  const index = landingSectionOrder.indexOf(sectionId);
  return index >= 0 ? index : 0;
}

function getContextMenuPosition(clientX: number, clientY: number) {
  if (typeof window === "undefined") {
    return { x: clientX, y: clientY };
  }

  return {
    x: Math.min(
      Math.max(clientX, contextMenuMargin),
      Math.max(
        contextMenuMargin,
        window.innerWidth - contextMenuWidth - contextMenuMargin,
      ),
    ),
    y: Math.min(
      Math.max(clientY, contextMenuMargin),
      Math.max(
        contextMenuMargin,
        window.innerHeight - contextMenuHeight - contextMenuMargin,
      ),
    ),
  };
}

function replaceHash(sectionId: LandingSectionId) {
  if (typeof window === "undefined") return;
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  const nextUrl = sectionId === "hero" ? baseUrl : `${baseUrl}#${sectionId}`;
  window.history.replaceState(null, "", nextUrl);
}

export default function LandingPage({
  onAskAi,
  onOpenTerminal,
}: LandingPageProps) {
  const [activeIndex, setActiveIndex] = useState(getInitialSectionIndex);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const activeSection = landingSectionOrder[activeIndex];

  const selectSectionIndex = useCallback((nextIndex: number) => {
    const clampedIndex = Math.min(
      Math.max(nextIndex, 0),
      landingSectionOrder.length - 1,
    );
    setActiveIndex(clampedIndex);
    replaceHash(landingSectionOrder[clampedIndex]);
  }, []);

  const navigateToSection = useCallback(
    (sectionId: LandingSectionId) => {
      const nextIndex = landingSectionOrder.indexOf(sectionId);
      if (nextIndex >= 0) selectSectionIndex(nextIndex);
    },
    [selectSectionIndex],
  );

  const navigateByDirection = useCallback(
    (direction: 1 | -1) => {
      selectSectionIndex(activeIndex + direction);
    },
    [activeIndex, selectSectionIndex],
  );

  useEffect(() => {
    replaceHash(activeSection);
  }, [activeSection]);

  useEffect(() => {
    return () => {
      if (wheelUnlockTimerRef.current) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    firstMenuItemRef.current?.focus();

    const close = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  const openContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setContextMenu(getContextMenuPosition(event.clientX, event.clientY));
  };

  const runContextAction = (action: () => void) => {
    setContextMenu(null);
    action();
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    setContextMenu(null);

    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    if (wheelLockedRef.current) return;

    wheelDeltaRef.current += event.deltaY;
    if (Math.abs(wheelDeltaRef.current) < wheelThreshold) return;

    navigateByDirection(wheelDeltaRef.current > 0 ? 1 : -1);
    wheelDeltaRef.current = 0;
    wheelLockedRef.current = true;
    wheelUnlockTimerRef.current = window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, wheelLockMs);
  };

  return (
    <main
      className="landing-page"
      onContextMenu={openContextMenu}
      onWheel={handleWheel}
    >
      <LandingHeader
        activeSection={activeSection}
        blogHref={blogHref}
        homeHref={homeHref}
        onNavigate={navigateToSection}
      />

      <div className="landing-stage" aria-live="polite">
        <HeroSection
          hidden={activeSection !== "hero"}
          onNavigate={navigateToSection}
        />
        <RecognitionSection hidden={activeSection !== "recognition"} />
        <ApproachSection hidden={activeSection !== "approach"} />
        <WorkSection hidden={activeSection !== "work"} />
        <AboutSection hidden={activeSection !== "about"} />
      </div>

      {contextMenu ? (
        <div
          className="landing-contextMenu"
          role="menu"
          aria-label="Page actions"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            ref={firstMenuItemRef}
            type="button"
            role="menuitem"
            onClick={() => runContextAction(onAskAi)}
          >
            Ask AI
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runContextAction(onOpenTerminal)}
          >
            Open Terminal
          </button>
        </div>
      ) : null}
    </main>
  );
}
