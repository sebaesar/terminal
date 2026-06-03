import {
  Suspense,
  type MouseEvent,
  type PointerEvent,
  lazy,
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
import {
  RecognitionSection,
  type RecognitionEntranceMode,
} from "./landing/RecognitionSection";
import { shouldAdvanceRecognitionEntrance } from "./landing/recognitionEntranceNavigation";
import { SectionProgress } from "./landing/SectionProgress";
import { WorkSection } from "./landing/WorkSection";
import { caseStudies } from "./landing/content";
import type { LandingSectionId } from "./landing/types";
import {
  getWheelNavigationIntent,
  isVerticalWheelNavigation,
} from "./landing/wheelNavigation";
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
const heroTrustlineDelayMs = 3000;
const heroTitleIntroMs = 880;
const askAiPromptDelayMs = 5000;
const askAiPromptSparkleColor = "#121412";
const calmEase = [0.22, 1, 0.36, 1] as const;

const SparklesCore = lazy(async () => {
  const module = await import("@components/ui/sparkles");
  return { default: module.SparklesCore };
});

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
  shouldAnimateHeroTitle: boolean,
  heroTrustlineState: HeroTrustlineState,
  onHeroTrustlineComplete: () => void,
  recognitionEntranceMode: RecognitionEntranceMode,
  onRecognitionEntranceComplete: () => void,
  activeCaseStudyIndex: number,
  caseTransitionDirection: WorkNavigationDirection,
) {
  switch (sectionId) {
    case "hero":
      return (
        <HeroSection
          animateTitle={shouldAnimateHeroTitle}
          hidden={false}
          trustlineState={heroTrustlineState}
          onTrustlineComplete={onHeroTrustlineComplete}
        />
      );
    case "recognition":
      return (
        <RecognitionSection
          entranceMode={recognitionEntranceMode}
          hidden={false}
          onEntranceComplete={onRecognitionEntranceComplete}
        />
      );
    case "approach":
      return <ApproachSection hidden={false} />;
    case "work":
      return (
        <WorkSection
          activeCaseStudyIndex={activeCaseStudyIndex}
          caseTransitionDirection={caseTransitionDirection}
          hidden={false}
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
  const [shouldAnimateHeroTitle, setShouldAnimateHeroTitle] = useState(
    () => getInitialSectionIndex() === 0,
  );
  const [navigationDirection, setNavigationDirection] = useState<1 | -1>(1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const landingRootRef = useRef<HTMLElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const clickSuppressionTimerRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const [activeCaseStudyIndex, setActiveCaseStudyIndex] = useState(0);
  const [caseTransitionDirection, setCaseTransitionDirection] =
    useState<WorkNavigationDirection>(1);
  const [heroTrustlineState, setHeroTrustlineState] =
    useState<HeroTrustlineState>("idle");
  const [recognitionEntranceMode, setRecognitionEntranceMode] =
    useState<RecognitionEntranceMode>("default");
  const [isRecognitionEntranceComplete, setIsRecognitionEntranceComplete] =
    useState(false);
  const [isAskAiPromptVisible, setIsAskAiPromptVisible] = useState(false);
  const activeSection = landingSectionOrder[activeIndex];
  const shouldReduceMotion = useReducedMotion();

  const selectSectionIndex = useCallback(
    (nextIndex: number, workEntryDirection: WorkNavigationDirection = 1) => {
      const clampedIndex = Math.min(
        Math.max(nextIndex, 0),
        landingSectionOrder.length - 1,
      );
      const nextSection = landingSectionOrder[clampedIndex];

      if (clampedIndex !== activeIndex) {
        setNavigationDirection(clampedIndex > activeIndex ? 1 : -1);
        setShouldAnimateHeroTitle(false);
      }
      if (nextSection === "recognition" && clampedIndex !== activeIndex) {
        setRecognitionEntranceMode("default");
        setIsRecognitionEntranceComplete(Boolean(shouldReduceMotion));
      }
      if (nextSection === "work") {
        setCaseTransitionDirection(workEntryDirection);
        setActiveCaseStudyIndex(
          getWorkEntryIndex(workEntryDirection, caseStudies.length),
        );
      }
      setActiveIndex(clampedIndex);
      replaceHash(nextSection);
    },
    [activeIndex, shouldReduceMotion],
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
          setCaseTransitionDirection(direction);
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

  const completeRecognitionEntrance = useCallback(() => {
    setIsRecognitionEntranceComplete(true);
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

  const advanceRecognitionEntranceOnNavigationIntent = useCallback(
    (direction: WorkNavigationDirection) => {
      if (
        !shouldAdvanceRecognitionEntrance({
          activeSection,
          direction,
          isEntranceComplete: isRecognitionEntranceComplete,
          shouldReduceMotion: Boolean(shouldReduceMotion),
        })
      ) {
        return false;
      }

      setRecognitionEntranceMode("accelerated");
      return true;
    },
    [activeSection, isRecognitionEntranceComplete, shouldReduceMotion],
  );

  useEffect(() => {
    replaceHash(activeSection);
  }, [activeSection]);

  useEffect(() => {
    const timerId = window.setTimeout(
      () => setIsAskAiPromptVisible(true),
      askAiPromptDelayMs,
    );

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (activeSection !== "recognition") return;

    setRecognitionEntranceMode("default");
    setIsRecognitionEntranceComplete(Boolean(shouldReduceMotion));
  }, [activeSection, shouldReduceMotion]);

  useEffect(() => {
    if (heroTrustlineState !== "idle") return;

    const timerId = window.setTimeout(
      startHeroTrustlineTyping,
      heroTrustlineDelayMs,
    );

    return () => window.clearTimeout(timerId);
  }, [heroTrustlineState, startHeroTrustlineTyping]);

  useEffect(() => {
    if (!shouldAnimateHeroTitle) return;

    if (shouldReduceMotion) {
      setShouldAnimateHeroTitle(false);
      return;
    }

    const timerId = window.setTimeout(
      () => setShouldAnimateHeroTitle(false),
      heroTitleIntroMs,
    );

    return () => window.clearTimeout(timerId);
  }, [shouldAnimateHeroTitle, shouldReduceMotion]);

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
      if (advanceRecognitionEntranceOnNavigationIntent(direction)) {
        return;
      }

      navigateWithinActiveSurface(direction);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    advanceHeroTrustlineOnNavigationIntent,
    advanceRecognitionEntranceOnNavigationIntent,
    navigateWithinActiveSurface,
  ]);

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

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!isVerticalWheelNavigation(event.deltaX, event.deltaY)) return;

      if (event.cancelable) event.preventDefault();
      setContextMenu(null);

      if (wheelLockedRef.current) return;

      if (advanceHeroTrustlineOnNavigationIntent()) {
        wheelDeltaRef.current = 0;
        return;
      }
      if (
        event.deltaY > 0 &&
        advanceRecognitionEntranceOnNavigationIntent(1)
      ) {
        wheelDeltaRef.current = 0;
        lockWheelNavigation();
        return;
      }

      const wheelIntent = getWheelNavigationIntent({
        accumulatedDelta: wheelDeltaRef.current,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        threshold: wheelThreshold,
      });
      wheelDeltaRef.current = wheelIntent.nextAccumulatedDelta;

      if (!wheelIntent.direction) return;

      const { direction } = wheelIntent;

      if (advanceRecognitionEntranceOnNavigationIntent(direction)) {
        lockWheelNavigation();
        return;
      }

      navigateWithinActiveSurface(direction);
      lockWheelNavigation();
    },
    [
      advanceHeroTrustlineOnNavigationIntent,
      advanceRecognitionEntranceOnNavigationIntent,
      lockWheelNavigation,
      navigateWithinActiveSurface,
    ],
  );

  useEffect(() => {
    const landingRoot = landingRootRef.current;
    if (!landingRoot) return;

    landingRoot.addEventListener("wheel", handleWheel, { passive: false });

    return () => landingRoot.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

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
    if (advanceRecognitionEntranceOnNavigationIntent(direction)) return;

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
      ref={landingRootRef}
      className="landing-page"
      onClickCapture={suppressClickAfterDrag}
      onContextMenu={openContextMenu}
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

      {isAskAiPromptVisible ? (
        <motion.div
          className="landing-askAiPromptSlot"
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0.01 : 0.42,
            ease: shouldReduceMotion ? "linear" : calmEase,
          }}
        >
          <button
            type="button"
            className="landing-askAiPrompt"
            aria-label="Ask AI about fit"
            title="Ask AI about fit"
            onClick={onAskAi}
          >
            <span className="landing-askAiSparkles" aria-hidden="true">
              <Suspense fallback={null}>
                <SparklesCore
                  background="transparent"
                  className="landing-askAiSparklesCanvas"
                  minSize={0.4}
                  maxSize={1.4}
                  particleColor={askAiPromptSparkleColor}
                  particleDensity={120}
                  speed={0.5}
                />
              </Suspense>
            </span>
            <span className="landing-askAiPromptLabel">
              Ask AI about fit
            </span>
          </button>
        </motion.div>
      ) : null}

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
              shouldAnimateHeroTitle,
              heroTrustlineState,
              completeHeroTrustline,
              recognitionEntranceMode,
              completeRecognitionEntrance,
              activeCaseStudyIndex,
              caseTransitionDirection,
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
