import { useEffect } from 'react';
import type { UseEditorInteractionSyncOptions } from './editor-interaction-sync.types.js';

type UseEditorSelectTextButtonSyncOptions = Pick<
  UseEditorInteractionSyncOptions,
  'activeTool' | 'options' | 'setActiveTool'
>;

export function useEditorSelectTextButtonSync({
  activeTool,
  options,
  setActiveTool,
}: UseEditorSelectTextButtonSyncOptions): void {
  const { selectTextButtonSelector, enableSelectTextButtonSync = true } = options;

  useEffect(() => {
    if (!enableSelectTextButtonSync || !selectTextButtonSelector) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(selectTextButtonSelector)) return;
      if (activeTool === 'idle') return;
      setActiveTool('idle');
    };

    globalThis.document.addEventListener('click', onDocumentClick);
    return () => {
      globalThis.document.removeEventListener('click', onDocumentClick);
    };
  }, [activeTool, setActiveTool, selectTextButtonSelector, enableSelectTextButtonSync]);
}
