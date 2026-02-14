'use client';

import { type ComponentProps, type Ref, useCallback, useLayoutEffect, useRef } from 'react';
import type { TextSearchResult } from '../../core/types.js';
import { VISUALLY_HIDDEN_STYLE } from '../internal/a11y.js';

interface SearchHighlightOverlayProps extends Omit<ComponentProps<'canvas'>, 'width' | 'height' | 'results'> {
  results: TextSearchResult[];
  currentIndex: number;
  width: number;
  height: number;
  originalHeight: number;
  scale: number;
  currentMatchColour?: string;
  otherMatchColour?: string;
  ref?: Ref<HTMLCanvasElement>;
}

function SearchHighlightOverlay({
  results,
  currentIndex,
  width,
  height,
  originalHeight,
  scale,
  currentMatchColour = 'rgba(255, 165, 0, 0.4)',
  otherMatchColour = 'rgba(255, 255, 0, 0.35)',
  ref,
  ...props
}: SearchHighlightOverlayProps) {
  const internalRef = useRef<HTMLCanvasElement | null>(null);

  const mergedRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result) continue;
      for (const rect of result.rects) {
        const x = rect.left * scale;
        const y = (originalHeight - rect.top) * scale;
        const w = (rect.right - rect.left) * scale;
        const h = (rect.top - rect.bottom) * scale;

        ctx.fillStyle = i === currentIndex ? currentMatchColour : otherMatchColour;
        ctx.fillRect(x, y, w, h);
      }
    }
  }, [results, currentIndex, width, height, originalHeight, scale, currentMatchColour, otherMatchColour]);

  return (
    <>
      <canvas
        role="img"
        aria-label={
          results.length > 0 ? `${results.length} search result${results.length !== 1 ? 's' : ''}` : 'No search results'
        }
        {...props}
        ref={mergedRef}
        width={width}
        height={height}
      />
      <span aria-live="polite" style={VISUALLY_HIDDEN_STYLE}>
        {results.length > 0 ? `Result ${currentIndex + 1} of ${results.length}` : ''}
      </span>
    </>
  );
}

export { SearchHighlightOverlay };
export type { SearchHighlightOverlayProps };
