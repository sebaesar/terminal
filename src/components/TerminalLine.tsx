import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MarkdownBlock } from "@components/MarkdownBlock";
import { SparklesCore } from "@components/ui/sparkles";
import { useTerminalTone } from "@hooks/useTerminalTone";
import { copyToClipboard, buildShareLink } from "@utils";
import { getClientProofAriaLabel } from "@data/clientProof";
import { ArrowUp, Clock, Info } from "lucide-react";
import {
  CommandSegment,
  CopySegment,
  LinkSegment,
  FaqSegment,
  LogSegment,
  LineSegment,
  TerminalLineProps,
  MarkdownSegment,
  WorkSegment,
  AvatarSegment,
  SearchHitsSegment as SearchHitsSegmentType,
  ActivityTreeNode,
  ActivityTreeSegment,
  SampleWork,
  ClientProofItem,
  ClientProofSegment,
  OperatingModelSegment,
} from "@types";
import { DownloadIntegrity } from "./terminal/DownloadIntegrity";

type ExecuteCommand = TerminalLineProps["executeCommand"];

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function formatMonthYear(date: string) {
  const trimmed = date.trim();
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(trimmed);
  if (!match) return trimmed;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return trimmed;

  return MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
}

function CopyIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`t-copyIcon${active ? " is-active" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <rect x="4" y="4" width="11" height="11" rx="2" />
    </svg>
  );
}

function CopyButton({ segment }: { segment: CopySegment }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (copied) {
      timer = window.setTimeout(() => setCopied(false), 650);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [copied]);

  const label = segment.label || "Copy";
  const ariaLabel = segment.ariaLabel || `Copy ${label}`;

  return (
    <button
      type="button"
      className="t-copyButton"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        void copyToClipboard(segment.value);
        setCopied(true);
      }}
    >
      <CopyIcon active={copied} />
      <span className={`t-copyState${copied ? " is-visible" : ""}`}>
        {copied && "Copied"}
      </span>
    </button>
  );
}

function SparkleCommandButton({
  label,
  ariaLabel,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  const tone = useTerminalTone();
  const particleColor = tone === "light" ? "#050506" : "#f6fbff";

  return (
    <button
      type="button"
      className="t-commandLink t-pressable is-sparkle"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="t-sparkleSurface" aria-hidden="true">
        <SparklesCore
          background="transparent"
          className="t-sparkleCanvas"
          minSize={0.4}
          maxSize={1.2}
          particleColor={particleColor}
          particleDensity={120}
          speed={0.4}
        />
      </span>
      <span className="t-sparkleLabel">{label}</span>
    </button>
  );
}

function AvatarMessageSegment({
  segment,
  executeCommand,
}: {
  segment: AvatarSegment;
  executeCommand: ExecuteCommand;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const allowModal = useMemo(
    () => !segment.disableModal && !segment.onClickCommand,
    [segment.disableModal, segment.onClickCommand],
  );

  useEffect(() => {
    if (!allowModal || !isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allowModal, isOpen]);

  const handleAvatarClick = () => {
    if (segment.onClickCommand) {
      executeCommand(segment.onClickCommand);
      return;
    }
    if (!allowModal) return;
    setIsOpen(true);
  };

  const avatarAriaLabel = segment.onClickCommand
    ? `Run ${segment.onClickCommand}`
    : "Open profile photo";

  return (
    <>
      <span className="t-avatarMessage">
        <span className="t-avatarMedia">
          <button
            type="button"
            className="t-avatarPhoto"
            aria-label={avatarAriaLabel}
            onClick={handleAvatarClick}
          >
            <img
              src={segment.image}
              alt={segment.label ? `${segment.label} avatar` : "avatar"}
            />
          </button>
          {segment.label ? (
            <span className="t-avatarCaption">{segment.label}</span>
          ) : null}
        </span>
        <span className="t-avatarContent">
          {segment.meta ? (
            <span className="t-avatarHead">
              <span className="t-avatarMeta">{segment.meta}</span>
            </span>
          ) : null}
          {segment.lines.map((line, lineIdx) => {
            const isEmphasis = segment.emphasizeLines?.includes(lineIdx);
            return (
              <span
                key={`avatar-line-${lineIdx}`}
                className={`t-avatarLine${isEmphasis ? " is-emphasis" : ""}`}
              >
                {line}
              </span>
            );
          })}
        </span>
        {segment.bodyLines?.length ? (
          <span className="t-avatarBody">
            {segment.bodyLines.map((line, lineIdx) => (
              <span
                key={`avatar-body-line-${lineIdx}`}
                className="t-avatarLine"
              >
                {line}
              </span>
            ))}
          </span>
        ) : null}
      </span>

      {allowModal && isOpen ? (
        <div className="t-avatarModal" role="dialog" aria-modal="true">
          <div
            className="t-avatarModal__backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="t-avatarModal__content">
            <button
              type="button"
              className="t-avatarModal__close"
              aria-label="Close photo"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <img
              src={segment.image}
              alt={
                segment.label
                  ? `${segment.label} avatar full view`
                  : "avatar full view"
              }
            />
            {segment.label ? (
              <span className="t-avatarModal__caption">{segment.label}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightQuery(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(escapeRegex);

  if (!tokens.length) return escaped;
  const regex = new RegExp(`(${tokens.join("|")})`, "gi");
  return escaped.replace(regex, "<mark>$1</mark>");
}

function renderSearchSnippet(
  hit: SearchHitsSegmentType["hits"][number],
  query: string,
): string {
  const renderLine = (text: string, emphasize?: boolean) => {
    const body = highlightQuery(text, query);
    return `${emphasize ? '<span class="t-searchLineFocus">' : ""}${body}${emphasize ? "</span>" : ""}`;
  };

  const lines: string[] = [];

  hit.before.forEach((text) => {
    lines.push(renderLine(text));
  });

  lines.push(renderLine(hit.line, true));

  hit.after.forEach((text, idx) => {
    lines.push(renderLine(text));
  });

  return lines.join("\n");
}

function SearchHits({
  segment,
  executeCommand,
}: {
  segment: SearchHitsSegmentType;
  executeCommand: ExecuteCommand;
}) {
  const { hits, query } = segment;
  const [open, setOpen] = useState(true);
  const [groupCollapsed, setGroupCollapsed] = useState<Record<string, boolean>>(
    {},
  );
  const [itemCollapsed, setItemCollapsed] = useState<Record<string, boolean>>(
    {},
  );

  const grouped = useMemo(() => {
    type Entry = {
      key: string;
      title: string;
      readCommand: string;
      downloadCommand?: string;
      snippets: typeof hits;
    };
    const by: Record<string, { label: string; items: Entry[] }> = {};
    const labelFor: Record<
      SearchHitsSegmentType["hits"][number]["source"],
      string
    > = {
      blog: "Blogs",
      resume: "Resume",
      work: "Work",
    };
    hits.forEach((hit) => {
      const sourceKey = hit.source;
      const entryKey = `${hit.source}::${hit.title}::${hit.readCommand}::${hit.downloadCommand || ""}`;

      if (!by[sourceKey]) {
        by[sourceKey] = {
          label: labelFor[hit.source] || hit.source,
          items: [],
        };
      }

      const existing = by[sourceKey].items.find(
        (item) => item.key === entryKey,
      );
      if (existing) {
        existing.snippets.push(hit);
      } else {
        by[sourceKey].items.push({
          key: entryKey,
          title: hit.title,
          readCommand: hit.readCommand,
          downloadCommand: hit.downloadCommand,
          snippets: [hit],
        });
      }
    });
    return by;
  }, [hits]);

  if (!open) return null;

  const toggleGroup = (key: string) =>
    setGroupCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleItem = (id: string) =>
    setItemCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="t-searchModal" role="dialog" aria-modal="true">
      <div className="t-searchOverlay" />
      <div className="t-searchWindow">
        <div className="t-searchHeader">
          <div className="t-searchHeaderLeft">
            <span className="t-searchEyebrow">Search</span>
            <span className="t-searchHeading">
              “{query}” — {hits.length} result{hits.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="t-searchHeaderActions">
            <button
              type="button"
              className="t-searchClose t-pressable"
              aria-label="Close search results"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
        </div>

        <div className="t-searchGroups">
          {Object.entries(grouped).map(([key, group]) => {
            const collapsed = groupCollapsed[key] ?? false;
            return (
              <div className="t-searchGroup" key={key} data-source={key}>
                <button
                  type="button"
                  className="t-searchGroupHead"
                  onClick={() => toggleGroup(key)}
                >
                  <span className="t-searchCaret">{collapsed ? "▸" : "▾"}</span>
                  <span className={`t-searchTag is-${key}`}>{group.label}</span>
                  <span className="t-searchCount">{group.items.length}</span>
                </button>

                {!collapsed ? (
                  <div className="t-searchGroupBody">
                    {group.items.map((entry) => {
                      const folded = itemCollapsed[entry.key] ?? false;
                      return (
                        <div
                          className="t-searchHit"
                          key={entry.key}
                          data-source={key}
                        >
                          <button
                            type="button"
                            className="t-searchHead"
                            onClick={() => toggleItem(entry.key)}
                          >
                            <span className="t-searchCaret">
                              {folded ? "▸" : "▾"}
                            </span>
                            <span className="t-searchTitle">{entry.title}</span>
                          </button>

                          {!folded ? (
                            <>
                              {entry.snippets.map((hit) => (
                                <pre
                                  key={hit.id}
                                  className="t-searchSnippet"
                                  dangerouslySetInnerHTML={{
                                    __html: renderSearchSnippet(hit, query),
                                  }}
                                />
                              ))}
                              <div className="t-searchActions">
                                <button
                                  type="button"
                                  className="t-commandLink t-pressable"
                                  onClick={() =>
                                    executeCommand(entry.readCommand)
                                  }
                                  aria-label={`Read more from ${entry.title}`}
                                >
                                  Read more
                                </button>
                                {entry.downloadCommand ? (
                                  <button
                                    type="button"
                                    className="t-commandLink t-pressable"
                                    onClick={() =>
                                      executeCommand(entry.downloadCommand!)
                                    }
                                    aria-label={`Download ${entry.title}`}
                                  >
                                    Download
                                  </button>
                                ) : null}
                              </div>
                              {entry.downloadCommand ? (
                                <DownloadIntegrity
                                  command={entry.downloadCommand}
                                />
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OperatingModel({ segment }: { segment: OperatingModelSegment }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openDescriptionIndex, setOpenDescriptionIndex] = useState<
    number | null
  >(null);
  const headingId = "intro-operating-title";

  useEffect(() => {
    if (openDescriptionIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDescriptionIndex(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDescriptionIndex]);

  const activateStep = (index: number) => {
    setActiveIndex(index);
    setOpenDescriptionIndex((current) => (current === index ? current : null));
  };

  return (
    <section className="intro-operating" aria-labelledby={headingId}>
      <div className="intro-sectionKicker font-mono">{segment.kicker}</div>
      <h2 id={headingId} className="intro-sectionTitle">
        {segment.title}
      </h2>
      <div className="intro-operatingDeck" role="list">
        {segment.steps.map((step, index) => {
          const isActive = activeIndex === index;
          const isDescriptionOpen = openDescriptionIndex === index;
          const tooltipId = `intro-operating-${step.index}-description`;

          return (
            <div
              key={step.index}
              className={`intro-operatingFold${isActive ? " is-active" : ""}`}
              role="listitem"
              onMouseEnter={() => activateStep(index)}
            >
              <button
                type="button"
                className="intro-operatingFoldButton"
                aria-pressed={isActive}
                onClick={() => activateStep(index)}
                onFocus={() => activateStep(index)}
              >
                <span className="intro-stepIndex font-mono">{step.index}</span>
                <span className="intro-operatingTitle">{step.title}</span>
              </button>
              <span className="intro-operatingCopy" aria-hidden={!isActive}>
                <span className="intro-operatingSummary">
                  {step.summary}
                </span>
                {isActive ? (
                  <span className="intro-descriptionAnchor">
                    <button
                      type="button"
                      className="intro-descriptionButton"
                      aria-label={`${isDescriptionOpen ? "Hide" : "Show"} ${step.title} description`}
                      aria-expanded={isDescriptionOpen}
                      aria-controls={tooltipId}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenDescriptionIndex((current) =>
                          current === index ? null : index,
                        );
                      }}
                    >
                      <Info size={14} aria-hidden="true" />
                    </button>
                    {isDescriptionOpen ? (
                      <span
                        id={tooltipId}
                        className="intro-descriptionTooltip"
                        role="tooltip"
                      >
                        {step.description}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ClientProofStrip({ segment }: { segment: ClientProofSegment }) {
  const [activeClient, setActiveClient] = useState<ClientProofItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const instanceId = useId().replace(/:/g, "");
  const headingId = `intro-client-proof-title-${instanceId}`;

  useEffect(() => {
    if (!activeClient) return;

    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveClient(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeClient]);

  const modal =
    activeClient && typeof document !== "undefined"
      ? createPortal(
          <div
            className="intro-clientModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`intro-client-modal-title-${instanceId}-${activeClient.slug}`}
            onClick={() => setActiveClient(null)}
          >
            <div
              className="intro-clientModalPanel"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                ref={closeButtonRef}
                type="button"
                className="intro-clientModalClose"
                aria-label="Close client details"
                onClick={() => setActiveClient(null)}
              >
                ×
              </button>
              <img
                className="intro-clientModalLogo"
                src={activeClient.logoPath}
                alt={`${activeClient.name} logo`}
                decoding="async"
              />
              <span
                id={`intro-client-modal-title-${instanceId}-${activeClient.slug}`}
                className="intro-clientModalTitle"
              >
                {activeClient.name}
              </span>
              <span className="intro-clientModalRow">
                <strong>Mission</strong>
                {activeClient.mission}
              </span>
              <span className="intro-clientModalRow">
                <strong>Outcome</strong>
                {activeClient.outcome}
              </span>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span className="intro-clientProof" aria-labelledby={headingId}>
        <span id={headingId} className="intro-proofLabel">
          {segment.title}
        </span>
        <span className="intro-clientGrid" role="list">
          {segment.items.map((item) => {
            const tooltipId = `intro-client-${instanceId}-${item.slug}-tooltip`;
            return (
              <span
                key={item.slug}
                className="intro-clientSlot"
                role="listitem"
              >
                <button
                  type="button"
                  className="intro-clientItem"
                  aria-label={getClientProofAriaLabel(item)}
                  aria-describedby={tooltipId}
                  aria-haspopup="dialog"
                  aria-expanded={activeClient?.slug === item.slug}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveClient(item);
                  }}
                >
                  <img
                    src={item.logoPath}
                    alt={`${item.name} logo`}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                  <span
                    id={tooltipId}
                    className="intro-clientTooltip"
                    role="tooltip"
                  >
                    <span className="intro-clientTooltipTitle">
                      {item.name}
                    </span>
                    <span className="intro-clientTooltipRow">
                      <strong>Mission</strong>
                      {item.mission}
                    </span>
                    <span className="intro-clientTooltipRow">
                      <strong>Outcome</strong>
                      {item.outcome}
                    </span>
                  </span>
                </button>
              </span>
            );
          })}
        </span>
      </span>
      {modal}
    </>
  );
}

function renderSegment(
  segment: LineSegment,
  key: string,
  executeCommand: ExecuteCommand,
) {
  switch (segment.type) {
    case "text":
      return <span key={key}>{segment.text}</span>;
    case "link": {
      const attrs = segment as LinkSegment;
      const ariaLabel = attrs.ariaLabel || attrs.label;
      return (
        <a
          key={key}
          className="t-link"
          href={attrs.href}
          aria-label={ariaLabel}
          target={attrs.newTab ? "_blank" : undefined}
          rel={attrs.newTab ? "noopener noreferrer" : undefined}
        >
          {attrs.label}
        </a>
      );
    }
    case "avatar":
      return (
        <AvatarMessageSegment
          key={key}
          segment={segment as AvatarSegment}
          executeCommand={executeCommand}
        />
      );
    case "command": {
      const attrs = segment as CommandSegment;
      const ariaLabel = attrs.ariaLabel || `Run ${attrs.command}`;
      if (attrs.variant === "sparkle") {
        return (
          <SparkleCommandButton
            key={key}
            label={attrs.label}
            ariaLabel={ariaLabel}
            onClick={() =>
              executeCommand(attrs.command, { typing: attrs.typing })
            }
          />
        );
      }
      const variantClass =
        attrs.variant === "primary"
          ? " is-primary"
          : attrs.variant === "secondary"
            ? " is-secondary"
            : attrs.variant === "link"
              ? " is-link"
              : "";
      return (
        <button
          key={key}
          type="button"
          className={`t-commandLink t-pressable${variantClass}`}
          onClick={() =>
            executeCommand(attrs.command, { typing: attrs.typing })
          }
          aria-label={ariaLabel}
        >
          <span className="t-commandLabel">{attrs.label}</span>
        </button>
      );
    }
    case "copy": {
      return <CopyButton key={key} segment={segment as CopySegment} />;
    }
    case "faq": {
      const faq = segment as FaqSegment;
      return <FaqAccordion key={key} items={faq.items} />;
    }
    case "logs": {
      const logs = segment as LogSegment;
      return <LogAccordion key={key} items={logs.items} />;
    }
    case "markdown": {
      return <MarkdownBlock key={key} segment={segment as MarkdownSegment} />;
    }
    case "work": {
      return <WorkGrid key={key} segment={segment as WorkSegment} />;
    }
    case "operatingModel": {
      return (
        <OperatingModel key={key} segment={segment as OperatingModelSegment} />
      );
    }
    case "clientProof": {
      return (
        <ClientProofStrip key={key} segment={segment as ClientProofSegment} />
      );
    }
    case "activityTree": {
      return (
        <ActivityTree
          key={key}
          segment={segment as ActivityTreeSegment}
          executeCommand={executeCommand}
        />
      );
    }
    case "searchHits": {
      return (
        <SearchHits
          key={key}
          segment={segment as SearchHitsSegmentType}
          executeCommand={executeCommand}
        />
      );
    }
    default:
      return null;
  }
}

function FaqAccordion({ items }: { items: FaqSegment["items"] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="t-faq">
      {items.map((item, idx) => {
        const open = openIndex === idx;
        return (
          <div key={idx} className={`t-faqItem${open ? " is-open" : ""}`}>
            <button
              type="button"
              className="t-faqSummary"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : idx)}
            >
              <span className="t-faqChevron" aria-hidden="true">
                ▸
              </span>
              {item.question}
            </button>
            <div
              className="t-faqAnswer"
              style={{ maxHeight: open ? "320px" : "0px" }}
            >
              <div className="t-faqAnswerInner">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogAccordion({ items }: { items: LogSegment["items"] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const panelInnerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [panelHeights, setPanelHeights] = useState<Record<number, number>>({});
  const openItem = openIndex === null ? null : items[openIndex];
  const showCollapseButton = openItem?.markdownVariant === "blog";

  const syncPanelHeight = (idx: number) => {
    const panelInner = panelInnerRefs.current[idx];
    if (!panelInner) return;

    const nextHeight = Math.ceil(
      panelInner.getBoundingClientRect().height || panelInner.scrollHeight,
    );
    setPanelHeights((current) =>
      current[idx] === nextHeight ? current : { ...current, [idx]: nextHeight },
    );
  };

  useLayoutEffect(() => {
    if (openIndex === null) return;

    syncPanelHeight(openIndex);
    const panelInner = panelInnerRefs.current[openIndex];
    if (!panelInner) return;

    const handleResize = () => syncPanelHeight(openIndex);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleResize)
        : null;

    observer?.observe(panelInner);
    window.addEventListener("resize", handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [openIndex, items]);

  return (
    <div className="t-logAccordion">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        const displayDate = formatMonthYear(item.date);
        const summaryMeta = item.readingTimeLabel || displayDate;
        const compactReadingTime =
          item.readingMinutes === undefined ? null : `${item.readingMinutes}'`;
        const contentKind =
          item.markdownVariant === "blog" ? "blog post" : "entry";
        const panelId = `log-panel-${item.slug || idx}`;
        const summaryHelpId = `log-summary-help-${item.slug || idx}`;
        const shareCommand = item.slug && `blog read ${item.slug}`;
        const shareText =
          shareCommand && typeof window !== "undefined"
            ? buildShareLink(shareCommand, window.location.href)
            : `${displayDate} — ${item.note}`;
        return (
          <div
            key={idx}
            className={`t-logItem${isOpen ? " is-open" : ""}${item.markdownVariant === "blog" ? " is-blog" : ""}`}
          >
            <button
              type="button"
              className="t-logSummary"
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-describedby={summaryHelpId}
              aria-label={`${isOpen ? "Collapse" : "Open"} ${contentKind}: ${item.note}${summaryMeta ? `. ${summaryMeta}.` : ""} This row is clickable.`}
              data-clickable-row="true"
              onClick={() => {
                if (isOpen) {
                  setOpenIndex(null);
                  return;
                }

                syncPanelHeight(idx);
                setOpenIndex(idx);
              }}
            >
              <span className="t-logChevron" aria-hidden="true">
                ▸
              </span>
              <span className="t-logTitle">{item.note}</span>
              {summaryMeta ? (
                <span className="t-logReadTime" aria-hidden="true">
                  {compactReadingTime || summaryMeta}
                  {compactReadingTime ? (
                    <Clock
                      className="t-logReadTimeIcon"
                      size={15}
                      strokeWidth={2.15}
                    />
                  ) : null}
                </span>
              ) : null}
              <span id={summaryHelpId} className="t-srOnly">
                Clickable row: press Enter or Space to{" "}
                {isOpen ? "collapse" : "open"} this {contentKind}.
              </span>
            </button>

            <div
              id={panelId}
              className="t-logPanel"
              style={{
                maxHeight: isOpen ? `${panelHeights[idx] ?? 0}px` : "0px",
              }}
            >
              <div
                ref={(node) => {
                  panelInnerRefs.current[idx] = node;
                }}
                className="t-logPanelInner"
              >
                {item.body ? (
                  <MarkdownBlock
                    segment={{
                      type: "markdown",
                      markdown: item.body,
                      variant: item.markdownVariant,
                      date: item.date,
                    }}
                  />
                ) : (
                  <div className="t-logEmpty">No content</div>
                )}
                {shareCommand ? (
                  <button
                    type="button"
                    className="t-logShare"
                    onClick={(e) => {
                      e.stopPropagation();
                      void navigator.clipboard.writeText(shareText);
                    }}
                    aria-label={`Copy share command for ${item.note}`}
                    title="Copy to share"
                  >
                    Copy to share
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      {showCollapseButton ? (
        <button
          type="button"
          className="t-logCollapseFloating"
          aria-label="Collapse open blog post"
          title="Collapse open blog post"
          onClick={() => setOpenIndex(null)}
        >
          <ArrowUp size={20} strokeWidth={2.25} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function WorkGrid({ segment }: { segment: WorkSegment }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = segment.items || [];

  const openItem = openIndex !== null ? items[openIndex] : null;

  useEffect(() => {
    if (openIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openIndex]);

  const getCardSummary = (item: SampleWork) => {
    const lead = item.description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));

    if (!lead) return "Details coming soon.";

    return lead
      .replace(/^[-*]\s+/, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1");
  };

  const modalMarkdown = openItem ? openItem.description.trim() : "";

  return (
    <div className="t-work">
      <div className="t-proofHeader">
        <div className="t-proofTitle font-extralight">
          Less fragility. More control
        </div>
        {segment.clientProof ? (
          <ClientProofStrip segment={segment.clientProof} />
        ) : null}
        <div className="t-proofSubtitle"></div>
      </div>

      <div className="t-workGrid">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className={`t-workCard t-proofCard${idx < 3 ? " is-headline" : ""}`}
            onClick={() => setOpenIndex(idx)}
            aria-label={`Open ${item.title} details`}
          >
            <div className="t-proofMain">
              <div className="t-proofPain">{item.title}</div>
              <div className="t-proofOutcome">{getCardSummary(item)}</div>
            </div>
            <div className="t-proofFooter">
              <div className="t-workTags" aria-label="Tags">
                {(item.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="t-workTag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {openItem ? (
        <div
          className="t-workModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${openItem.title} details`}
          onClick={() => setOpenIndex(null)}
        >
          <div className="t-workModal" onClick={(e) => e.stopPropagation()}>
            <div className="t-workModalHead">
              <div>
                <div className="t-workModalEyebrow">Case study</div>
                <div className="t-workModalTitle">{openItem.title}</div>
                {openItem.tags?.length ? (
                  <div className="t-proofStats" aria-label="Case study tags">
                    {openItem.tags.map((tag) => (
                      <span key={tag} className="t-workTag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="t-workModalClose"
                onClick={() => setOpenIndex(null)}
                aria-label="Close case study"
              >
                ×
              </button>
            </div>
            <div className="t-proofModalBody">
              <div className="t-proofMarkdown t-proofModalMarkdown">
                <MarkdownBlock
                  segment={{ type: "markdown", markdown: modalMarkdown }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActivityTree({
  segment,
  executeCommand,
}: {
  segment: ActivityTreeSegment;
  executeCommand: ExecuteCommand;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    const walk = (nodes: ActivityTreeNode[]) => {
      nodes.forEach((node) => {
        state[node.id] = false;
        if (node.children?.length) walk(node.children);
      });
    };
    walk(segment.nodes);
    return state;
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const toggleNode = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNodes = (nodes: ActivityTreeNode[]) => (
    <ul className="t-activityTreeList">
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const isOpen = hasChildren ? open[node.id] !== false : false;
        const isActive = activeNodeId === node.id;

        const handleSelect = () => {
          setActiveNodeId((prev) => (prev === node.id ? null : node.id));
        };

        return (
          <li key={node.id} className="t-activityTreeNode">
            <div className="t-activityTreeHead">
              {hasChildren ? (
                <button
                  type="button"
                  className="t-activityTreeToggle"
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.title}`}
                  aria-expanded={isOpen}
                  onClick={() => toggleNode(node.id)}
                >
                  {isOpen ? "▾" : "▸"}
                </button>
              ) : (
                <span className="t-activityTreeSpacer" aria-hidden="true" />
              )}

              <div className="t-activityTreeContent">
                <div className="t-activityTreeTitleRow">
                  {node.command ? (
                    <button
                      type="button"
                      className="t-activityTreeAction"
                      aria-label={`Run ${node.title}: ${node.command}`}
                      onClick={() => {
                        handleSelect();
                        if (node.command) executeCommand(node.command);
                      }}
                    >
                      <span className="t-activityTreeTitle">{node.title}</span>
                      {node.period ? (
                        <span className="t-activityTreePeriod">
                          {node.period}
                        </span>
                      ) : null}
                      <span className="t-activityTreeRun" aria-hidden="true">
                        RUN
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="t-activityTreeTitleButton"
                      aria-label={`Show details for ${node.title}`}
                      aria-pressed={isActive}
                      onClick={handleSelect}
                    >
                      <span className="t-activityTreeTitle">{node.title}</span>
                      {node.period ? (
                        <span className="t-activityTreePeriod">
                          {node.period}
                        </span>
                      ) : null}
                    </button>
                  )}
                </div>

                {node.summary && isActive ? (
                  <div className="t-activityTreeSummary">{node.summary}</div>
                ) : null}

                {node.tags?.length && isActive ? (
                  <div className="t-activityTreeTags">
                    {node.tags.map((tag) => (
                      <span
                        key={`${node.id}-${tag}`}
                        className="t-activityTreeTag"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {hasChildren && isOpen ? renderNodes(node.children!) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="t-activityTree">
      {segment.title ? (
        <div className="t-activityTreeHeading">{segment.title}</div>
      ) : null}
      {renderNodes(segment.nodes)}
    </div>
  );
}

export function TerminalLineRow({
  line,
  lineIndex,
  className,
  executeCommand,
  isCommandLine,
  isCollapsed,
  isHistoricalCommand,
  prompt,
  commandText,
  onToggleCollapse,
}: TerminalLineProps) {
  const hasCommandSegments = line.some(
    (segment) => typeof segment !== "string" && segment.type === "command",
  );

  const content =
    line.length === 0
      ? [<span key={`line-${lineIndex}-empty`}></span>]
      : line.map((segment, idx) =>
          renderSegment(
            segment,
            `line-${lineIndex}-seg-${idx}`,
            executeCommand,
          ),
        );

  const promptGlyph = prompt || ">";
  const commandLabel = (() => {
    if (commandText) return commandText;
    const first = line[0];
    if (
      line.length === 1 &&
      typeof first !== "string" &&
      first.type === "text"
    ) {
      const raw = first.text || "";
      const prefix = `${promptGlyph} `;
      return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
    }
    return typeof line[0] === "string" ? (line[0] as string) : "";
  })();

  const interactiveContent = isCommandLine ? (
    <button
      type="button"
      className={`t-lineCommand${isCollapsed ? " is-collapsed" : " is-open"}${
        isHistoricalCommand ? " is-historical" : ""
      }`}
      aria-expanded={!isCollapsed}
      aria-label={`${isCollapsed ? "Expand" : "Collapse"} output for ${commandLabel || "command"}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggleCollapse?.();
      }}
    >
      <span className="t-lineCaret" aria-hidden="true">
        {promptGlyph}
      </span>
      <span className="t-lineCommandText">{commandLabel}</span>
    </button>
  ) : (
    content
  );

  return (
    <span
      className={`${className || ""}${hasCommandSegments ? " has-commands" : ""}`.trim()}
      data-line-index={lineIndex}
    >
      {interactiveContent}
    </span>
  );
}
