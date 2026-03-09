import type { AnnotationBorder, Colour, Rect } from '../../../core/types.js';
import { FLOAT_TOLERANCE } from './annotation-mutation-patch.types.js';

export function coloursEqual(a: Colour | undefined, b: Colour | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function bordersEqual(a: AnnotationBorder | null | undefined, b: AnnotationBorder | null | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.horizontalRadius - b.horizontalRadius) < FLOAT_TOLERANCE &&
    Math.abs(a.verticalRadius - b.verticalRadius) < FLOAT_TOLERANCE &&
    Math.abs(a.borderWidth - b.borderWidth) < FLOAT_TOLERANCE
  );
}

export function rectsEqual(a: Rect | undefined, b: Rect | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return (
    Math.abs(a.left - b.left) < FLOAT_TOLERANCE &&
    Math.abs(a.top - b.top) < FLOAT_TOLERANCE &&
    Math.abs(a.right - b.right) < FLOAT_TOLERANCE &&
    Math.abs(a.bottom - b.bottom) < FLOAT_TOLERANCE
  );
}

export function pointsEqual(a: { x: number; y: number } | undefined, b: { x: number; y: number } | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return Math.abs(a.x - b.x) < FLOAT_TOLERANCE && Math.abs(a.y - b.y) < FLOAT_TOLERANCE;
}
