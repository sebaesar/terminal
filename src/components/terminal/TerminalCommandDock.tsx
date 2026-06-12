import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, SquareTerminal, X } from "lucide-react";
import { TerminalLineRow } from "@components/TerminalLine";
import { useTerminalController } from "@hooks/useTerminalController";
import type { AppearanceController, ContactInfo } from "@types";
import "./terminalCommandDock.css";

type TerminalCommandDockProps = {
  open: boolean;
  onClose: () => void;
  onBookCall?: () => void;
  contact?: ContactInfo;
  appearanceController?: AppearanceController;
};

export function TerminalCommandDock({
  open,
  onClose,
  onBookCall,
  contact,
  appearanceController,
}: TerminalCommandDockProps) {
  const {
    ready,
    lines,
    input,
    prompt,
    inputRef,
    scrollRef,
    handleKeyDown,
    onInputChange,
    focusInput,
    executeCommand,
    tabMatches,
    tabIndex,
    tabVisible,
  } = useTerminalController({
    prompt: ">",
    contact,
    onBookCall,
    appearanceController,
    controllerMode: "embedded",
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const focusDockInput = useCallback(() => {
    requestAnimationFrame(() => focusInput());
  }, [focusInput]);

  useEffect(() => {
    if (!open) return;
    focusDockInput();
  }, [focusDockInput, open]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, open, scrollRef]);

  useEffect(() => {
    if (!open) setIsMaximized(false);
  }, [open]);

  useEffect(() => {
    if (!isMaximized) return;
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragStartRef.current = null;
    activePointerRef.current = null;
  }, [isMaximized]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  const endDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event?.currentTarget && activePointerRef.current !== null) {
      event.currentTarget.releasePointerCapture(activePointerRef.current);
    }
    setIsDragging(false);
    dragStartRef.current = null;
    activePointerRef.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === "Escape" && !tabVisible) {
      event.preventDefault();
      onClose();
      return;
    }
    handleKeyDown(event);
  };

  if (!open) return null;

  return (
    <div
      className={`terminal-session-wrap${isMaximized ? " is-maximized" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-label="Terminal"
      onClick={focusDockInput}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div
        className={`terminal-session-window${isMaximized ? " is-maximized" : ""}${ready ? " is-ready" : ""}`}
      >
        <div
          className={`terminal-session-header${isDragging ? " is-dragging" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="terminal-session-title">
            <SquareTerminal size={18} />
            <span>Terminal</span>
          </div>
          <div className="chat-actions">
            <button
              className={`ghost t-pressable${isMaximized ? " is-active" : ""}`}
              title={isMaximized ? "Restore size" : "Maximize"}
              aria-label={isMaximized ? "Restore terminal size" : "Maximize terminal"}
              onClick={() => setIsMaximized((prev) => !prev)}
            >
              <Maximize2 size={16} />
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

        <div className="terminal-session-body" ref={scrollRef}>
          <pre className="terminal-session-output" aria-live="polite">
            {lines.map((line, index) => (
              <span key={`terminal-session-line-${index}`}>
                <TerminalLineRow
                  line={line}
                  lineIndex={index}
                  executeCommand={executeCommand}
                  prompt={prompt}
                />
                {index < lines.length - 1 ? "\n" : null}
              </span>
            ))}
          </pre>
        </div>

        <div className="terminal-session-inputRow">
          <span className="terminal-session-prompt">{prompt}</span>
          <textarea
            ref={inputRef}
            className="terminal-session-input"
            value={input}
            onChange={onInputChange}
            onKeyDown={handleInputKeyDown}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            rows={1}
            aria-label="Terminal command"
          />
        </div>

        {tabVisible && tabMatches.length ? (
          <div
            className="terminal-session-suggest"
            role="listbox"
            aria-label="Terminal suggestions"
          >
            {tabMatches.map((item, index) => (
              <div
                key={item}
                className={`terminal-session-suggestItem${index === tabIndex ? " is-active" : ""}`}
                role="option"
                aria-selected={index === tabIndex}
              >
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TerminalCommandDock;
