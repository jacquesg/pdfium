import { useEffect } from 'react';
import { isEditableElement } from './editor-interaction-bridge-support.js';
import type { UseEditorInteractionSyncOptions } from './editor-interaction-sync.types.js';

type UseEditorEscapeIdleSyncOptions = Pick<
  UseEditorInteractionSyncOptions,
  'activeTool' | 'clearPendingMarkupAction' | 'options' | 'setActiveTool'
>;

export function useEditorEscapeIdleSync({
  activeTool,
  clearPendingMarkupAction,
  options,
  setActiveTool,
}: UseEditorEscapeIdleSyncOptions): void {
  const { enableEscapeToIdle = true } = options;

  useEffect(() => {
    if (!enableEscapeToIdle) return;

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'Escape') return;
      if (isEditableElement(event.target instanceof Element ? event.target : null)) return;
      if (activeTool === 'idle') return;
      clearPendingMarkupAction();
      setActiveTool('idle');
    };

    globalThis.document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      globalThis.document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [activeTool, setActiveTool, clearPendingMarkupAction, enableEscapeToIdle]);
}
