import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DrawPoint } from '../hooks/use-ink-drawing.js';

export function isInkSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

export function releaseInkPointerCaptureIfHeld(element: Element | null, pointerId: number): void {
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

export function setInkPointerCaptureIfSupported(element: Element, pointerId: number): void {
  if (!('setPointerCapture' in element)) return;
  const setPointerCapture = element.setPointerCapture;
  if (typeof setPointerCapture !== 'function') return;
  setPointerCapture.call(element, pointerId);
}

export function resolveInkCanvasPoint(event: ReactPointerEvent<SVGSVGElement>): DrawPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function buildInkPathData(points: readonly DrawPoint[]): string {
  return points.length > 0 ? `M ${points.map((point) => `${String(point.x)},${String(point.y)}`).join(' L ')}` : '';
}
