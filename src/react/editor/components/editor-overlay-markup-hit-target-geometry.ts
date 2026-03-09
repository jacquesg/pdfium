import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { AnnotationType } from '../../../core/types.js';
import { midpoint, quadToScreenPoints, screenPointsToRect } from './editor-overlay-hit-target-support.js';

export type MarkupHitTargetGeometry =
  | {
      kind: 'highlight';
      points: readonly [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ];
    }
  | {
      kind: 'line';
      start: { x: number; y: number };
      end: { x: number; y: number };
      strokeWidth: number;
    };

export function buildMarkupHitTargetGeometry(
  annotation: SerialisedAnnotation,
  quad: NonNullable<SerialisedAnnotation['attachmentPoints']>[number],
  scale: number,
  originalHeight: number,
  _pageWidth?: number,
  _pageHeight?: number,
): MarkupHitTargetGeometry {
  const [p1, p2, p3, p4] = quadToScreenPoints(quad, scale, originalHeight);
  if (annotation.type === AnnotationType.Highlight) {
    return {
      kind: 'highlight',
      points: [p1, p2, p4, p3],
    };
  }

  const quadRect = screenPointsToRect([p1, p2, p3, p4]);
  const start = annotation.type === AnnotationType.Strikeout ? midpoint(p1, p3) : p1;
  const end = annotation.type === AnnotationType.Strikeout ? midpoint(p2, p4) : p2;
  const hitStrokeWidth = Math.max(10, Math.min(16, quadRect.height + 6));
  return {
    kind: 'line',
    start,
    end,
    strokeWidth: hitStrokeWidth,
  };
}
