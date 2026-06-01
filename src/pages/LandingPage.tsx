import {
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AboutSection } from "./landing/AboutSection";
import { ApproachSection } from "./landing/ApproachSection";
import { getDragNavigationDirection } from "./landing/dragNavigation";
import {
  HeroSection,
  type HeroTrustlineState,
} from "./landing/HeroSection";
import {
  getKeyboardNavigationDirection,
  shouldIgnoreLandingKeyboardNavigation,
} from "./landing/keyboardNavigation";
import { LandingHeader } from "./landing/LandingHeader";
import { RecognitionSection } from "./landing/RecognitionSection";
import { SectionProgress } from "./landing/SectionProgress";
import { WorkSection } from "./landing/WorkSection";
import { caseStudies } from "./landing/content";
import type { LandingSectionId } from "./landing/types";
import {
  getWorkEntryIndex,
  getWorkNavigationTarget,
  type WorkNavigationDirection,
} from "./landing/workNavigation";

const configuredBasePath = import.meta.env.BASE_URL || "/";
const basePath = configuredBasePath.replace(/\/$/, "");
const homeHref = configuredBasePath;
const blogHref = `${basePath}/blog`;
const contextMenuWidth = 180;
const contextMenuHeight = 98;
const contextMenuMargin = 8;
const wheelThreshold = 60;
const wheelLockMs = 560;
const clickSuppressionMs = 350;
const heroTrustlineDelayMs = 5000;
const calmEase = [0.22, 1, 0.36, 1] as const;

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

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
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

function renderLandingSection(
  sectionId: LandingSectionId,
  heroTrustlineState: HeroTrustlineState,
  onHeroTrustlineComplete: () => void,
  activeCaseStudyIndex: number,
  caseStudyDirection: WorkNavigationDirection,
) {
  switch (sectionId) {
    case "hero":
      return (
        <HeroSection
          hidden={false}
          trustlineState={heroTrustlineState}
          onTrustlineComplete={onHeroTrustlineComplete}
        />
      );
    case "recognition":
      return <RecognitionSection hidden={false} />;
    case "approach":
      return <ApproachSection hidden={false} />;
    case "work":
      return (
        <WorkSection
          activeCaseStudyIndex={activeCaseStudyIndex}
          hidden={false}
          navigationDirection={caseStudyDirection}
        />
      );
    case "about":
      return <AboutSection hidden={false} />;
  }
}

