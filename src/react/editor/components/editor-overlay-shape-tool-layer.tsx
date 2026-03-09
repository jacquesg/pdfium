import type { ReactNode } from 'react';
import type { Rect } from '../../../core/types.js';
import type { ShapeToolConfig } from '../types.js';
import { colourToRgbaString, type EditorOverlayPdfLayerDimensions } from './editor-overlay-tool-layer-support.js';
import { type ShapeCreateDetail, ShapeCreationOverlay } from './shape-creation-overlay.js';

interface EditorOverlayShapeToolLayerProps extends EditorOverlayPdfLayerDimensions {
  readonly onShapeCreate: (rect: Rect, detail?: ShapeCreateDetail) => void;
  readonly shapeConfig: ShapeToolConfig;
  readonly tool: 'rectangle' | 'circle' | 'line';
}

export function EditorOverlayShapeToolLayer({
  height,
  onShapeCreate,
  originalHeight,
  scale,
  shapeConfig,
  tool,
  width,
}: EditorOverlayShapeToolLayerProps): ReactNode {
  return (
    <ShapeCreationOverlay
      tool={tool}
      width={width}
      height={height}
      scale={scale}
      originalHeight={originalHeight}
      strokeColour={colourToRgbaString(shapeConfig.strokeColour, 1)}
      strokeWidth={shapeConfig.strokeWidth}
      onCreate={onShapeCreate}
    />
  );
}
