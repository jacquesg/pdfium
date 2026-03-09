import { useEffect } from 'react';

interface UseTextMarkupSelectionFirstFlowOptions {
  readonly onProcessResult?: ((processed: boolean, source: 'mount' | 'pointerup') => void) | undefined;
  readonly processSelection: () => boolean;
  readonly tool: 'highlight' | 'underline' | 'strikeout';
}

export function useTextMarkupSelectionFirstFlow({
  onProcessResult,
  processSelection,
  tool,
}: UseTextMarkupSelectionFirstFlowOptions): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: tool is an intentional trigger — re-fires the effect on tool switch
  useEffect(() => {
    const processed = processSelection();
    onProcessResult?.(processed, 'mount');
  }, [processSelection, tool, onProcessResult]);
}
