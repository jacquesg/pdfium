import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TextSearchResult } from '../../../../src/core/types.js';
import { SearchHighlightOverlay } from '../../../../src/react/components/search-highlight-overlay.js';

function createSearchResult(
  charIndex: number,
  rects: Array<{ left: number; top: number; right: number; bottom: number }>,
): TextSearchResult {
  return {
    charIndex,
    charCount: 5,
    rects,
  };
}

/**
 * Spies on getContext for canvas elements, returning a mock 2D context.
 */
function spyOnCanvasContext() {
  const mockCtx = {
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    strokeRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    setLineDash: vi.fn(),
  };

  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as HTMLCanvasElement['getContext'];

  return {
    mockCtx,
    restore() {
      HTMLCanvasElement.prototype.getContext = original;
    },
  };
}

describe('SearchHighlightOverlay', () => {
  it('renders current match with currentMatchColour', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const results = [
        createSearchResult(0, [{ left: 10, top: 50, right: 100, bottom: 10 }]),
        createSearchResult(20, [{ left: 10, top: 100, right: 100, bottom: 60 }]),
      ];

      render(
        <SearchHighlightOverlay
          results={results}
          currentIndex={0}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          currentMatchColour="rgba(255, 165, 0, 0.4)"
          otherMatchColour="rgba(255, 255, 0, 0.35)"
        />,
      );

      // Both results are filled, so fillRect is called twice
      expect(mockCtx.fillRect.mock.calls).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it('shows correct aria-label for multiple results', () => {
    const results = [
      createSearchResult(0, [{ left: 10, top: 50, right: 100, bottom: 10 }]),
      createSearchResult(20, [{ left: 10, top: 100, right: 100, bottom: 60 }]),
      createSearchResult(40, [{ left: 10, top: 150, right: 100, bottom: 110 }]),
    ];

    const { container } = render(
      <SearchHighlightOverlay
        results={results}
        currentIndex={1}
        width={200}
        height={200}
        originalHeight={792}
        scale={1}
      />,
    );

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas.getAttribute('aria-label')).toBe('3 search results');
  });

  it('shows singular "result" for a single match', () => {
    const results = [createSearchResult(0, [{ left: 10, top: 50, right: 100, bottom: 10 }])];

    const { container } = render(
      <SearchHighlightOverlay
        results={results}
        currentIndex={0}
        width={200}
        height={200}
        originalHeight={792}
        scale={1}
      />,
    );

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas.getAttribute('aria-label')).toBe('1 search result');
  });

  it('shows "No search results" when results array is empty', () => {
    const { container } = render(
      <SearchHighlightOverlay results={[]} currentIndex={0} width={200} height={200} originalHeight={792} scale={1} />,
    );

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas.getAttribute('aria-label')).toBe('No search results');
  });

  it('clears canvas when results are empty', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      render(
        <SearchHighlightOverlay
          results={[]}
          currentIndex={0}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
        />,
      );

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
    } finally {
      restore();
    }
  });

  it('forwards ref to the canvas element', () => {
    const ref = createRef<HTMLCanvasElement>();

    render(
      <SearchHighlightOverlay
        results={[]}
        currentIndex={0}
        width={200}
        height={200}
        originalHeight={792}
        scale={1}
        ref={ref}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
  });

  it('renders an aria-live region showing result position', () => {
    const results = [
      createSearchResult(0, [{ left: 10, top: 50, right: 100, bottom: 10 }]),
      createSearchResult(20, [{ left: 10, top: 100, right: 100, bottom: 60 }]),
      createSearchResult(40, [{ left: 10, top: 150, right: 100, bottom: 110 }]),
    ];

    const { container } = render(
      <SearchHighlightOverlay
        results={results}
        currentIndex={1}
        width={200}
        height={200}
        originalHeight={792}
        scale={1}
      />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).toBe('Result 2 of 3');
  });

  it('renders empty aria-live region when no results', () => {
    const { container } = render(
      <SearchHighlightOverlay results={[]} currentIndex={0} width={200} height={200} originalHeight={792} scale={1} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion!.textContent).toBe('');
  });
});
