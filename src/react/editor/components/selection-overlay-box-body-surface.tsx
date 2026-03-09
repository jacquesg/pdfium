import type { ReactNode } from 'react';
import type { SelectionBoxBodySurfaceProps } from './selection-overlay-box-body.types.js';

export function SelectionBoxBodySurface({
  children,
  cursor,
  fillColour,
  interactive,
  onBodyMouseDown,
  onBodyPointerDown,
  outline,
}: SelectionBoxBodySurfaceProps): ReactNode {
  return (
    /* biome-ignore lint/a11y/useSemanticElements: selection bounds act as a composite drag surface, not a semantic button. */
    <div
      data-testid="selection-body"
      role="button"
      aria-label="Move annotation"
      tabIndex={-1}
      style={{
        position: 'absolute',
        inset: 0,
        border: outline,
        backgroundColor: fillColour,
        cursor,
      }}
      onPointerDown={interactive ? onBodyPointerDown : undefined}
      onMouseDown={interactive ? onBodyMouseDown : undefined}
    >
      {children}
    </div>
  );
}
