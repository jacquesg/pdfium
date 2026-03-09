import type { AnnotationBorder, Colour, Rect } from '../../../core/types.js';

const EPSILON = 1e-6;

export function coloursEqual(a: Colour, b: Colour): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function bordersEqual(a: AnnotationBorder, b: AnnotationBorder): boolean {
  return (
    Math.abs(a.horizontalRadius - b.horizontalRadius) < EPSILON &&
    Math.abs(a.verticalRadius - b.verticalRadius) < EPSILON &&
    Math.abs(a.borderWidth - b.borderWidth) < EPSILON
  );
}

export function pointsEqual(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.left - b.left) < EPSILON &&
    Math.abs(a.top - b.top) < EPSILON &&
    Math.abs(a.right - b.right) < EPSILON &&
    Math.abs(a.bottom - b.bottom) < EPSILON
  );
}

export function strokeWidthsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}