export default function LandingPage({
  onAskAi,
  onOpenTerminal,
}: LandingPageProps) {
  const [activeIndex, setActiveIndex] = useState(getInitialSectionIndex);
  const [navigationDirection, setNavigationDirection] = useState<1 | -1>(1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const clickSuppressionTimerRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const [activeCaseStudyIndex, setActiveCaseStudyIndex] = useState(0);
  const [caseStudyDirection, setCaseStudyDirection] =
    useState<WorkNavigationDirection>(1);
  const [heroTrustlineState, setHeroTrustlineState] =
    useState<HeroTrustlineState>("idle");
  const activeSection = landingSectionOrder[activeIndex];
  const shouldReduceMotion = useReducedMotion();

  const selectSectionIndex = useCallback(
    (nextIndex: number, workEntryDirection: WorkNavigationDirection = 1) => {
      const clampedIndex = Math.min(
        Math.max(nextIndex, 0),
        landingSectionOrder.length - 1,
      );
      if (clampedIndex !== activeIndex) {
        setNavigationDirection(clampedIndex > activeIndex ? 1 : -1);
      }
      if (landingSectionOrder[clampedIndex] === "work") {
        setCaseStudyDirection(workEntryDirection);
        setActiveCaseStudyIndex(
          getWorkEntryIndex(workEntryDirection, caseStudies.length),
        );
      }
      setActiveIndex(clampedIndex);
      replaceHash(landingSectionOrder[clampedIndex]);
    },
    [activeIndex],
  );

  const navigateToSection = useCallback(
    (sectionId: LandingSectionId) => {
      const nextIndex = landingSectionOrder.indexOf(sectionId);
      if (nextIndex >= 0) selectSectionIndex(nextIndex);
    },
    [selectSectionIndex],
  );

  const navigateByDirection = useCallback(
    (direction: WorkNavigationDirection) => {
      selectSectionIndex(activeIndex + direction, direction);
    },
    [activeIndex, selectSectionIndex],
  );

  const navigateWithinActiveSurface = useCallback(
    (direction: WorkNavigationDirection) => {
      if (activeSection === "work") {
        const target = getWorkNavigationTarget(
          activeCaseStudyIndex,
          direction,
          caseStudies.length,
        );

        if (target.type === "case") {
          setCaseStudyDirection(direction);
          setActiveCaseStudyIndex(target.index);
          return;
        }
      }

      navigateByDirection(direction);
    },
    [activeCaseStudyIndex, activeSection, navigateByDirection],
  );

  const lockWheelNavigation = useCallback(() => {
    wheelLockedRef.current = true;
    wheelUnlockTimerRef.current = window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, wheelLockMs);
  }, []);

  const startHeroTrustlineTyping = useCallback(() => {
    setHeroTrustlineState((currentState) =>
      currentState === "idle" ? "typing" : currentState,
    );
  }, []);

  const completeHeroTrustline = useCallback(() => {
    setHeroTrustlineState("complete");
  }, []);

  const advanceHeroTrustlineOnNavigationIntent = useCallback(() => {
    if (activeSection !== "hero") return false;

    if (heroTrustlineState === "idle") {
      startHeroTrustlineTyping();
      return true;
    }

    if (heroTrustlineState === "typing") {
      completeHeroTrustline();
      return true;
    }

    return false;
  }, [
    activeSection,
    completeHeroTrustline,
    heroTrustlineState,
    startHeroTrustlineTyping,
  ]);

  useEffect(() => {
    replaceHash(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (heroTrustlineState !== "idle") return;

    const timerId = window.setTimeout(
      startHeroTrustlineTyping,
      heroTrustlineDelayMs,
    );

    return () => window.clearTimeout(timerId);
  }, [heroTrustlineState, startHeroTrustlineTyping]);

  useEffect(() => {
    return () => {
      if (wheelUnlockTimerRef.current) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
      if (clickSuppressionTimerRef.current) {
        window.clearTimeout(clickSuppressionTimerRef.current);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getKeyboardNavigationDirection(event.key);
      if (!direction || shouldIgnoreLandingKeyboardNavigation(event)) return;

      event.preventDefault();
      setContextMenu(null);

      if (advanceHeroTrustlineOnNavigationIntent()) return;

      navigateWithinActiveSurface(direction);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceHeroTrustlineOnNavigationIntent, navigateWithinActiveSurface]);

  const openContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setContextMenu(getContextMenuPosition(event.clientX, event.clientY));
  };

  const runContextAction = (action: () => void) => {
    setContextMenu(null);
    action();
  };

  const suppressClickAfterDrag = (event: MouseEvent<HTMLElement>) => {
    if (!suppressNextClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    setContextMenu(null);

    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    if (wheelLockedRef.current) return;

    if (advanceHeroTrustlineOnNavigationIntent()) return;

    wheelDeltaRef.current += event.deltaY;
    if (Math.abs(wheelDeltaRef.current) < wheelThreshold) return;

    navigateWithinActiveSurface(wheelDeltaRef.current > 0 ? 1 : -1);
    wheelDeltaRef.current = 0;
    lockWheelNavigation();
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    setContextMenu(null);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (getDragNavigationDirection(deltaX, deltaY)) {
      event.preventDefault();
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const direction = getDragNavigationDirection(
      event.clientX - dragState.startX,
      event.clientY - dragState.startY,
    );
    if (!direction) return;

    suppressNextClickRef.current = true;
    if (clickSuppressionTimerRef.current) {
      window.clearTimeout(clickSuppressionTimerRef.current);
    }
    clickSuppressionTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, clickSuppressionMs);

    setContextMenu(null);
    if (advanceHeroTrustlineOnNavigationIntent()) return;

    navigateWithinActiveSurface(direction);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <main
      className="landing-page"
      onClickCapture={suppressClickAfterDrag}
      onContextMenu={openContextMenu}
      onWheel={handleWheel}
    >
      <LandingHeader
        activeSection={activeSection}
        blogHref={blogHref}
        homeHref={homeHref}
        onNavigate={navigateToSection}
      />
      <SectionProgress
        activeSection={activeSection}
        onNavigate={navigateToSection}
        sections={landingSectionOrder}
      />

      <div
        className="landing-stage"
        aria-live="polite"
        aria-atomic="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeSection}
            className="landing-slideFrame"
            initial={{
              opacity: 0,
              y: shouldReduceMotion ? 0 : 12 * navigationDirection,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: shouldReduceMotion ? 0 : -8 * navigationDirection,
            }}
            transition={{
              duration: shouldReduceMotion ? 0.12 : 0.24,
              ease: shouldReduceMotion ? "linear" : calmEase,
            }}
          >
            {renderLandingSection(
              activeSection,
              heroTrustlineState,
              completeHeroTrustline,
              activeCaseStudyIndex,
              caseStudyDirection,
            )}
          </motion.div>
        </AnimatePresence>
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
