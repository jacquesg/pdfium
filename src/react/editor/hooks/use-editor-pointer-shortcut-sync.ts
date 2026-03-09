import { useEffect } from 'react';
import { DEFAULT_POINTER_SHORTCUT_KEY, isEditableElement } from './editor-interaction-bridge-support.js';
import type { UseEditorInteractionSyncOptions } from './editor-interaction-sync.types.js';

type UseEditorPointerShortcutSyncOptions = Pick<
  UseEditorInteractionSyncOptions,
  'activeTool' | 'options' | 'setActiveTool' | 'viewerInteraction'
>;

export function useEditorPointerShortcutSync({
  activeTool,
  options,
  setActiveTool,
  viewerInteraction,
}: UseEditorPointerShortcutSyncOptions): void {
  const { pointerShortcutKey = DEFAULT_POINTER_SHORTCUT_KEY, enablePointerShortcutSync = true } = options;

  useEffect(() => {
    if (!enablePointerShortcutSync) return;

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key.toLowerCase() !== pointerShortcutKey.toLowerCase()) return;
      if (isEditableElement(event.target instanceof Element ? event.target : null)) return;
      if (viewerInteraction.mode !== 'pointer') return;
      if (activeTool === 'idle') return;
      setActiveTool('idle');
    };

    globalThis.document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      globalThis.document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [viewerInteraction.mode, activeTool, setActiveTool, pointerShortcutKey, enablePointerShortcutSync]);
}
