import { render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useRenderPageMock = vi.fn();

vi.mock('../../../../../src/react/use-render.js', () => ({
  useRenderPage: (...args: unknown[]) => useRenderPageMock(...args),
}));

vi.mock('../../../../../src/react/hooks/use-device-pixel-ratio.js', () => ({
  useDevicePixelRatio: () => 2,
}));

vi.mock('../../../../../src/react/components/pdf-canvas.js', () => ({
  PDFCanvas: ({ renderKey, style }: { renderKey?: string | null; style?: CSSProperties }) => (
    <div data-testid="mask-canvas" data-render-key={renderKey ?? ''} style={style} />
  ),
}));

const { CommittedAnnotationMaskOverlay, buildCommittedAnnotationMaskRect } = await import(
  '../../../../../src/react/editor/components/committed-annotation-mask-overlay.js'
);

describe('CommittedAnnotationMaskOverlay', () => {
  beforeEach(() => {
    useRenderPageMock.mockReset();
    useRenderPageMock.mockReturnValue({
      renderKey: 'mask-render',
      width: 1200,
      height: 1600,
    });
  });

  it('builds a padded mask rect and clamps it to the page bounds', () => {
    expect(
      buildCommittedAnnotationMaskRect({
        rect: { left: 2, top: 98, right: 40, bottom: 4 },
        strokeWidth: 3,
        scale: 2,
        pageWidth: 60,
        pageHeight: 100,
      }),
    ).toEqual({
      left: 0,
      top: 100,
      right: 43,
      bottom: 1,
    });
  });

  it('renders a clipped annotation-free canvas patch aligned to the page', () => {
    render(
      <CommittedAnnotationMaskOverlay
        document={{ id: 'doc-1' } as never}
        pageIndex={0}
        maskRect={{ left: 10, top: 200, right: 110, bottom: 100 }}
        scale={1}
        originalHeight={300}
        pageWidth={600}
        pageHeight={300}
        active
      />,
    );

    expect(useRenderPageMock).toHaveBeenCalledWith(
      { id: 'doc-1' },
      0,
      expect.objectContaining({
        scale: 2,
        clipRect: { left: 10, top: 200, right: 110, bottom: 100 },
        renderAnnotations: false,
      }),
    );

    const mask = screen.getByTestId('selection-committed-mask');
    expect((mask as HTMLElement).style.left).toBe('10px');
    expect((mask as HTMLElement).style.top).toBe('100px');
    expect((mask as HTMLElement).style.width).toBe('100px');
    expect((mask as HTMLElement).style.height).toBe('100px');
    expect((mask as HTMLElement).style.opacity).toBe('1');

    const canvas = screen.getByTestId('mask-canvas');
    expect((canvas as HTMLElement).style.left).toBe('-10px');
    expect((canvas as HTMLElement).style.top).toBe('-100px');
    expect((canvas as HTMLElement).style.width).toBe('600px');
  });

  it('returns null until the annotation-free render is ready', () => {
    useRenderPageMock.mockReturnValue({
      renderKey: null,
      width: null,
      height: null,
    });

    const { container } = render(
      <CommittedAnnotationMaskOverlay
        document={{ id: 'doc-1' } as never}
        pageIndex={0}
        maskRect={{ left: 10, top: 200, right: 110, bottom: 100 }}
        scale={1}
        originalHeight={300}
        pageWidth={600}
        pageHeight={300}
        active
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
