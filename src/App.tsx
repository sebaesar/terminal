import {
  Suspense,
  lazy,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { openChatMaximized } from "@stores/chatStore";
import { getClientRoutePath, parseAppRoute } from "@utils/appRouting";
import LandingPage from "./pages/LandingPage";
import BlogPage from "./pages/BlogPage";

const BookingOverlay = lazy(() => import("@components/BookingOverlay"));
const TerminalModal = lazy(() => import("@components/TerminalModal"));
const ChatDock = lazy(() => import("@components/terminal/chat"));

const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || "onboarding@failuresmith.xyz";

const focusedWindowZIndex = 80;
const backgroundWindowZIndex = 60;

type FloatingWindow = "chat" | "terminal";
type AppRoute = ReturnType<typeof parseAppRoute>;
type BlogRouteTransition = "to-post" | "to-list" | "between-posts";
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function getBlogRouteTransition(
  currentRoute: AppRoute,
  nextRoute: AppRoute,
): BlogRouteTransition | null {
  if (
    currentRoute.name !== "blog" ||
    nextRoute.name !== "blog" ||
    currentRoute.slug === nextRoute.slug
  ) {
    return null;
  }

  if (!currentRoute.slug && nextRoute.slug) return "to-post";
  if (currentRoute.slug && !nextRoute.slug) return "to-list";
  return "between-posts";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function App() {
  const [route, setRoute] = useState(() =>
    parseAppRoute(
      typeof window === "undefined" ? "/" : window.location.pathname,
    ),
  );
  const [bookingOpen, setBookingOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [focusedWindow, setFocusedWindow] =
    useState<FloatingWindow | null>(null);

  const commitRoute = useCallback(
    (nextRoute: AppRoute, options: { scrollToTop?: boolean } = {}) => {
      const transitionKind = getBlogRouteTransition(route, nextRoute);
      const applyRoute = (sync: boolean) => {
        if (sync) {
          flushSync(() => setRoute(nextRoute));
        } else {
          setRoute(nextRoute);
        }

        if (options.scrollToTop) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      };

      const transitionDocument = document as ViewTransitionDocument;
      if (
        !transitionKind ||
        prefersReducedMotion() ||
        !transitionDocument.startViewTransition
      ) {
        applyRoute(false);
        return;
      }

      const transitionId = `${transitionKind}-${Date.now()}`;
      document.documentElement.dataset.blogTransition = transitionKind;
      document.documentElement.dataset.blogTransitionId = transitionId;

      const transition = transitionDocument.startViewTransition(() => {
        applyRoute(true);
      });

      void transition.finished
        .catch(() => undefined)
        .then(() => {
          if (
            document.documentElement.dataset.blogTransitionId === transitionId
          ) {
            delete document.documentElement.dataset.blogTransition;
            delete document.documentElement.dataset.blogTransitionId;
          }
        });
    },
    [route],
  );

  useEffect(() => {
    const handlePopState = () => {
      commitRoute(parseAppRoute(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [commitRoute]);

  const navigateToRoute = useCallback((path: string) => {
    const target = new URL(path, window.location.href);
    const nextRoute = parseAppRoute(target.pathname);
    window.history.pushState(
      {},
      "",
      `${target.pathname}${target.search}${target.hash}`,
    );
    commitRoute(nextRoute, { scrollToTop: !target.hash });
  }, [commitRoute]);

  const handleClientRouteClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const routePath = getClientRoutePath(anchor.href, window.location);
      if (!routePath) return;

      event.preventDefault();
      navigateToRoute(routePath);
    },
    [navigateToRoute],
  );

  const focusChatInput = useCallback(() => {
    let attempts = 0;
    const focus = () => {
      const chatInput =
        document.querySelector<HTMLTextAreaElement>(".chat-input");
      if (chatInput || attempts >= 10) {
        chatInput?.focus();
        return;
      }
      attempts += 1;
      window.setTimeout(focus, 50);
    };

    window.setTimeout(focus, 0);
  }, []);

  const handleAskAi = useCallback(() => {
    setChatEnabled(true);
    setFocusedWindow("chat");
    openChatMaximized();
    focusChatInput();
  }, [focusChatInput]);

  if (route.name === "blog") {
    return (
      <div onClickCapture={handleClientRouteClick}>
        <BlogPage slug={route.slug} />
      </div>
    );
  }

  return (
    <div onClickCapture={handleClientRouteClick}>
      <LandingPage
        onAskAi={handleAskAi}
        onOpenTerminal={() => {
          setTerminalOpen(true);
          setFocusedWindow("terminal");
        }}
      />
      <Suspense fallback={null}>
        {terminalOpen ? (
          <TerminalModal
            contactEmail={CONTACT_EMAIL}
            onAskAi={handleAskAi}
            onBookCall={() => {
              setTerminalOpen(false);
              setBookingOpen(true);
            }}
            onClose={() => setTerminalOpen(false)}
            onActivate={() => setFocusedWindow("terminal")}
            zIndex={
              focusedWindow === "terminal"
                ? focusedWindowZIndex
                : backgroundWindowZIndex
            }
          />
        ) : null}
        {chatEnabled ? (
          <ChatDock
            onBookCall={() => setBookingOpen(true)}
            contactEmail={CONTACT_EMAIL}
            onActivate={() => setFocusedWindow("chat")}
            windowZIndex={
              focusedWindow === "chat"
                ? focusedWindowZIndex
                : backgroundWindowZIndex
            }
          />
        ) : null}
        {bookingOpen ? (
          <BookingOverlay
            open={bookingOpen}
            onClose={() => setBookingOpen(false)}
            email={CONTACT_EMAIL}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
