export type ChatAction =
  | {
      id: string;
      kind: "booking";
      label: string;
      href: string;
    }
  | {
      id: string;
      kind: "link" | "email";
      label: string;
      href: string;
    };

export const BOOKING_URL = "https://cal.com/milaforge/intro";

const URL_PATTERN = /\bhttps?:\/\/[^\s<>)\]]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BOOKING_INTENT_PATTERN = /\b(book|booking|schedule|calendar|cal\.com)\b/i;
const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

const safeActionHref = (rawHref: string): string | null => {
  try {
    const url = new URL(rawHref);
    if (url.protocol === "https:" || url.protocol === "mailto:") {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
};

const labelForUrl = (href: string): string => {
  try {
    const url = new URL(href);
    if (url.hostname.includes("cal.com")) return "Open calendar";
    if (url.hostname === "t.me" || url.hostname.endsWith(".t.me")) {
      return "Message on Telegram";
    }
  } catch {
    return "Open link";
  }
  return "Open link";
};

export const getChatActions = (
  content: string,
  contactEmail: string,
): ChatAction[] => {
  const actions = new Map<string, ChatAction>();
  const hasBookingIntent = BOOKING_INTENT_PATTERN.test(content);

  if (hasBookingIntent) {
    actions.set("booking", {
      id: "booking",
      kind: "booking",
      label: "Book call",
      href: BOOKING_URL,
    });
  }

  for (const match of content.matchAll(URL_PATTERN)) {
    const rawHref = match[0].replace(TRAILING_PUNCTUATION, "");
    const href = safeActionHref(rawHref);
    if (!href) continue;
    if (hasBookingIntent && new URL(href).hostname.includes("cal.com")) continue;
    const id = `link:${href}`;
    actions.set(id, {
      id,
      kind: "link",
      label: labelForUrl(href),
      href,
    });
  }

  for (const match of content.matchAll(EMAIL_PATTERN)) {
    const email = match[0];
    const href = safeActionHref(
      `mailto:${email}?subject=Recurring%20workflow%20context`,
    );
    if (!href) continue;
    const id = `email:${email}`;
    actions.set(id, {
      id,
      kind: "email",
      label: email === contactEmail ? "Send email" : `Email ${email}`,
      href,
    });
  }

  return [...actions.values()];
};

export const getChatDisplayContent = (
  content: string,
  actions: ChatAction[],
): string => {
  if (!actions.length) return content;

  const hasBookingAction = actions.some((action) => action.kind === "booking");
  const linkHrefs = new Set(
    actions.filter((action) => action.kind === "link").map((action) => action.href),
  );
  const emailAddresses = new Set(
    actions
      .filter((action) => action.kind === "email")
      .map((action) => new URL(action.href).pathname),
  );

  const shouldReplaceUrl = (rawValue: string) => {
    const rawHref = rawValue.replace(TRAILING_PUNCTUATION, "");
    const href = safeActionHref(rawHref);
    if (!href) return false;
    const url = new URL(href);
    return (
      (hasBookingAction && url.hostname.includes("cal.com")) ||
      linkHrefs.has(href)
    );
  };

  const shouldReplaceEmail = (email: string) => emailAddresses.has(email);

  return content
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (full, label, href) =>
      shouldReplaceUrl(href) ? label : full,
    )
    .replace(URL_PATTERN, (rawValue) =>
      shouldReplaceUrl(rawValue)
        ? rawValue.slice(rawValue.replace(TRAILING_PUNCTUATION, "").length)
        : rawValue,
    )
    .replace(EMAIL_PATTERN, (email) => (shouldReplaceEmail(email) ? "" : email))
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
