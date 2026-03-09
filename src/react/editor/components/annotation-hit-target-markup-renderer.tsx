import type { ReactNode } from 'react';
import {
  type AnnotationHitTargetRenderOptions,
  AnnotationHitTargetSvgFrame,
  createHitTargetPointerDownHandler,
  HIT_TARGET_TEST_ID,
} from './annotation-hit-target-support.js';
import { buildMarkupHitTargetGeometry } from './editor-overlay-helpers.js';

export function renderAnnotationMarkupHitTargets({
  annotation,
  height,
  isSelected,
  onSelect,
  originalHeight,
  scale,
  width,
}: AnnotationHitTargetRenderOptions): ReactNode[] {
  const nodes: ReactNode[] = [];
  const handleHitTargetPointerDown = createHitTargetPointerDownHandler(annotation.index, onSelect);

  for (const [segmentIndex, quad] of (annotation.attachmentPoints ?? []).entries()) {
    const geometry = buildMarkupHitTargetGeometry(annotation, quad, scale, originalHeight, width, height);
    const key = `select-hit-${annotation.index}-${String(segmentIndex)}`;

    if (geometry.kind === 'highlight') {
      nodes.push(
        <AnnotationHitTargetSvgFrame key={key} height={height} width={width}>
          <polygon
            data-testid={HIT_TARGET_TEST_ID}
            data-annotation-index={annotation.index}
            data-annotation-segment={String(segmentIndex)}
            data-hit-target-shape="polygon"
            fill="rgba(0, 0, 0, 0.001)"
            points={geometry.points.map((point) => `${String(point.x)},${String(point.y)}`).join(' ')}
            pointerEvents={isSelected ? 'none' : 'all'}
            style={{ cursor: 'pointer' }}
            onPointerDown={handleHitTargetPointerDown}
          />
        </AnnotationHitTargetSvgFrame>,
      );
      continue;
    }

    nodes.push(
      <AnnotationHitTargetSvgFrame key={key} height={height} width={width}>
        <line
          data-testid={HIT_TARGET_TEST_ID}
          data-annotation-index={annotation.index}
          data-annotation-segment={String(segmentIndex)}
          data-hit-target-shape="line"
          pointerEvents={isSelected ? 'none' : 'stroke'}
          stroke="rgba(0, 0, 0, 0.001)"
          strokeLinecap="round"
          strokeWidth={geometry.strokeWidth}
          style={{ cursor: 'pointer' }}
          x1={geometry.start.x}
          x2={geometry.end.x}
          y1={geometry.start.y}
          y2={geometry.end.y}
          onPointerDown={handleHitTargetPointerDown}
        />
      </AnnotationHitTargetSvgFrame>,
    );
  }

  return nodes;
}
