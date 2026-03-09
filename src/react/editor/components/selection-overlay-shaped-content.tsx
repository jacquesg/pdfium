import type { ReactNode } from 'react';
import { SelectionOverlayBoxContent } from './selection-overlay-box-content.js';
import type { SelectionOverlayContentProps } from './selection-overlay-content.types.js';
import { SelectionOverlayLineContent } from './selection-overlay-line-content.js';

export function SelectionOverlayShapedContent(props: SelectionOverlayContentProps): ReactNode {
  if (props.appearance.kind === 'line') {
    return <SelectionOverlayLineContent {...props} />;
  }

  return <SelectionOverlayBoxContent {...props} />;
}
