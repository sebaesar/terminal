import type { WorkNavigationDirection } from "./workNavigation";

const blockedKeyboardNavigationSelector = [
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='dialog']",
  "[role='menu']",
  "[role='listbox']",
  "[role='combobox']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='textbox']",
].join(",");

export function getKeyboardNavigationDirection(
  key: string,
): WorkNavigationDirection | null {
  if (key === "ArrowDown") return 1;
  if (key === "ArrowUp") return -1;
  return null;
}

export function shouldIgnoreLandingKeyboardNavigation(event: KeyboardEvent) {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.isComposing ||
    event.repeat
  ) {
    return true;
  }

  if (
    typeof document !== "undefined" &&
    document.querySelector("[role='dialog'], [role='menu']")
  ) {
    return true;
  }

  const target = event.target;
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(blockedKeyboardNavigationSelector));
}
