/**
 * Ink drawing canvas overlay.
 *
 * Renders an SVG overlay that captures pointer events for
 * freehand drawing and displays the in-progress stroke.
 *
 * @module react/editor/components/ink-canvas
 */

import { type ReactNode, type PointerEvent as ReactPointerEvent, useCallback, useRef } from 'react';
import type { DrawPoint, InkDrawingActions } from '../hooks/use-ink-drawing.js';

/**
 * Props for the `InkCanvas` component.
 */
export interface InkCanvasProps {
  /** Width of the canvas in pixels. */
  readonly width: number;
  /** Height of the canvas in pixels. */
  readonly height: number;
  /** Ink drawing actions from `useInkDrawing`. */
  readonly drawing: InkDrawingActions;
  /** Stroke colour (CSS colour string). */
  readonly strokeColour?: string;
  /** Stroke width in pixels. */
  readonly strokeWidth?: number;
  /** Called when a stroke is completed with the final points. */
  onStrokeComplete?(points: readonly DrawPoint[]): void;
}

function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
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
  setPointerCapture.call(element, pointerId);
}

/**
 * SVG overlay for freehand drawing.
 *
 * Captures pointer events and renders the in-progress stroke
 * as an SVG path in real time.
 */
export function InkCanvas({
  width,
  height,
  drawing,
  strokeColour = '#000000',
  strokeWidth = 2,
  onStrokeComplete,
}: InkCanvasProps): ReactNode {
  const activePointerIdRef = useRef<number | null>(null);
  const captureElementRef = useRef<Element | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (isSecondaryMouseButton(e)) return;
      if (activePointerIdRef.current !== null) return;
      e.preventDefault();
      e.stopPropagation();
      setPointerCaptureIfSupported(e.currentTarget, e.pointerId);
      activePointerIdRef.current = e.pointerId;
      captureElementRef.current = e.currentTarget;
      const rect = e.currentTarget.getBoundingClientRect();
      drawing.startStroke({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [drawing],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) return;
      if (!drawing.isDrawing) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      drawing.addPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [drawing],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (drawing.isDrawing) {
        const points = drawing.finishStroke();
        onStrokeComplete?.(points);
      }
      releasePointerCaptureIfHeld(captureElementRef.current, e.pointerId);
      activePointerIdRef.current = null;
      captureElementRef.current = null;
    },
    [drawing, onStrokeComplete],
  );

  const handlePointerCancel = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerIdRef.current === null || e.pointerId !== activePointerIdRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (drawing.isDrawing) {
        drawing.cancelStroke();
      }
      releasePointerCaptureIfHeld(captureElementRef.current, e.pointerId);
      activePointerIdRef.current = null;
      captureElementRef.current = null;
    },
    [drawing],
  );

  const handleLostPointerCapture = useCallback(() => {
    if (drawing.isDrawing) {
      drawing.cancelStroke();
    }
    activePointerIdRef.current = null;
    captureElementRef.current = null;
  }, [drawing]);

  const pathData =
    drawing.points.length > 0 ? `M ${drawing.points.map((p) => `${String(p.x)},${String(p.y)}`).join(' L ')}` : '';

  return (
    <svg
      data-testid="ink-canvas"
      role="img"
      aria-label="Drawing canvas"
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', cursor: 'crosshair', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <title>Drawing canvas</title>
      {pathData && (
        <path d={pathData} fill="none" stroke={strokeColour} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
    </svg>
  );
}
