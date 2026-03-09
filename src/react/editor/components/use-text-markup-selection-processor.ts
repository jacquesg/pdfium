import { type RefObject, useCallback, useRef } from 'react';
import type { Rect } from '../../../core/types.js';
import { processTextMarkupSelection } from './text-markup-overlay-selection.js';

interface UseTextMarkupSelectionProcessorOptions {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly height: number;
  readonly onCreate?: ((rects: readonly Rect[], boundingRect: Rect) => void) | undefined;
  readonly originalHeight: number;
  readonly scale: number;
  readonly width: number;
}

export function useTextMarkupSelectionProcessor({
  containerRef,
  height,
  onCreate,
  originalHeight,
  scale,
  width,
}: UseTextMarkupSelectionProcessorOptions) {
  const onCreateRef = useRef(onCreate);
  onCreateRef.current = onCreate;

  return useCallback((): boolean => {
    return processTextMarkupSelection({
      containerElement: containerRef.current,
      height,
      onCreate: onCreateRef.current,
      originalHeight,
      scale,
      width,
    });
  }, [containerRef, height, originalHeight, scale, width]);
}
