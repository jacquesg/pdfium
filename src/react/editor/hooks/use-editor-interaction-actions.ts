import { type MutableRefObject, useCallback } from 'react';
import { flushSync } from 'react-dom';
import type { EditorMode, EditorTool, TextMarkupActionTool } from '../types.js';
import type {
  EditorInteractionBridgeActions,
  EditorInteractionBridgeViewerState,
} from './editor-interaction-bridge.types.js';
import { isMarkupActionTool } from './editor-interaction-bridge-support.js';

interface UseEditorInteractionActionsOptions {
  readonly clearPendingMarkupAction: (requestId?: number) => void;
  readonly setActiveTool: (tool: EditorMode) => void;
  readonly suppressNextPointerToIdleSync: MutableRefObject<boolean>;
  readonly triggerMarkupAction: (tool: TextMarkupActionTool) => void;
  readonly viewerInteraction: EditorInteractionBridgeViewerState;
}

export function useEditorInteractionActions({
  clearPendingMarkupAction,
  setActiveTool,
  suppressNextPointerToIdleSync,
  triggerMarkupAction,
  viewerInteraction,
}: UseEditorInteractionActionsOptions): EditorInteractionBridgeActions {
  const activate = useCallback(
    (tool: EditorTool | TextMarkupActionTool) => {
      if (viewerInteraction.mode !== 'pointer') {
        suppressNextPointerToIdleSync.current = true;
        viewerInteraction.setMode('pointer');
      }

      if (isMarkupActionTool(tool)) {
        flushSync(() => {
          setActiveTool('idle');
        });
        triggerMarkupAction(tool);
        return;
      }

      flushSync(() => {
        setActiveTool(tool);
      });
    },
    [viewerInteraction, setActiveTool, suppressNextPointerToIdleSync, triggerMarkupAction],
  );

  const setIdle = useCallback(() => {
    clearPendingMarkupAction();
    flushSync(() => {
      setActiveTool('idle');
    });
  }, [clearPendingMarkupAction, setActiveTool]);

  return { activate, setIdle };
}
