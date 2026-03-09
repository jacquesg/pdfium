import type { PointerEvent as ReactPointerEvent } from 'react';

function isSecondaryMouseButton(event: { button: number; pointerType?: string }): boolean {
  return (event.pointerType ?? 'mouse') === 'mouse' && event.button > 0;
}

export function createHitTargetPointerDownHandler(
  annotationIndex: number,
  onSelect: (annotationIndex: number) => void,
): (event: ReactPointerEvent) => void {
  return (event) => {
    if (isSecondaryMouseButton(event)) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(annotationIndex);
  };
}
