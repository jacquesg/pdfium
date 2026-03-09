import type { ReactNode } from 'react';
import type { EditorTool } from '../types.js';
import type { DragState } from './shape-creation-overlay.types.js';

interface ShapeCreationPreviewProps {
  readonly drag: DragState | null;
  readonly tool: EditorTool;
  readonly width: number;
  readonly height: number;
  readonly strokeColour: string;
  readonly strokeWidth: number;
}

export function ShapeCreationOverlayPreview({
  drag,
  tool,
  width,
  height,
  strokeColour,
  strokeWidth,
}: ShapeCreationPreviewProps): ReactNode {
  if (!drag) return null;

  const x = Math.min(drag.startX, drag.currentX);
  const y = Math.min(drag.startY, drag.currentY);
  const previewWidth = Math.abs(drag.currentX - drag.startX);
  const previewHeight = Math.abs(drag.currentY - drag.startY);

  const style = {
    position: 'absolute' as const,
    left: x,
    top: y,
    width: previewWidth,
    height: previewHeight,
    border: `2px dashed ${strokeColour}`,
    pointerEvents: 'none' as const,
  };

  if (tool === 'circle') {
    return <div data-testid="shape-preview" style={{ ...style, borderRadius: '50%' }} />;
  }

  if (tool === 'line') {
    return (
      <svg
        data-testid="shape-preview"
        role="img"
        aria-label="Line preview"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        width={width}
        height={height}
      >
        <title>Line preview</title>
        <line
          x1={drag.startX}
          y1={drag.startY}
          x2={drag.currentX}
          y2={drag.currentY}
          stroke={strokeColour}
          strokeWidth={strokeWidth}
          strokeDasharray="6,3"
        />
      </svg>
    );
  }

  return <div data-testid="shape-preview" style={style} />;
}
