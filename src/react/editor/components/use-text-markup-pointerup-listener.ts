import { useEffect } from 'react';
import { shouldIgnoreTextMarkupPointerUpTarget } from './text-markup-overlay-selection.js';

interface UseTextMarkupPointerUpListenerOptions {
  readonly onProcessResult?: ((processed: boolean, source: 'mount' | 'pointerup') => void) | undefined;
  readonly processSelection: () => boolean;
}

export function useTextMarkupPointerUpListener({
  onProcessResult,
  processSelection,
}: UseTextMarkupPointerUpListenerOptions): void {
  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (shouldIgnoreTextMarkupPointerUpTarget(event.target)) {
        return;
      }

      const processed = processSelection();
      onProcessResult?.(processed, 'pointerup');
    };

    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onProcessResult, processSelection]);
}
