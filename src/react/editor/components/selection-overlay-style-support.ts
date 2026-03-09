import type { CSSProperties } from 'react';
import type { ScreenRect } from '../shape-constraints.js';
import type { SelectionOverlayAppearance } from './selection-overlay.types.js';
import { DEFAULT_STROKE_PREVIEW_COLOUR } from './selection-overlay.types.js';
import { toCssColour } from './selection-overlay-geometry.js';

export function resolveSelectionOverlayLiveStrokeWidth(appearance: SelectionOverlayAppearance, scale: number): number {
  return Math.max(
    1,
    (appearance.kind === 'bounds' || appearance.kind === 'text-markup' ? 1 : (appearance.strokeWidth ?? 1)) * scale,
  );
}

export function resolveSelectionOverlayColours(appearance: SelectionOverlayAppearance): {
  readonly boxFillColour: string;
  readonly boxStrokeColour: string;
  readonly lineStrokeColour: string;
} {
  return {
    boxFillColour:
      appearance.kind === 'rectangle' || appearance.kind === 'ellipse'
        ? toCssColour(appearance.fillColour ?? null, 'transparent')
        : 'transparent',
    boxStrokeColour:
      appearance.kind === 'rectangle' || appearance.kind === 'ellipse'
        ? toCssColour(appearance.strokeColour)
        : DEFAULT_STROKE_PREVIEW_COLOUR,
    lineStrokeColour: appearance.kind === 'line' ? toCssColour(appearance.strokeColour) : DEFAULT_STROKE_PREVIEW_COLOUR,
  };
}

export function buildSelectionOverlayRootStyle(overlayRect: ScreenRect, interactive: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: overlayRect.x,
    top: overlayRect.y,
    width: overlayRect.width,
    height: overlayRect.height,
    overflow: 'visible',
    pointerEvents: interactive ? 'auto' : 'none',
    touchAction: interactive ? 'none' : 'auto',
  };
}
