import { type MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { usePDFViewerOptional } from '../../components/pdf-viewer-context.js';
import { useEditor } from '../context.js';
import { useEditorInteractionBridge } from './use-editor-interaction-bridge.js';

const VIEWER_SELECT_TEXT_BUTTON_SELECTOR = 'button[aria-label="Select text (V)"], button[aria-label="Pointer tool"]';
const NOOP_INTERACTION = {
  mode: 'pointer' as const,
  setMode: () => {},
};

export function useEditorToolbarController() {
  const { activeTool, canUndo, canRedo, undo, redo } = useEditor();
  const viewerContext = usePDFViewerOptional();
  const viewerInteraction = viewerContext?.viewer.interaction ?? NOOP_INTERACTION;
  const interactionBridge = useEditorInteractionBridge(viewerInteraction, {
    selectTextButtonSelector: VIEWER_SELECT_TEXT_BUTTON_SELECTOR,
    enableSelectTextButtonSync: viewerContext !== null,
    enablePointerShortcutSync: viewerContext !== null,
    enableEscapeToIdle: true,
  });

  const handleToolClick = useCallback(
    (tool: Parameters<typeof interactionBridge.activate>[0]) => {
      interactionBridge.activate(tool);
    },
    [interactionBridge],
  );

  const preventSelectionClear = useCallback((event: ReactMouseEvent) => {
    event.preventDefault();
  }, []);

  const handleUndo = useCallback(() => {
    void undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    void redo();
  }, [redo]);

  return {
    activeTool,
    canRedo,
    canUndo,
    handleRedo,
    handleToolClick,
    handleUndo,
    preventSelectionClear,
  };
}
