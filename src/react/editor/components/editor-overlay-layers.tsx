import type { ReactNode } from 'react';
import type { EditorOverlayLayersProps } from './editor-overlay-layers.types.js';
import { buildEditorOverlayLayerVisibility } from './editor-overlay-layers-support.js';
import { EditorOverlayVisibleLayers } from './editor-overlay-visible-layers.js';

export function EditorOverlayLayers(props: EditorOverlayLayersProps): ReactNode {
  const {
    activeTool,
    effectiveSelectionEnabled,
    isNeutralMode,
    pendingMarkupAction,
    resolvedAnnotations,
    selectedAnnotation,
  } = props;
  const { showPassiveLayers, showToolLayers } = buildEditorOverlayLayerVisibility({
    activeTool,
    effectiveSelectionEnabled,
    isNeutralMode,
    pendingMarkupAction,
    resolvedAnnotations,
    selectedAnnotation,
  });

  if (!showPassiveLayers && !showToolLayers) {
    return null;
  }

  return <EditorOverlayVisibleLayers {...props} showToolLayers={showToolLayers} />;
}
