import type { ReactNode } from 'react';
import {
  type AnnotationHitTargetRenderOptions,
  AnnotationHitTargetSvgFrame,
  createHitTargetPointerDownHandler,
  createHitTargetStyle,
  HIT_TARGET_TEST_ID,
} from './annotation-hit-target-support.js';
import { buildLineHitTargetGeometry } from './editor-overlay-helpers.js';

const MIN_LINE_HIT_TARGET_STROKE_PX = 18;

export function renderAnnotationLineHitTarget({
  annotation,
  height,
  isSelected,
  onSelect,
  originalHeight,
  scale,
  width,
}: AnnotationHitTargetRenderOptions): ReactNode | null {
  const lineGeometry = buildLineHitTargetGeometry(annotation, scale, originalHeight, width, height);
  if (lineGeometry === null) {
    return null;
  }

  const hitStrokeWidth = Math.max(MIN_LINE_HIT_TARGET_STROKE_PX, (annotation.border?.borderWidth ?? 1) * scale + 10);
  const handleHitTargetPointerDown = createHitTargetPointerDownHandler(annotation.index, onSelect);

  return (
    <AnnotationHitTargetSvgFrame
      key={`select-hit-${annotation.index}`}
      height={lineGeometry.rect.height}
      left={lineGeometry.rect.x}
      top={lineGeometry.rect.y}
      viewBox={`0 0 ${String(lineGeometry.rect.width)} ${String(lineGeometry.rect.height)}`}
      width={lineGeometry.rect.width}
    >
      <line
        data-testid={HIT_TARGET_TEST_ID}
        data-annotation-index={annotation.index}
        pointerEvents="stroke"
        stroke="rgba(0, 0, 0, 0.001)"
        strokeLinecap="round"
        strokeWidth={hitStrokeWidth}
        style={createHitTargetStyle(isSelected)}
        x1={lineGeometry.start.x}
        x2={lineGeometry.end.x}
        y1={lineGeometry.start.y}
        y2={lineGeometry.end.y}
        onPointerDown={handleHitTargetPointerDown}
      />
    </AnnotationHitTargetSvgFrame>
  );
}
