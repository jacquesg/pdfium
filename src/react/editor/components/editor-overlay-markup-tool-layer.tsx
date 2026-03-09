import type { ReactNode } from 'react';
import type { Rect } from '../../../core/types.js';
import type { EditorOverlayPdfLayerDimensions } from './editor-overlay-tool-layer-support.js';
import { TextMarkupOverlay } from './text-markup-overlay.js';

interface EditorOverlayMarkupToolLayerProps extends EditorOverlayPdfLayerDimensions {
  readonly onMarkupCreate: (rects: readonly Rect[], boundingRect: Rect) => void;
  readonly onMarkupProcessResult: (processed: boolean) => void;
  readonly tool: 'highlight' | 'underline' | 'strikeout';
}

export function EditorOverlayMarkupToolLayer({
  height,
  onMarkupCreate,
  onMarkupProcessResult,
  originalHeight,
  scale,
  tool,
  width,
}: EditorOverlayMarkupToolLayerProps): ReactNode {
  return (
    <TextMarkupOverlay
      tool={tool}
      width={width}
      height={height}
      scale={scale}
      originalHeight={originalHeight}
      onCreate={onMarkupCreate}
      onProcessResult={onMarkupProcessResult}
    />
  );
}
