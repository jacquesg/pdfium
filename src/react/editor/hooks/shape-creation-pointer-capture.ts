export const MOUSE_DRAG_POINTER_ID = -1;

export function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

export function isPenOrTouchPointerType(pointerType: string): boolean {
  return pointerType === 'pen' || pointerType === 'touch';
}

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

export function setPointerCaptureIfSupported(element: Element, pointerId: number): void {
  if (!('setPointerCapture' in element)) return;
  const setPointerCapture = element.setPointerCapture;
  if (typeof setPointerCapture !== 'function') return;
  try {
    setPointerCapture.call(element, pointerId);
  } catch {
    // Some browsers can transiently reject capture during synthetic automation events.
  }
}
