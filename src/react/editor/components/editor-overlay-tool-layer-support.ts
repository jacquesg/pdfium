import type { CSSProperties } from 'react';
import type { Colour } from '../../../core/types.js';

export interface EditorOverlayLayerDimensions {
  readonly width: number;
  readonly height: number;
}

export interface EditorOverlayPdfLayerDimensions extends EditorOverlayLayerDimensions {
  readonly scale: number;
  readonly originalHeight: number;
}

export function buildInteractiveOverlayStyle(
  { width, height }: EditorOverlayLayerDimensions,
  cursor: CSSProperties['cursor'],
): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    width,
    height,
    cursor,
    pointerEvents: 'auto',
  };
}

export function colourToRgbaString(colour: Colour, alpha = colour.a / 255): string {
  return `rgba(${colour.r},${colour.g},${colour.b},${alpha})`;
}
