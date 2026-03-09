import type { ReactNode } from 'react';
import type { DrawPoint, InkDrawingActions } from '../hooks/use-ink-drawing.js';
import type { InkToolConfig } from '../types.js';
import { colourToRgbaString, type EditorOverlayLayerDimensions } from './editor-overlay-tool-layer-support.js';
import { InkCanvas } from './ink-canvas.js';

interface EditorOverlayInkToolLayerProps extends EditorOverlayLayerDimensions {
  readonly drawing: InkDrawingActions;
  readonly inkConfig: InkToolConfig;
  readonly onInkComplete: (points: ReadonlyArray<DrawPoint>) => void;
}

export function EditorOverlayInkToolLayer({
  drawing,
  height,
  inkConfig,
  onInkComplete,
  width,
}: EditorOverlayInkToolLayerProps): ReactNode {
  return (
    <InkCanvas
      drawing={drawing}
      width={width}
      height={height}
      strokeColour={colourToRgbaString(inkConfig.colour)}
      strokeWidth={inkConfig.strokeWidth}
      onStrokeComplete={onInkComplete}
    />
  );
}
