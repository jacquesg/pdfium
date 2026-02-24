import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface UseResizeOptions {
  min?: number;
  max?: number;
  initial?: number;
}

interface UseResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  style: CSSProperties;
  role: 'separator';
  'aria-orientation': 'vertical';
  'aria-label': string;
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  tabIndex: number;
  'data-pdfium-resize-handle': '';
}

interface UseResizeReturn {
  width: number;
  handleProps: UseResizeHandleProps;
  isResizing: boolean;
}

function useResize(options: UseResizeOptions = {}): UseResizeReturn {
  const { min = 200, max = 500, initial = 280 } = options;

  const [width, setWidth] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const activeCleanupRef = useRef<(() => void) | null>(null);

  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      activeCleanupRef.current?.();
      activeCleanupRef.current = null;

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      elementRef.current = target;
      dragRef.current = { startX: e.clientX, startWidth: width };
      setIsResizing(true);

      const isActiveTarget = () => elementRef.current === target;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isActiveTarget()) return;
        const drag = dragRef.current;
        if (!drag) return;
        const delta = moveEvent.clientX - drag.startX;
        setWidth(clamp(drag.startWidth + delta));
      };

      const finishResize = (pointerId: number) => {
        if (!isActiveTarget()) return;
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          // Pointer capture may already be released if target detached.
        }
        activeCleanupRef.current?.();
        activeCleanupRef.current = null;
        setIsResizing(false);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        finishResize(upEvent.pointerId);
      };

      const onPointerCancel = (cancelEvent: PointerEvent) => {
        finishResize(cancelEvent.pointerId);
      };

      activeCleanupRef.current = () => {
        dragRef.current = null;
        elementRef.current = null;
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerUp);
        target.removeEventListener('pointercancel', onPointerCancel);
      };

      target.addEventListener('pointermove', onPointerMove);
      target.addEventListener('pointerup', onPointerUp);
      target.addEventListener('pointercancel', onPointerCancel);
    },
    [width, clamp],
  );

  useEffect(() => {
    return () => {
      activeCleanupRef.current?.();
      activeCleanupRef.current = null;
    };
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setWidth((w) => clamp(w - 10));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setWidth((w) => clamp(w + 10));
      }
    },
    [clamp],
  );

  const handleProps: UseResizeHandleProps = {
    onPointerDown,
    onKeyDown,
    style: { cursor: 'col-resize' },
    role: 'separator',
    'aria-orientation': 'vertical',
    'aria-label': 'Resize sidebar',
    'aria-valuenow': width,
    'aria-valuemin': min,
    'aria-valuemax': max,
    tabIndex: 0,
    'data-pdfium-resize-handle': '',
  };

  return { width, handleProps, isResizing };
}

export { useResize };
export type { UseResizeHandleProps, UseResizeOptions, UseResizeReturn };
