/**
 * Editor/viewer interaction bridge.
 *
 * Keeps editor tool state and viewer interaction mode in sync so there is
 * a single text-selection model (viewer pointer mode) while preserving
 * explicit editor tool activations.
 *
 * @module react/editor/hooks/use-editor-interaction-bridge
 */

import { useRef } from 'react';
import { useEditor } from '../context.js';
import { useEditorInteractionActions } from './use-editor-interaction-actions.js';
import { useEditorInteractionSync } from './use-editor-interaction-sync.js';

export type {
  EditorInteractionBridgeActions,
  EditorInteractionBridgeOptions,
  EditorInteractionBridgeViewerState,
} from './editor-interaction-bridge.types.js';

import type {
  EditorInteractionBridgeActions,
  EditorInteractionBridgeOptions,
  EditorInteractionBridgeViewerState,
} from './editor-interaction-bridge.types.js';

/**
 * Synchronises editor tool semantics with viewer interaction mode.
 */
export function useEditorInteractionBridge(
  viewerInteraction: EditorInteractionBridgeViewerState,
  options: EditorInteractionBridgeOptions = {},
): EditorInteractionBridgeActions {
  const { activeTool, setActiveTool, triggerMarkupAction, clearPendingMarkupAction } = useEditor();
  const suppressNextPointerToIdleSync = useRef(false);
  const previousInteractionMode = useRef(viewerInteraction.mode);
  useEditorInteractionSync({
    activeTool,
    clearPendingMarkupAction,
    options,
    previousInteractionMode,
    setActiveTool,
    suppressNextPointerToIdleSync,
    viewerInteraction,
  });

  return useEditorInteractionActions({
    clearPendingMarkupAction,
    setActiveTool,
    suppressNextPointerToIdleSync,
    triggerMarkupAction,
    viewerInteraction,
  });
}
