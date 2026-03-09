import type { CSSProperties, ReactNode } from 'react';
import type { AnnotationHitTargetSvgFrameProps } from './annotation-hit-target.types.js';

export function AnnotationHitTargetSvgFrame({
  children,
  height,
  left,
  top,
  viewBox,
  width,
}: AnnotationHitTargetSvgFrameProps): ReactNode {
  const style: CSSProperties =
    left === undefined || top === undefined
      ? {
          position: 'absolute',
          inset: 0,
          width,
          height,
          zIndex: 1,
          overflow: 'visible',
          pointerEvents: 'none',
        }
      : {
          position: 'absolute',
          left,
          top,
          width,
          height,
          overflow: 'visible',
          pointerEvents: 'none',
        };

  return (
    <svg aria-hidden="true" focusable="false" height={height} style={style} viewBox={viewBox} width={width}>
      {children}
    </svg>
  );
}
