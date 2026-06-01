import { Suspense, lazy, useCallback, useState } from "react";
import { openChatMaximized } from "@stores/chatStore";
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

function safeDecodePathPart(part?: string) {
  if (!part) return undefined;
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function getRoute(pathname: string) {
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base === "/" ? "" : base.replace(/\/$/, "");
  const path = cleanBase && pathname.startsWith(cleanBase)
    ? pathname.slice(cleanBase.length) || "/"
    : pathname;
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "blog") {
    return {
      name: "blog" as const,
      slug: safeDecodePathPart(parts[1]),
    };
  }

  return { name: "home" as const };
}

export default function App() {
  const route = getRoute(
    typeof window === "undefined" ? "/" : window.location.pathname,
  );
  const [bookingOpen, setBookingOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [focusedWindow, setFocusedWindow] =
    useState<FloatingWindow | null>(null);

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
    return <BlogPage slug={route.slug} />;
  }

  return (
    <>
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
    </>
  );
}
