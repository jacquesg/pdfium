import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { isLineLikeAnnotation } from '../line-utils.js';
import { renderAnnotationLineHitTarget } from './annotation-hit-target-line-renderer.js';
import { renderAnnotationMarkupHitTargets } from './annotation-hit-target-markup-renderer.js';
import { renderAnnotationShapeHitTarget } from './annotation-hit-target-shape-renderer.js';
import type { AnnotationHitTargetRenderOptions } from './annotation-hit-target-support.js';
import { canRenderHitTarget, hasMarkupHitTargetGeometry } from './editor-overlay-helpers.js';

export interface AnnotationHitTargetLayerProps {
  readonly annotations: readonly SerialisedAnnotation[];
  readonly height: number;
  readonly originalHeight: number;
  readonly scale: number;
  readonly selectedAnnotationIndex: number | null;
  readonly width: number;
  readonly onSelect: (annotationIndex: number) => void;
}

export function AnnotationHitTargetLayer({
  annotations,
  height,
  originalHeight,
  scale,
  selectedAnnotationIndex,
  width,
  onSelect,
}: AnnotationHitTargetLayerProps): ReactNode {
  const layers: ReactNode[] = [];

  for (const annot of annotations) {
    if (!canRenderHitTarget(annot)) {
      continue;
    }

    const renderOptions: AnnotationHitTargetRenderOptions = {
      annotation: annot,
      height,
      isSelected: selectedAnnotationIndex === annot.index,
      onSelect,
      originalHeight,
      scale,
      width,
    };

    if (hasMarkupHitTargetGeometry(annot)) {
      layers.push(...renderAnnotationMarkupHitTargets(renderOptions));
      continue;
    }

    if (isLineLikeAnnotation(annot)) {
      const lineTarget = renderAnnotationLineHitTarget(renderOptions);
      if (lineTarget !== null) {
        layers.push(lineTarget);
        continue;
      }
    }

    layers.push(renderAnnotationShapeHitTarget(renderOptions));
  }

  return <>{layers}</>;
}
