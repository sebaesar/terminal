import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { marked } from "marked";
import {
  Bot,
  CalendarDays,
  ExternalLink,
  Mail,
  Maximize2,
  Minus,
  RotateCcw,
  SendIcon,
  StopCircle,
  X,
} from "lucide-react";
import { useChatStore } from "@stores/chatStore";
import { useFloatingWindowResize } from "@hooks/useFloatingWindowResize";
import { getChatActions, getChatDisplayContent } from "./chatActions";
import "./chat.css";

const chatResizeInitialSize = { width: 500, height: 500 };
const chatResizeMinSize = { width: 360, height: 360 };
const floatingWindowTop = 86;
const floatingWindowRight = 18;
const restorePointerOffsetY = 20;
const snapToTopThreshold = 8;
const snapViewportMargin = 8;
const activeFloatingWindowZIndex = 90;

const SUGGESTED_PROMPTS = [
  "Can you turn my uncertainty into an execution plan?",
  "What kind of work are you best suited for?",
  "Show me proof of reliability/security thinking.",
  "Can you work on AI/Web3/full-stack systems?",
  "How should I contact you?",
  "What work do you avoid taking on?",
];

const TONE_PRESETS = [
  {
    key: "technical" as const,
    label: "Technical",
  },
  {
    key: "non-technical" as const,
    label: "Plain English",
  },
];

type ChatDockProps = {
  onBookCall?: () => void;
  contactEmail?: string;
  onActivate?: () => void;
  windowZIndex?: number;
};

