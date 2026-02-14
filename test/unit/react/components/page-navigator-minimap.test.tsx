import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const mockUseRenderPage = vi.fn().mockReturnValue({
  renderKey: 'thumb-key',
  width: 200,
  height: 259,
  originalWidth: 612,
  originalHeight: 792,
  isLoading: false,
  isPlaceholderData: false,
  error: null,
});

vi.mock('../../../../src/react/use-render.js', () => ({
  useRenderPage: (...args: unknown[]) => mockUseRenderPage(...args),
}));

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => ({ document: null, documentRevision: 0 }),
}));

vi.mock('../../../../src/react/components/pdf-canvas.js', () => ({
  PDFCanvas: (props: Record<string, unknown>) => {
    const { renderKey: _renderKey, ...domProps } = props;
    return <canvas data-testid="minimap-canvas" {...domProps} />;
  },
}));

const { PageNavigatorMinimap } = await import('../../../../src/react/components/page-navigator-minimap.js');

describe('PageNavigatorMinimap', () => {
  const mockDoc = { id: 'doc-1' } as never;
  const defaultViewport = { left: 0, bottom: 0, right: 300, top: 300 };

  it('renders a thumbnail canvas', () => {
    const { container } = render(
      <PageNavigatorMinimap document={mockDoc} pageIndex={0} viewport={defaultViewport} onViewportChange={vi.fn()} />,
    );

    expect(container.querySelector('[data-testid="minimap-canvas"]')).not.toBeNull();
  });

  it('renders an SVG viewport rectangle', () => {
    const { container } = render(
      <PageNavigatorMinimap document={mockDoc} pageIndex={0} viewport={defaultViewport} onViewportChange={vi.fn()} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const rect = svg?.querySelector('rect');
    expect(rect).not.toBeNull();
  });

  it('calls onViewportChange when clicked', () => {
    const onViewportChange = vi.fn();
    const { container } = render(
      <PageNavigatorMinimap
        document={mockDoc}
        pageIndex={0}
        viewport={defaultViewport}
        onViewportChange={onViewportChange}
      />,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    // Mock getBoundingClientRect
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 259,
      width: 200,
      height: 259,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(wrapper, { clientX: 100, clientY: 130 });

    expect(onViewportChange).toHaveBeenCalledTimes(1);
    const newViewport = onViewportChange.mock.calls[0]?.[0];
    expect(newViewport).toBeDefined();
    // The viewport should be centred around the click point in PDF coordinates
    expect(newViewport.right - newViewport.left).toBeCloseTo(300); // Same width as original
    expect(newViewport.top - newViewport.bottom).toBeCloseTo(300); // Same height as original
  });

  it('uses custom thumbnailWidth', () => {
    render(
      <PageNavigatorMinimap
        document={mockDoc}
        pageIndex={0}
        thumbnailWidth={150}
        viewport={defaultViewport}
        onViewportChange={vi.fn()}
      />,
    );

    expect(mockUseRenderPage).toHaveBeenCalledWith(mockDoc, 0, expect.objectContaining({ width: 150 }));
  });

  it('sets crosshair cursor', () => {
    const { container } = render(
      <PageNavigatorMinimap document={mockDoc} pageIndex={0} viewport={defaultViewport} onViewportChange={vi.fn()} />,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.cursor).toBe('crosshair');
  });

  it('applies className and style props', () => {
    const { container } = render(
      <PageNavigatorMinimap
        document={mockDoc}
        pageIndex={0}
        viewport={defaultViewport}
        onViewportChange={vi.fn()}
        className="custom-minimap"
        style={{ border: '1px solid red' }}
      />,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('custom-minimap');
    expect(wrapper.style.border).toBe('1px solid red');
  });
});
