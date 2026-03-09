import type { PointerEvent as ReactPointerEvent } from 'react';

export function captureSelectionOverlayPointer(event: ReactPointerEvent): void {
  if ('setPointerCapture' in event.currentTarget) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
}
