import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { AnnotationType, type Colour } from '../../../core/types.js';

export const DEFAULT_COLOUR: Colour = { r: 0, g: 0, b: 0, a: 255 };
export const TRANSPARENT_COLOUR: Colour = { r: 0, g: 0, b: 0, a: 0 };
export const HIGHLIGHT_DEFAULT_COLOUR: Colour = { r: 255, g: 255, b: 0, a: 128 };

export function coloursEqual(a: Colour, b: Colour): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function colourRgbEqual(a: Colour, b: Colour): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampOpacityAlpha(value: number): number {
  if (!Number.isFinite(value)) {
    return 255;
  }
  return Math.round(clamp(value, 0, 1) * 255);
}

export function parseHexToColour(hex: string, alpha: number): Colour | null {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result?.[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
    a: alpha,
  };
}

export function withFullAlpha(colour: Colour): Colour {
  return { ...colour, a: 255 };
}

export function getInitialStrokeColour(
  annotationColour: SerialisedAnnotation['colour'],
  effectiveType: AnnotationType,
): Colour {
  return (
    annotationColour.stroke ??
    (effectiveType === AnnotationType.Highlight
      ? (annotationColour.interior ?? HIGHLIGHT_DEFAULT_COLOUR)
      : DEFAULT_COLOUR)
  );
}

export function getInitialInteriorColour(
  annotationColour: SerialisedAnnotation['colour'],
  effectiveType: AnnotationType,
): Colour {
  if (effectiveType === AnnotationType.Highlight) {
    return annotationColour.stroke ?? annotationColour.interior ?? HIGHLIGHT_DEFAULT_COLOUR;
  }
  return annotationColour.interior ?? TRANSPARENT_COLOUR;
}

export function isInitialFillEnabled(
  annotationColour: SerialisedAnnotation['colour'],
  effectiveType: AnnotationType,
): boolean {
  const alpha =
    effectiveType === AnnotationType.Highlight
      ? (annotationColour.stroke?.a ?? annotationColour.interior?.a ?? HIGHLIGHT_DEFAULT_COLOUR.a)
      : (annotationColour.interior?.a ?? 0);
  return alpha > 0;
}
