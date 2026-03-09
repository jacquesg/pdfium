import type { UseEditorInteractionSyncOptions } from './editor-interaction-sync.types.js';
import { useEditorEscapeIdleSync } from './use-editor-escape-idle-sync.js';
import { useEditorPointerModeSync } from './use-editor-pointer-mode-sync.js';
import { useEditorPointerShortcutSync } from './use-editor-pointer-shortcut-sync.js';
import { useEditorSelectTextButtonSync } from './use-editor-select-text-button-sync.js';

export function useEditorInteractionSync({
  activeTool,
  clearPendingMarkupAction,
  options,
  previousInteractionMode,
  setActiveTool,
  suppressNextPointerToIdleSync,
  viewerInteraction,
}: UseEditorInteractionSyncOptions): void {
  useEditorPointerModeSync({
    activeTool,
    clearPendingMarkupAction,
    previousInteractionMode,
    setActiveTool,
    suppressNextPointerToIdleSync,
    viewerInteraction,
  });
  useEditorSelectTextButtonSync({
    activeTool,
    options,
    setActiveTool,
  });
  useEditorPointerShortcutSync({
    activeTool,
    options,
    setActiveTool,
    viewerInteraction,
  });
  useEditorEscapeIdleSync({
    activeTool,
    clearPendingMarkupAction,
    options,
    setActiveTool,
  });
}
