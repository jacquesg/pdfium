export function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

export function getEventClientPoint(event: PointerEvent | MouseEvent): { x: number; y: number } {
  return { x: event.clientX, y: event.clientY };
}

export function getEventPathElements(event: PointerEvent | MouseEvent): Element[] {
  return typeof event.composedPath === 'function'
    ? event.composedPath().filter((node): node is Element => node instanceof Element)
    : [];
}

export function getPrimaryEventTargetElement(
  event: PointerEvent | MouseEvent,
  pathElements: readonly Element[],
): Element | null {
  return pathElements[0] ?? (event.target instanceof Element ? event.target : null);
}
