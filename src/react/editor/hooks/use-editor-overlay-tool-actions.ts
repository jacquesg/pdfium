import type {
  EditorOverlayToolActionsResult,
  UseEditorOverlayToolActionsOptions,
} from './editor-overlay-tool-actions.types.js';
import { useEditorOverlayToolActionsRuntime } from './use-editor-overlay-tool-actions-runtime.js';

export function useEditorOverlayToolActions(
  options: UseEditorOverlayToolActionsOptions,
): EditorOverlayToolActionsResult {
  return useEditorOverlayToolActionsRuntime(options);
}

export type { EditorOverlayToolActionsResult } from './editor-overlay-tool-actions.types.js';
