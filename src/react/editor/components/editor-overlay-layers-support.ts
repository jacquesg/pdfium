import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { EditorContextValue } from '../context.js';
import { hasActiveToolLayer } from './editor-overlay-layer-support.js';

interface EditorOverlayLayerVisibilityOptions {
  readonly activeTool: EditorContextValue['activeTool'];
  readonly effectiveSelectionEnabled: boolean;
  readonly isNeutralMode: boolean;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly selectedAnnotation: SerialisedAnnotation | null;
}

export function buildEditorOverlayLayerVisibility({
  activeTool,
  effectiveSelectionEnabled,
  isNeutralMode,
  pendingMarkupAction,
  resolvedAnnotations,
  selectedAnnotation,
}: EditorOverlayLayerVisibilityOptions) {
  return {
    showPassiveLayers:
      resolvedAnnotations.length > 0 || (isNeutralMode && effectiveSelectionEnabled && selectedAnnotation !== null),
    showToolLayers: hasActiveToolLayer(activeTool, effectiveSelectionEnabled, pendingMarkupAction),
  };
}
