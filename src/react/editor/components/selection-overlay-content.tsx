import type { ReactNode } from 'react';
import type { SelectionOverlayContentProps } from './selection-overlay-content.types.js';
import { SelectionOverlayMarkupContent } from './selection-overlay-markup-content.js';
import { SelectionOverlayShapedContent } from './selection-overlay-shaped-content.js';

export function SelectionOverlayContent(props: SelectionOverlayContentProps): ReactNode {
  const { appearance, originalHeight, overlayRect, scale } = props;

  if (appearance.kind === 'text-markup') {
    return (
      <SelectionOverlayMarkupContent
        appearance={appearance}
        originalHeight={originalHeight}
        overlayRect={overlayRect}
        scale={scale}
      />
    );
  }

  return <SelectionOverlayShapedContent {...props} />;
}
