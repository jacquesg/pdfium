import type { ReactNode } from 'react';
import { AnnotationType } from '../../../core/types.js';
import {
  type AnnotationHitTargetRenderOptions,
  AnnotationHitTargetSvgFrame,
  createHitTargetPointerDownHandler,
  createHitTargetStyle,
  HIT_TARGET_TEST_ID,
} from './annotation-hit-target-support.js';
import { buildEllipseHitTargetGeometry, buildShapeHitTargetRect } from './editor-overlay-helpers.js';

export function renderAnnotationShapeHitTarget({
  annotation,
  height,
  isSelected,
  onSelect,
  originalHeight,
  scale,
  width,
}: AnnotationHitTargetRenderOptions): ReactNode {
  const handleHitTargetPointerDown = createHitTargetPointerDownHandler(annotation.index, onSelect);
  const hitTargetStyle = createHitTargetStyle(isSelected);

  if (annotation.type === AnnotationType.Circle) {
    const ellipseGeometry = buildEllipseHitTargetGeometry(annotation, scale, originalHeight, width, height);
    return (
      <AnnotationHitTargetSvgFrame
        key={`select-hit-${annotation.index}`}
        height={ellipseGeometry.rect.height}
        left={ellipseGeometry.rect.x}
        top={ellipseGeometry.rect.y}
        viewBox={`0 0 ${String(ellipseGeometry.rect.width)} ${String(ellipseGeometry.rect.height)}`}
        width={ellipseGeometry.rect.width}
      >
        <ellipse
          cx={ellipseGeometry.cx}
          cy={ellipseGeometry.cy}
          data-testid={HIT_TARGET_TEST_ID}
          data-annotation-index={annotation.index}
          fill="rgba(0, 0, 0, 0.001)"
          pointerEvents="all"
          rx={ellipseGeometry.rx}
          ry={ellipseGeometry.ry}
          style={hitTargetStyle}
          onPointerDown={handleHitTargetPointerDown}
        />
      </AnnotationHitTargetSvgFrame>
    );
  }

  const screenRect = buildShapeHitTargetRect(annotation, scale, originalHeight, width, height);
  return (
    <div
      key={`select-hit-${annotation.index}`}
      data-testid={HIT_TARGET_TEST_ID}
      data-annotation-index={annotation.index}
      style={{
        position: 'absolute',
        left: screenRect.x,
        top: screenRect.y,
        width: screenRect.width,
        height: screenRect.height,
        ...hitTargetStyle,
      }}
      onPointerDown={handleHitTargetPointerDown}
    />
  );
}
