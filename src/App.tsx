import { useEffect, useState } from "react";
import Terminal from "@components/terminal";
import BookingOverlay from "@components/BookingOverlay";
import StoryPage from "@components/story";
import BlogPage from "./pages/BlogPage";
import { parseAppRoute } from "./utils/appRouting";

const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || "miladtsx@gmail.com";

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash;
}

export function shouldShowStoryRoute(hash: string) {
  return hash === "" || hash === "#" || hash.startsWith("#/story");
}

export default function App() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const hash = useHashRoute();
  const route = parseAppRoute(window.location.pathname);
  const isStory = shouldShowStoryRoute(hash);

  if (route.name === "blog") {
    return <BlogPage slug={route.slug} />;
  }

  return (
    <>
      {isStory ? (
        <StoryPage
          onBookCall={() => setBookingOpen(true)}
          contact={{
            email: CONTACT_EMAIL,
          }}
        />
      ) : (
        <Terminal
          contact={{
            email: CONTACT_EMAIL,
          }}
          onBookCall={() => setBookingOpen(true)}
        />
      )}

      <BookingOverlay
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        email={CONTACT_EMAIL}
      />
    </>
  );
}
