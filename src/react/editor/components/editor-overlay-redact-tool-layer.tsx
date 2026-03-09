import type { ReactNode } from 'react';
import type { Rect } from '../../../core/types.js';
import type { EditorOverlayPdfLayerDimensions } from './editor-overlay-tool-layer-support.js';
import { ShapeCreationOverlay } from './shape-creation-overlay.js';

interface EditorOverlayRedactToolLayerProps extends EditorOverlayPdfLayerDimensions {
  readonly onRedactCreate: (rect: Rect) => void;
}

export function EditorOverlayRedactToolLayer({
  height,
  onRedactCreate,
  originalHeight,
  scale,
  width,
}: EditorOverlayRedactToolLayerProps): ReactNode {
  return (
    <ShapeCreationOverlay
      tool="rectangle"
      width={width}
      height={height}
      scale={scale}
      originalHeight={originalHeight}
      strokeColour="#cc0000"
      onCreate={onRedactCreate}
    />
  );
}
