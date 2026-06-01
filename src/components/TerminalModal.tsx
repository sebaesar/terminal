import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Terminal, X } from "lucide-react";
import Screen from "@components/Screen";
import { useFloatingWindowResize } from "@hooks/useFloatingWindowResize";
import "./terminal/chat/chat.css";
import "./TerminalModal.css";

const terminalResizeInitialSize = { width: 920, height: 720 };
const terminalResizeMinSize = { width: 560, height: 420 };
const floatingWindowTop = 86;
const floatingWindowRight = 18;
const restorePointerOffsetY = 20;
const snapToTopThreshold = 8;
const snapViewportMargin = 8;
const activeFloatingWindowZIndex = 90;

type TerminalModalProps = {
  contactEmail: string;
  onAskAi: () => void;
  onActivate: () => void;
  onBookCall: () => void;
  onClose: () => void;
  zIndex: number;
};

export default function TerminalModal({
  contactEmail,
  onAskAi,
  onActivate,
  onBookCall,
  onClose,
  zIndex,
}: TerminalModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const resize = useFloatingWindowResize({
    initialSize: terminalResizeInitialSize,
    minSize: terminalResizeMinSize,
    disabled: isMaximized,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isMaximized) return;
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStartRef.current = null;
    activePointerRef.current = null;
  }, [isMaximized]);

  const resetDragState = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    activePointerRef.current = null;
  };

  const endDrag = (event?: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event?.currentTarget && activePointerRef.current !== null) {
      event.currentTarget.releasePointerCapture(activePointerRef.current);
    }
    resetDragState();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
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

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
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

  const wrapTransformStyle = {
    ...resize.style,
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
    zIndex:
      isDragging || resize.isResizing ? activeFloatingWindowZIndex : zIndex,
  };

  return (
    <div
      className={`chat-wrap terminal-modalWrap${
        isMaximized ? " is-maximized" : ""
      }${resize.resizeEnabled ? " is-resizable" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
      style={wrapTransformStyle}
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
    >
      <div
        className={`chat-window terminal-modalWindow${
          isMaximized ? " is-maximized" : ""
        }`}
      >
        <div
          className={`chat-header terminal-modalHeader${
            isDragging ? " is-dragging" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="chat-title">
            <Terminal size={18} />
            <span>Terminal</span>
          </div>
          <div className="chat-actions">
            <button
              className={`ghost t-pressable${isMaximized ? " is-active" : ""}`}
              title={isMaximized ? "Restore size" : "Maximize"}
              aria-label={
                isMaximized ? "Restore terminal size" : "Maximize terminal"
              }
              onClick={() => setIsMaximized((prev) => !prev)}
            >
              <Maximize2 size={16} />
            </button>
            <button
              className="ghost t-pressable"
              title="Minimize"
              aria-label="Minimize terminal"
              onClick={onClose}
            >
              <Minus size={16} />
            </button>
            <button
              className="ghost t-pressable"
              title="Close"
              aria-label="Close terminal"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="terminal-modalBody">
          <Screen
            contact={{ email: contactEmail }}
            onAskAi={onAskAi}
            onBookCall={onBookCall}
            presentation="embedded"
            showChatDock={false}
          />
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
  );
}
