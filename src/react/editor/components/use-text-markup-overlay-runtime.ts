import { useRef } from 'react';
import type { Rect } from '../../../core/types.js';
import { useTextMarkupPointerUpListener } from './use-text-markup-pointerup-listener.js';
import { useTextMarkupSelectionFirstFlow } from './use-text-markup-selection-first-flow.js';
import { useTextMarkupSelectionProcessor } from './use-text-markup-selection-processor.js';

interface UseTextMarkupOverlayRuntimeOptions {
  readonly height: number;
  readonly onCreate?: (rects: readonly Rect[], boundingRect: Rect) => void;
  readonly onProcessResult?: (processed: boolean, source: 'mount' | 'pointerup') => void;
  readonly originalHeight: number;
  readonly scale: number;
  readonly tool: 'highlight' | 'underline' | 'strikeout';
  readonly width: number;
}

export function useTextMarkupOverlayRuntime({
  height,
  onCreate,
  onProcessResult,
  originalHeight,
  scale,
  tool,
  width,
}: UseTextMarkupOverlayRuntimeOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const processSelection = useTextMarkupSelectionProcessor({
    containerRef,
    height,
    onCreate,
    originalHeight,
    scale,
    width,
  });

  useTextMarkupSelectionFirstFlow({
    onProcessResult,
    processSelection,
    tool,
  });

  useTextMarkupPointerUpListener({
    onProcessResult,
    processSelection,
  });

  return {
    containerRef,
  };
}
