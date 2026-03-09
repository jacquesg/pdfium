import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { pdfRectToScreen } from '../../coordinates.js';
import { clampScreenRectToPageBounds, expandScreenRectForHitTarget } from './editor-overlay-hit-target-support.js';

export function buildShapeHitTargetRect(
  annotation: SerialisedAnnotation,
  scale: number,
  originalHeight: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  return clampScreenRectToPageBounds(
    expandScreenRectForHitTarget(pdfRectToScreen(annotation.bounds, { scale, originalHeight })),
    pageWidth,
    pageHeight,
  );
}

export function buildEllipseHitTargetGeometry(
  annotation: SerialisedAnnotation,
  scale: number,
  originalHeight: number,
  pageWidth: number,
  pageHeight: number,
): {
  rect: { x: number; y: number; width: number; height: number };
  cx: number;
  cy: number;
  rx: number;
  ry: number;
} {
  const rect = buildShapeHitTargetRect(annotation, scale, originalHeight, pageWidth, pageHeight);
  return {
    rect,
    cx: rect.width / 2,
    cy: rect.height / 2,
    rx: Math.max(0, rect.width / 2),
    ry: Math.max(0, rect.height / 2),
  };
}
