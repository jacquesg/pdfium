import type { CSSProperties } from 'react';

interface ScreenRectStyle {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface CommittedAnnotationMaskFrameStyleOptions {
  readonly active: boolean;
  readonly screenRect: ScreenRectStyle;
}

export function buildCommittedAnnotationMaskFrameStyle({
  active,
  screenRect,
}: CommittedAnnotationMaskFrameStyleOptions): CSSProperties {
  return {
    position: 'absolute',
    left: screenRect.x,
    top: screenRect.y,
    width: screenRect.width,
    height: screenRect.height,
    overflow: 'hidden',
    pointerEvents: 'none',
    opacity: active ? 1 : 0,
  };
}

interface CommittedAnnotationMaskCanvasStyleOptions {
  readonly pageHeight: number;
  readonly pageWidth: number;
  readonly screenRect: Pick<ScreenRectStyle, 'x' | 'y'>;
}

export function buildCommittedAnnotationMaskCanvasStyle({
  pageHeight,
  pageWidth,
  screenRect,
}: CommittedAnnotationMaskCanvasStyleOptions): CSSProperties {
  return {
    position: 'absolute',
    left: -screenRect.x,
    top: -screenRect.y,
    width: pageWidth,
    height: pageHeight,
    pointerEvents: 'none',
  };
}
