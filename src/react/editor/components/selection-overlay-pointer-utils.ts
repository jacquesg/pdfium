import type { Colour } from '../../../core/types.js';
import { DEFAULT_STROKE_PREVIEW_COLOUR } from './selection-overlay.types.js';

export function releasePointerCaptureIfHeld(element: Element | null, pointerId: number): void {
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

export function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

export function isPenOrTouchPointerType(pointerType: string): boolean {
  return pointerType === 'pen' || pointerType === 'touch';
}

export function toCssColour(colour: Colour | null | undefined, fallback = DEFAULT_STROKE_PREVIEW_COLOUR): string {
  if (colour === undefined || colour === null) {
    return fallback;
  }
  return `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a / 255})`;
}
