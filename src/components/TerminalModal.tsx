import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Terminal, X } from "lucide-react";
import Screen from "@components/Screen";
import "./terminal/chat/chat.css";
import "./TerminalModal.css";

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
    if (isMaximized) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest("button")) return;
    event.preventDefault();
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
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
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
    zIndex,
  };

  return (
    <div
      className={`chat-wrap terminal-modalWrap${
        isMaximized ? " is-maximized" : ""
      }`}
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
      </div>
    </div>
  );
}
