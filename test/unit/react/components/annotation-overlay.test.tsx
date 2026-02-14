import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SerialisedAnnotation } from '../../../../src/context/protocol.js';
import { AnnotationOverlay } from '../../../../src/react/components/annotation-overlay.js';

/** Creates a minimal serialised annotation with the given bounds. */
function createAnnotation(
  index: number,
  bounds: { left: number; top: number; right: number; bottom: number },
): SerialisedAnnotation {
  return {
    index,
    type: 'Highlight' as const,
    bounds,
    colour: { stroke: undefined, interior: undefined },
    flags: 0,
    contents: '',
    author: '',
    subject: '',
    border: null,
    appearance: null,
    fontSize: 12,
    line: undefined,
    vertices: undefined,
    inkPaths: undefined,
    attachmentPoints: undefined,
    widget: undefined,
    link: undefined,
  } as SerialisedAnnotation;
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

describe('AnnotationOverlay', () => {
  it('renders a canvas with role="img" and correct aria-label', () => {
    const annotations = [
      createAnnotation(0, { left: 10, top: 50, right: 100, bottom: 10 }),
      createAnnotation(1, { left: 20, top: 60, right: 110, bottom: 20 }),
    ];

    const { container } = render(
      <AnnotationOverlay annotations={annotations} width={200} height={200} originalHeight={792} scale={1} />,
    );

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-label')).toBe('2 annotations');
  });

  it('uses singular "annotation" for a single annotation', () => {
    const annotations = [createAnnotation(0, { left: 10, top: 50, right: 100, bottom: 10 })];

    const { container } = render(
      <AnnotationOverlay annotations={annotations} width={200} height={200} originalHeight={792} scale={1} />,
    );

    const canvas = container.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    expect(canvas.getAttribute('aria-label')).toBe('1 annotation');
  });

  it('draws selected annotation with different style (fillRect called)', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [
        createAnnotation(0, { left: 10, top: 50, right: 100, bottom: 10 }),
        createAnnotation(1, { left: 20, top: 60, right: 110, bottom: 20 }),
      ];

      render(
        <AnnotationOverlay
          annotations={annotations}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          selectedIndex={0}
        />,
      );

      // Selected annotation triggers fillRect for the fill + strokeRect
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('draws non-selected annotations with dashed stroke', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [createAnnotation(0, { left: 10, top: 50, right: 100, bottom: 10 })];

      render(
        <AnnotationOverlay
          annotations={annotations}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          selectedIndex={99} // nothing selected from the visible set
        />,
      );

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([4, 2]);
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('respects maxOverlayCount limit', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      // Create 5 annotations but set maxOverlayCount to 2
      const annotations = Array.from({ length: 5 }, (_, i) =>
        createAnnotation(i, { left: 10 + i * 10, top: 50, right: 20 + i * 10, bottom: 10 }),
      );

      render(
        <AnnotationOverlay
          annotations={annotations}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          maxOverlayCount={2}
        />,
      );

      // Only 2 annotations should be drawn (strokeRect called twice)
      expect(mockCtx.strokeRect.mock.calls).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it('skips annotations with zero-size bounds', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [
        createAnnotation(0, { left: 10, top: 10, right: 10, bottom: 10 }), // zero size
        createAnnotation(1, { left: 20, top: 60, right: 110, bottom: 20 }), // valid
      ];

      render(<AnnotationOverlay annotations={annotations} width={200} height={200} originalHeight={792} scale={1} />);

      // Only the valid annotation should be stroked
      expect(mockCtx.strokeRect.mock.calls).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it('forwards ref to the canvas element', () => {
    const ref = createRef<HTMLCanvasElement>();

    render(<AnnotationOverlay annotations={[]} width={200} height={200} originalHeight={792} scale={1} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
  });

  it('clears the canvas before drawing', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [createAnnotation(0, { left: 10, top: 50, right: 100, bottom: 10 })];

      render(<AnnotationOverlay annotations={annotations} width={200} height={200} originalHeight={792} scale={1} />);

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
    } finally {
      restore();
    }
  });

  it('supports callback refs', () => {
    const refCb = vi.fn();
    render(<AnnotationOverlay annotations={[]} width={200} height={200} originalHeight={792} scale={1} ref={refCb} />);
    expect(refCb).toHaveBeenCalled();
    expect(refCb.mock.calls[0]?.[0]).toBeInstanceOf(HTMLCanvasElement);
  });

  it('returns early when canvas context is unavailable', () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as HTMLCanvasElement['getContext'];
    try {
      render(<AnnotationOverlay annotations={[]} width={200} height={200} originalHeight={792} scale={1} />);
    } finally {
      HTMLCanvasElement.prototype.getContext = original;
    }
  });

  it('renders selected annotation outside maxOverlayCount by appending it', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [
        createAnnotation(0, { left: 0, top: 100, right: 20, bottom: 90 }),
        createAnnotation(1, { left: 25, top: 100, right: 45, bottom: 90 }),
        createAnnotation(2, { left: 50, top: 100, right: 70, bottom: 90 }),
      ];
      render(
        <AnnotationOverlay
          annotations={annotations}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          maxOverlayCount={1}
          selectedIndex={2}
        />,
      );

      // One from slice + one appended selected item.
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(2);
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('skips null annotation entries and entries without bounds', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [
        undefined,
        { ...createAnnotation(1, { left: 0, top: 0, right: 0, bottom: 0 }), bounds: undefined },
        createAnnotation(2, { left: 10, top: 30, right: 40, bottom: 10 }),
      ] as unknown as SerialisedAnnotation[];

      render(<AnnotationOverlay annotations={annotations} width={200} height={200} originalHeight={792} scale={1} />);
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('does not append missing selected entries from sparse arrays', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = Array.from({ length: 3 }, () => undefined) as unknown as SerialisedAnnotation[];
      annotations[0] = createAnnotation(0, { left: 10, top: 40, right: 20, bottom: 30 });
      render(
        <AnnotationOverlay
          annotations={annotations}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          maxOverlayCount={1}
          selectedIndex={2}
        />,
      );
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('handles negative maxOverlayCount by falling back to per-index selection mapping', () => {
    const { mockCtx, restore } = spyOnCanvasContext();
    try {
      const annotations = [
        createAnnotation(0, { left: 10, top: 60, right: 20, bottom: 50 }),
        createAnnotation(1, { left: 25, top: 60, right: 35, bottom: 50 }),
      ];
      render(
        <AnnotationOverlay
          annotations={annotations}
          width={200}
          height={200}
          originalHeight={792}
          scale={1}
          maxOverlayCount={-1}
        />,
      );
      expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});
