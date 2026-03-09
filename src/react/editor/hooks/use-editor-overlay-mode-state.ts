import { usePDFViewerOptional } from '../../components/pdf-viewer-context.js';
import { useEditor } from '../context.js';

export function useEditorOverlayModeState(selectionEnabled?: boolean) {
  const viewerContext = usePDFViewerOptional();
  const viewerInteractionMode = viewerContext?.viewer.interaction.mode;
  const viewerSelectionEnabled = viewerInteractionMode === undefined ? undefined : viewerInteractionMode === 'pointer';
  const effectiveSelectionEnabled = selectionEnabled ?? viewerSelectionEnabled ?? true;
  const { activeTool, setActiveTool, pendingMarkupAction, clearPendingMarkupAction, toolConfigs } = useEditor();

  return {
    activeTool,
    clearPendingMarkupAction,
    effectiveSelectionEnabled,
    pendingMarkupAction,
    setActiveTool,
    toolConfigs,
  };
}
