/**
 * Shape creation overlay.
 *
 * Provides drag-to-draw feedback for rectangle, circle, and line tools.
 * On pointer-up, calls `onCreate` with the PDF rect.
 *
 * @module react/editor/components/shape-creation-overlay
 */

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Point, Rect } from '../../../core/types.js';
import { screenToPdf } from '../../coordinates.js';
import { applyConstrainedCreationPoint, clampScreenPoint } from '../shape-constraints.js';
import type { EditorTool } from '../types.js';

const MIN_SHAPE_SIZE = 5;
const MIN_LINE_AXIS_SIZE = 1;
const MOUSE_DRAG_POINTER_ID = -1;

/**
 * Props for the `ShapeCreationOverlay` component.
 */
export interface ShapeCreationOverlayProps {
  /** The active shape tool ('rectangle', 'circle', or 'line'). */
  readonly tool: EditorTool;
  /** Container width in pixels. */
  readonly width: number;
  /** Container height in pixels. */
  readonly height: number;
  /** Scale factor for coordinate conversion. */
  readonly scale: number;
  /** Original page height in PDF points. */
  readonly originalHeight: number;
  /** Stroke colour (CSS). */
  readonly strokeColour?: string;
  /** Stroke width in screen pixels (used for preview + line bbox robustness). */
  readonly strokeWidth?: number;
  /** Called when the shape is completed with the PDF rect. */
  onCreate?(rect: Rect, detail?: ShapeCreateDetail): void;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

function isPenOrTouchPointerType(pointerType: string): boolean {
  return pointerType === 'pen' || pointerType === 'touch';
}

function releasePointerCaptureIfHeld(element: Element | null, pointerId: number): void {
  if (!element || !('releasePointerCapture' in element)) return;
  const releasePointerCapture = element.releasePointerCapture;
  if (typeof releasePointerCapture !== 'function') return;
  const hasPointerCapture =
    'hasPointerCapture' in element && typeof element.hasPointerCapture === 'function'
      ? element.hasPointerCapture(pointerId)
      : true;
  if (hasPointerCapture) {
    releasePointerCapture.call(element, pointerId);
  }
}

function setPointerCaptureIfSupported(element: Element, pointerId: number): void {
  if (!('setPointerCapture' in element)) return;
  const setPointerCapture = element.setPointerCapture;
  if (typeof setPointerCapture !== 'function') return;
  try {
    setPointerCapture.call(element, pointerId);
  } catch {
    // Some browsers can transiently reject capture during synthetic automation events.
  }
}

/**
 * Optional metadata emitted alongside a created shape.
 *
 * For line tool this carries the explicit start/end points.
 */
export interface ShapeCreateDetail {
  readonly start?: Point;
  readonly end?: Point;
}

/**
 * Transparent overlay that captures pointer events for shape creation.
 *
 * Shows a preview outline during drag, then calls `onCreate` with
 * the final PDF rect on pointer-up.
 */
export function ShapeCreationOverlay({
  tool,
  width,
  height,
  scale,
  originalHeight,
  strokeColour = '#000000',
  strokeWidth = 2,
  onCreate,
}: ShapeCreationOverlayProps): ReactNode {
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const captureElementRef = useRef<Element | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const resetDrag = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && pointerId !== MOUSE_DRAG_POINTER_ID) {
      releasePointerCaptureIfHeld(captureElementRef.current, pointerId);
    }
    activePointerIdRef.current = null;
    captureElementRef.current = null;
    dragRef.current = null;
    setDrag(null);
  }, []);

  const completeDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => {
      const activePointerId = activePointerIdRef.current;
      const currentDrag = dragRef.current;
      if (activePointerId === null || activePointerId !== pointerId || currentDrag === null) {
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      const constrainedCurrent =
        rect === undefined || rect === null
          ? { x: currentDrag.currentX, y: currentDrag.currentY }
          : applyConstrainedCreationPoint(
              tool,
              { x: currentDrag.startX, y: currentDrag.startY },
              { x: clientX - rect.left, y: clientY - rect.top },
              shiftKey,
              { width, height },
            );
      const finalDrag = {
        ...currentDrag,
        currentX: constrainedCurrent.x,
        currentY: constrainedCurrent.y,
      };
      const minX = Math.min(finalDrag.startX, finalDrag.currentX);
      const minY = Math.min(finalDrag.startY, finalDrag.currentY);
      const maxX = Math.max(finalDrag.startX, finalDrag.currentX);
      const maxY = Math.max(finalDrag.startY, finalDrag.currentY);
      const widthPx = maxX - minX;
      const heightPx = maxY - minY;

      if (tool === 'line') {
        const length = Math.hypot(finalDrag.currentX - finalDrag.startX, finalDrag.currentY - finalDrag.startY);
        if (length <= MIN_SHAPE_SIZE) {
          resetDrag(pointerId);
          return;
        }

        let lineMinX = minX;
        let lineMaxX = maxX;
        let lineMinY = minY;
        let lineMaxY = maxY;

        // Keep a tiny non-zero bbox for mostly horizontal/vertical drags.
        const minLineAxisSize = Math.max(MIN_LINE_AXIS_SIZE, strokeWidth * 2);
        if (widthPx < minLineAxisSize) {
          const midX = (finalDrag.startX + finalDrag.currentX) / 2;
          lineMinX = midX - minLineAxisSize / 2;
          lineMaxX = midX + minLineAxisSize / 2;
        }
        if (heightPx < minLineAxisSize) {
          const midY = (finalDrag.startY + finalDrag.currentY) / 2;
          lineMinY = midY - minLineAxisSize / 2;
          lineMaxY = midY + minLineAxisSize / 2;
        }

        const topLeft = screenToPdf({ x: lineMinX, y: lineMinY }, { scale, originalHeight });
        const bottomRight = screenToPdf({ x: lineMaxX, y: lineMaxY }, { scale, originalHeight });
        const start = screenToPdf({ x: finalDrag.startX, y: finalDrag.startY }, { scale, originalHeight });
        const end = screenToPdf({ x: finalDrag.currentX, y: finalDrag.currentY }, { scale, originalHeight });
        onCreate?.(
          {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
          },
          { start, end },
        );
        resetDrag(pointerId);
        return;
      }

      // Only create if the shape has meaningful size
      if (widthPx >= MIN_SHAPE_SIZE && heightPx >= MIN_SHAPE_SIZE) {
        const topLeft = screenToPdf({ x: minX, y: minY }, { scale, originalHeight });
        const bottomRight = screenToPdf({ x: maxX, y: maxY }, { scale, originalHeight });
        onCreate?.({
          left: topLeft.x,
          top: topLeft.y,
          right: bottomRight.x,
          bottom: bottomRight.y,
        });
      }

      resetDrag(pointerId);
    },
    [tool, scale, originalHeight, onCreate, width, height, strokeWidth, resetDrag],
  );

  const updateDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number, shiftKey: boolean) => {
      if (activePointerIdRef.current === null || pointerId !== activePointerIdRef.current) {
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const previous = dragRef.current;
      if (previous === null) return;
      const next = applyConstrainedCreationPoint(
        tool,
        { x: previous.startX, y: previous.startY },
        { x: clientX - rect.left, y: clientY - rect.top },
        shiftKey,
        { width, height },
      );
      const nextDrag = {
        ...previous,
        currentX: next.x,
        currentY: next.y,
      };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    },
    [tool, width, height],
  );

  useEffect(() => {
    const handleDocumentPointerUp = (event: PointerEvent) => {
      completeDrag(event.pointerId, event.clientX, event.clientY, event.shiftKey);
    };
    const handleDocumentPointerCancel = (event: PointerEvent) => {
      if (!isPenOrTouchPointerType(event.pointerType)) return;
      // Firefox can emit pointercancel for mouse drags during viewport churn.
      // Keep the drag alive and allow pointerup/mouseup to finalise.
      if (activePointerIdRef.current === null || event.pointerId !== activePointerIdRef.current) return;
      resetDrag(event.pointerId);
    };
    const handleDocumentMouseMove = (event: MouseEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId === null) return;
      updateDrag(activePointerId, event.clientX, event.clientY, event.shiftKey);
    };
    const handleDocumentMouseUp = (event: MouseEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId === null) return;
      completeDrag(activePointerId, event.clientX, event.clientY, event.shiftKey);
    };

    globalThis.document.addEventListener('pointerup', handleDocumentPointerUp);
    globalThis.document.addEventListener('pointercancel', handleDocumentPointerCancel);
    globalThis.document.addEventListener('mousemove', handleDocumentMouseMove);
    globalThis.document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      globalThis.document.removeEventListener('pointerup', handleDocumentPointerUp);
      globalThis.document.removeEventListener('pointercancel', handleDocumentPointerCancel);
      globalThis.document.removeEventListener('mousemove', handleDocumentMouseMove);
      globalThis.document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [completeDrag, resetDrag, updateDrag]);

  useEffect(() => {
    return () => {
      const activePointerId = activePointerIdRef.current;
      const currentDrag = dragRef.current;
      if (activePointerId === null || currentDrag === null) {
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      const fallbackClientX = rect ? rect.left + currentDrag.currentX : currentDrag.currentX;
      const fallbackClientY = rect ? rect.top + currentDrag.currentY : currentDrag.currentY;
      completeDrag(activePointerId, fallbackClientX, fallbackClientY, false);
    };
  }, [completeDrag]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (activePointerIdRef.current !== null) return;
      if (isSecondaryMouseButton(e)) return;
      e.preventDefault();
      setPointerCaptureIfSupported(e.currentTarget, e.pointerId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const start = clampScreenPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top }, { width, height });
      activePointerIdRef.current = e.pointerId;
      captureElementRef.current = e.currentTarget;
      const nextDrag = { startX: start.x, startY: start.y, currentX: start.x, currentY: start.y };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    },
    [width, height],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      updateDrag(e.pointerId, e.clientX, e.clientY, e.shiftKey);
    },
    [updateDrag],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      completeDrag(e.pointerId, e.clientX, e.clientY, e.shiftKey);
    },
    [completeDrag],
  );

  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent) => {
      if (!isPenOrTouchPointerType(e.pointerType)) return;
      if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      resetDrag(e.pointerId);
    },
    [resetDrag],
  );

  const handleLostPointerCapture = useCallback(() => {
    // Pointer-up can race with lostcapture in Firefox; keep drag active until
    // an explicit pointerup/pointercancel finalises or resets the session.
    captureElementRef.current = null;
  }, []);

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (activePointerIdRef.current !== null) return;
      if (isSecondaryMouseButton(e)) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const start = clampScreenPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top }, { width, height });
      activePointerIdRef.current = MOUSE_DRAG_POINTER_ID;
      captureElementRef.current = null;
      const nextDrag = { startX: start.x, startY: start.y, currentX: start.x, currentY: start.y };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    },
    [width, height],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (activePointerIdRef.current !== MOUSE_DRAG_POINTER_ID) return;
      e.preventDefault();
      updateDrag(MOUSE_DRAG_POINTER_ID, e.clientX, e.clientY, e.shiftKey);
    },
    [updateDrag],
  );

  const handleMouseUp = useCallback(
    (e: ReactMouseEvent) => {
      if (activePointerIdRef.current !== MOUSE_DRAG_POINTER_ID) return;
      e.preventDefault();
      completeDrag(MOUSE_DRAG_POINTER_ID, e.clientX, e.clientY, e.shiftKey);
    },
    [completeDrag],
  );

  const renderPreview = (): ReactNode => {
    if (!drag) return null;

    const x = Math.min(drag.startX, drag.currentX);
    const y = Math.min(drag.startY, drag.currentY);
    const w = Math.abs(drag.currentX - drag.startX);
    const h = Math.abs(drag.currentY - drag.startY);

    const style = {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: w,
      height: h,
      border: `2px dashed ${strokeColour}`,
      pointerEvents: 'none' as const,
    };

    if (tool === 'circle') {
      return <div data-testid="shape-preview" style={{ ...style, borderRadius: '50%' }} />;
    }

    if (tool === 'line') {
      return (
        <svg
          data-testid="shape-preview"
          role="img"
          aria-label="Line preview"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width={width}
          height={height}
        >
          <title>Line preview</title>
          <line
            x1={drag.startX}
            y1={drag.startY}
            x2={drag.currentX}
            y2={drag.currentY}
            stroke={strokeColour}
            strokeWidth={strokeWidth}
            strokeDasharray="6,3"
          />
        </svg>
      );
    }

    // Rectangle (default)
    return <div data-testid="shape-preview" style={style} />;
  };

  return (
    <div
      ref={containerRef}
      data-testid="shape-creation-overlay"
      role="application"
      aria-label="Shape creation overlay"
      tabIndex={-1}
      style={{
        position: 'absolute',
        inset: 0,
        width,
        height,
        cursor: 'crosshair',
        pointerEvents: 'auto',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {renderPreview()}
    </div>
  );
}
