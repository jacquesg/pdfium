import { useEffect } from 'react';
import type { UseEditorInteractionSyncOptions } from './editor-interaction-sync.types.js';

type UseEditorPointerModeSyncOptions = Pick<
  UseEditorInteractionSyncOptions,
  | 'activeTool'
  | 'clearPendingMarkupAction'
  | 'previousInteractionMode'
  | 'setActiveTool'
  | 'suppressNextPointerToIdleSync'
  | 'viewerInteraction'
>;

export function useEditorPointerModeSync({
  activeTool,
  clearPendingMarkupAction,
  previousInteractionMode,
  setActiveTool,
  suppressNextPointerToIdleSync,
  viewerInteraction,
}: UseEditorPointerModeSyncOptions): void {
  useEffect(() => {
    const nextMode = viewerInteraction.mode;
    const previousMode = previousInteractionMode.current;
    previousInteractionMode.current = nextMode;
    if (previousMode === nextMode) return;

    if (nextMode !== 'pointer') {
      suppressNextPointerToIdleSync.current = false;
      clearPendingMarkupAction();
      if (activeTool !== 'idle') {
        setActiveTool('idle');
      }
      return;
    }

    if (activeTool === 'idle') {
      return;
    }

    if (suppressNextPointerToIdleSync.current) {
      suppressNextPointerToIdleSync.current = false;
      return;
    }

    setActiveTool('idle');
  }, [
    viewerInteraction.mode,
    activeTool,
    setActiveTool,
    clearPendingMarkupAction,
    previousInteractionMode,
    suppressNextPointerToIdleSync,
  ]);
}
