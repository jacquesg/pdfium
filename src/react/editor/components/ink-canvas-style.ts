import type { CSSProperties, SVGProps } from 'react';

export function getInkCanvasStyle(): CSSProperties {
  return {
    cursor: 'crosshair',
    inset: 0,
    pointerEvents: 'auto',
    position: 'absolute',
    touchAction: 'none',
  };
}

export function getInkCanvasPathProps(strokeColour: string, strokeWidth: number): SVGProps<SVGPathElement> {
  return {
    fill: 'none',
    stroke: strokeColour,
    strokeLinecap: 'round',
    strokeWidth,
  };
}
