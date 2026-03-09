import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import {
  buildInteractiveOverlayStyle,
  type EditorOverlayLayerDimensions,
} from './editor-overlay-tool-layer-support.js';

interface EditorOverlayStampToolLayerProps extends EditorOverlayLayerDimensions {
  readonly onStampClick: (event: ReactPointerEvent) => void;
}

export function EditorOverlayStampToolLayer({
  height,
  onStampClick,
  width,
}: EditorOverlayStampToolLayerProps): ReactNode {
  return (
    <div
      data-testid="stamp-click-overlay"
      style={buildInteractiveOverlayStyle({ width, height }, 'crosshair')}
      onPointerDown={onStampClick}
    />
  );
}