export function ChatDock({
  onBookCall,
  contactEmail = "onboarding@failuresmith.xyz",
  onActivate,
  windowZIndex,
}: ChatDockProps) {
  // Select all needed slices in one selector and shallow-compare to cut down on re-renders.
  const {
    messages,
    input,
    loading,
    isOpen,
    isMinimized,
    unread,
    tone,
    maximizeOnOpen,
    setInput,
    setTone,
    sendMessage,
    clear,
    toggleChat,
    minimizeChat,
    cancel,
    markRead,
    setMaximizeOnOpen,
  } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      input: state.input,
      loading: state.loading,
      isOpen: state.isOpen,
      isMinimized: state.isMinimized,
      unread: state.unread,
      tone: state.tone,
      maximizeOnOpen: state.maximizeOnOpen,
      setInput: state.setInput,
      setTone: state.setTone,
      sendMessage: state.sendMessage,
      clear: state.clear,
      toggleChat: state.toggleChat,
      minimizeChat: state.minimizeChat,
      cancel: state.cancel,
      markRead: state.markRead,
      setMaximizeOnOpen: state.setMaximizeOnOpen,
    })),
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const suggestedPromptSendingRef = useRef(false);
  const resize = useFloatingWindowResize({
    initialSize: chatResizeInitialSize,
    minSize: chatResizeMinSize,
    disabled: isMaximized,
  });

  const focusInput = useCallback(
    () => requestAnimationFrame(() => inputRef.current?.focus()),
    [],
  );

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    if (unread > 0) markRead();
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, markRead, unread]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isMinimized) {
        e.preventDefault();
        minimizeChat();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isMinimized, toggleChat, minimizeChat]);

  useEffect(() => {
    if (!isOpen) setIsMaximized(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && maximizeOnOpen) {
      setIsMaximized(true);
      setMaximizeOnOpen(false);
    }
  }, [isOpen, maximizeOnOpen, setMaximizeOnOpen]);

  useEffect(() => {
    if (!isMaximized) return;
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStartRef.current = null;
    activePointerRef.current = null;
  }, [isMaximized]);

  const hasStreamingChunk = useMemo(
    () => messages.some((m) => m.id === "streaming"),
    [messages],
  );

  const showTypingIndicator = loading && !hasStreamingChunk;

  const handleTonePreset = useCallback(
    (presetKey: "technical" | "non-technical") => {
      setTone(presetKey);
    },
    [setTone],
  );

  const resetDragState = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    activePointerRef.current = null;
  };

  const endDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event?.currentTarget && activePointerRef.current !== null) {
      event.currentTarget.releasePointerCapture(activePointerRef.current);
    }
    resetDragState();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button")) return;
    event.preventDefault();
    if (isMaximized) {
      const width = resize.size.width;
      const height = resize.size.height;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const left = Math.min(
        Math.max(event.clientX - width / 2, snapViewportMargin),
        Math.max(snapViewportMargin, viewportWidth - width - snapViewportMargin),
      );
      const top = Math.min(
        Math.max(event.clientY - restorePointerOffsetY, snapViewportMargin),
        Math.max(snapViewportMargin, viewportHeight - height - snapViewportMargin),
      );
      const baseLeft = viewportWidth - floatingWindowRight - width;

      setIsMaximized(false);
      setDragOffset({
        x: left - baseLeft,
        y: top - floatingWindowTop,
      });
    }
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    if (
      !isMaximized &&
      dragStartRef.current.y > snapToTopThreshold &&
      event.clientY <= snapToTopThreshold
    ) {
      if (activePointerRef.current !== null) {
        event.currentTarget.releasePointerCapture(activePointerRef.current);
      }
      setIsMaximized(true);
      resetDragState();
      return;
    }
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    if (deltaX === 0 && deltaY === 0) return;
    setDragOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    endDrag(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    endDrag(event);
  };

  const showToneSelector = !messages.some((message) => message.role === "user");

  const handleSuggestedPrompt = useCallback(
    async (prompt: string) => {
      if (loading || suggestedPromptSendingRef.current) return;
      suggestedPromptSendingRef.current = true;
      try {
        await sendMessage(prompt);
      } finally {
        suggestedPromptSendingRef.current = false;
        focusInput();
      }
    },
    [focusInput, loading, sendMessage],
  );

  const renderedMessages = useMemo(() => {
    const nodes: React.ReactNode[] = [];

    messages.forEach((message) => {
      const roleClass =
        message.role === "user"
          ? "chat-bubble user"
          : message.role === "assistant"
            ? "chat-bubble bot"
            : "chat-bubble intro";

      const actions =
        message.role === "assistant"
          ? getChatActions(message.content || "", contactEmail)
          : [];
      const displayContent =
        message.role === "assistant"
          ? getChatDisplayContent(message.content || "", actions)
          : message.content;

      nodes.push(
        <div key={message.id} className={roleClass}>
          {message.role === "assistant" && (
            <span className="chat-avatar" aria-hidden="true">
              <Bot size={18} />
            </span>
          )}
          {message.role === "assistant" ? (
            <div className="chat-messageBody">
              <div
                className="chat-content"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(displayContent),
                }}
              />
              {actions.length ? (
                <div className="chat-actionList" aria-label="Suggested actions">
                  {actions.map((action) =>
                    action.kind === "booking" && onBookCall ? (
                      <button
                        key={action.id}
                        type="button"
                        className="chat-actionButton"
                        onClick={(event) => {
                          event.stopPropagation();
                          onBookCall();
                        }}
                      >
                        <CalendarDays size={14} />
                        <span>{action.label}</span>
                      </button>
                    ) : (
                      <a
                        key={action.id}
                        className="chat-actionButton"
                        href={action.href}
                        target={action.href.startsWith("mailto:") ? undefined : "_blank"}
                        rel={action.href.startsWith("mailto:") ? undefined : "noreferrer"}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {action.kind === "email" ? (
                          <Mail size={14} />
                        ) : (
                          <ExternalLink size={14} />
                        )}
                        <span>{action.label}</span>
                      </a>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="chat-content">{message.content}</div>
          )}
        </div>,
      );
    });

    if (showToneSelector) {
      nodes.push(
        <div
          key="chat-start-options"
          className="chat-startOptions"
        >
          <div
            className="chat-tone"
            aria-label="Tone selector"
          >
            <span id="chat-tone-label" className="chat-tone-title">
              Response style
            </span>
            <div
              className="chat-tone-options"
              role="radiogroup"
              aria-labelledby="chat-tone-label"
            >
              {TONE_PRESETS.map((preset) => (
                <label
                  key={preset.key}
                  className={`chat-tone-option${tone === preset.key ? " is-active" : ""}`}
                >
                  <input
                    type="radio"
                    name="chat-tone"
                    value={preset.key}
                    checked={tone === preset.key}
                    onChange={() => handleTonePreset(preset.key)}
                  />
                  <span className="chat-tone-radio" aria-hidden="true" />
                  <div className="chat-tone-text">
                    <span className="chat-tone-option-label">{preset.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div
            className="chat-suggestions"
            aria-labelledby="chat-suggestions-label"
          >
            <span id="chat-suggestions-label" className="chat-suggestions-title">
              Suggested prompts
            </span>
            <div className="chat-suggestionList">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chat-suggestionButton"
                  onClick={() => void handleSuggestedPrompt(prompt)}
                  disabled={loading}
                  aria-label={`Send suggested question: ${prompt}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>,
      );
    }

    return nodes;
  }, [
    handleSuggestedPrompt,
    handleTonePreset,
    loading,
    messages,
    onBookCall,
    contactEmail,
    showToneSelector,
    tone,
  ]);

  const send = async () => {
    await sendMessage();
    focusInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      minimizeChat();
    }
  };

  const wrapTransformStyle: CSSProperties = {
    ...resize.style,
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
    zIndex:
      isDragging || resize.isResizing
        ? activeFloatingWindowZIndex
        : windowZIndex,
  };

  return (
    <>
      {isOpen && !isMinimized ? (
        <div
          className={`chat-wrap${isMaximized ? " is-maximized" : ""}${
            resize.resizeEnabled ? " is-resizable" : ""
          }`}
          role="dialog"
          aria-modal="false"
          onClick={focusInput}
          onFocusCapture={onActivate}
          onPointerDownCapture={onActivate}
          style={wrapTransformStyle}
        >
          <div className={`chat-window${isMaximized ? " is-maximized" : ""}`}>
            <div
              className={`chat-header${isDragging ? " is-dragging" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div className="chat-title">
                <Bot size={18} />
                <span>Welcome!</span>
              </div>
              <div className="chat-actions">
                <button
                  className={`ghost t-pressable${isMaximized ? " is-active" : ""}`}
                  title={isMaximized ? "Restore size" : "Maximize"}
                  aria-label={isMaximized ? "Restore chatbot size" : "Maximize chatbot"}
                  onClick={() => setIsMaximized((prev) => !prev)}
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  className="ghost t-pressable"
                  title="Clear"
                  aria-label="Clear conversation"
                  onClick={clear}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="ghost t-pressable"
                  title="Minimize"
                  aria-label="Minimize chatbot"
                  onClick={minimizeChat}
                >
                  <Minus size={16} />
                </button>
                <button
                  className="ghost t-pressable"
                  title="Close"
                  aria-label="Hide chatbot"
                  onClick={toggleChat}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="chat-body" ref={listRef}>
              {renderedMessages}
              {showTypingIndicator ? (
                <div className="chat-bubble bot">
                  <span className="chat-avatar" aria-hidden="true">
                    <Bot size={18} />
                  </span>
                  <div className="chat-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-inputRow">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Describe your need"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-send t-pressable"
                onClick={loading ? cancel : send}
                aria-label={loading ? "Stop response" : "Send message"}
                disabled={loading ? false : !input.trim()}
              >
                {loading ? <StopCircle size={18} /> : <SendIcon size={18} />}
              </button>
            </div>
            {resize.resizeEnabled ? (
              <div
                className="floating-resizeHandle"
                aria-hidden="true"
                {...resize.resizeHandleProps}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ChatDock;
