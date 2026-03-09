import type { ReactNode } from 'react';
import type { SelectionOverlayContentProps } from './selection-overlay-content.types.js';
import { SelectionMarkupOverlay } from './selection-overlay-renderers.js';

export function SelectionOverlayMarkupContent({
  appearance,
  originalHeight,
  overlayRect,
  scale,
}: Pick<SelectionOverlayContentProps, 'appearance' | 'originalHeight' | 'overlayRect' | 'scale'>): ReactNode {
  if (appearance.kind !== 'text-markup') {
    return null;
  }

  return (
    <SelectionMarkupOverlay
      markupType={appearance.markupType}
      overlayRect={overlayRect}
      originalHeight={originalHeight}
      quads={appearance.quads}
      scale={scale}
    />
  );
}
