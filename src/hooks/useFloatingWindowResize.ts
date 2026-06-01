import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type WindowSize = {
  width: number;
  height: number;
};

type FloatingWindowResizeOptions = {
  initialSize: WindowSize;
  minSize: WindowSize;
  disabled?: boolean;
  disableBelow?: number;
};

const viewportPadding = 32;
const viewportBottomReserve = 112;

function getViewportLimit(minSize: WindowSize) {
  if (typeof window === "undefined") return minSize;

  return {
    width: Math.max(minSize.width, window.innerWidth - viewportPadding),
    height: Math.max(minSize.height, window.innerHeight - viewportBottomReserve),
  };
}

export function useFloatingWindowResize({
  initialSize,
  minSize,
  disabled = false,
  disableBelow = 640,
}: FloatingWindowResizeOptions) {
  const [size, setSize] = useState(initialSize);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    size: WindowSize;
  } | null>(null);

  const resizeEnabled = !disabled && !isNarrow;

  const clampSize = useCallback(
    (nextSize: WindowSize) => {
      const limit = getViewportLimit(minSize);

      return {
        width: Math.min(Math.max(nextSize.width, minSize.width), limit.width),
        height: Math.min(Math.max(nextSize.height, minSize.height), limit.height),
      };
    },
    [minSize],
  );

  useEffect(() => {
    const syncViewportState = () => {
      const narrow =
        typeof window !== "undefined" && window.innerWidth <= disableBelow;
      setIsNarrow(narrow);
      setSize((current) => clampSize(current));
    };

    syncViewportState();
    window.addEventListener("resize", syncViewportState);
    return () => window.removeEventListener("resize", syncViewportState);
  }, [clampSize, disableBelow]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    resizeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      size,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setSize(
      clampSize({
        width: start.size.width + event.clientX - start.x,
        height: start.size.height + event.clientY - start.y,
      }),
    );
  };

  const endResize = (event: PointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeStartRef.current = null;
    setIsResizing(false);
  };

  const style: CSSProperties = resizeEnabled
    ? {
        width: `${size.width}px`,
        height: `${size.height}px`,
        maxWidth: `calc(100vw - ${viewportPadding}px)`,
        maxHeight: `calc(100vh - ${viewportBottomReserve}px)`,
      }
    : {};

  return {
    isResizing,
    resizeEnabled,
    size,
    resizeHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endResize,
      onPointerCancel: endResize,
    },
    style,
  };
}
