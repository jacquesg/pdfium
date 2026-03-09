import type { ReactNode } from 'react';
import { EditorOverlayActionToolLayers } from './editor-overlay-action-tool-layers.js';
import { EditorOverlayDrawingToolLayers } from './editor-overlay-drawing-tool-layers.js';
import type { EditorOverlayToolLayersProps } from './editor-overlay-tool-layer.types.js';

export function EditorOverlayToolLayers({
  effectiveSelectionEnabled,
  ...props
}: EditorOverlayToolLayersProps): ReactNode {
  if (!effectiveSelectionEnabled) {
    return null;
  }

  return (
    <>
      <EditorOverlayDrawingToolLayers {...props} />
      <EditorOverlayActionToolLayers {...props} />
    </>
  );
}
