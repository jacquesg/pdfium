import type { CSSProperties } from 'react';

export function getShapeCreationOverlaySurfaceStyle(width: number, height: number): CSSProperties {
  return {
    cursor: 'crosshair',
    height,
    inset: 0,
    pointerEvents: 'auto',
    position: 'absolute',
    touchAction: 'none',
    userSelect: 'none',
    width,
  };
}
