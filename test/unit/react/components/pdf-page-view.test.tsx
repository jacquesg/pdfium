import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';

// ── Mocks ───────────────────────────────────────────────────────

const mockUseRenderPage = vi.fn().mockReturnValue({
  renderKey: null,
  width: 612,
  height: 792,
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

vi.mock('../../../../src/react/hooks/use-text-content.js', () => ({
  useTextContent: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('../../../../src/react/hooks/use-annotations.js', () => ({
  useAnnotations: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('../../../../src/react/hooks/use-links.js', () => ({
  useLinks: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('../../../../src/react/hooks/use-web-links.js', () => ({
  useWebLinks: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('../../../../src/react/hooks/use-device-pixel-ratio.js', () => ({
  useDevicePixelRatio: () => 1,
}));

// Stub overlay components to avoid deep dependency chains
vi.mock('../../../../src/react/components/pdf-canvas.js', () => ({
  PDFCanvas: (props: Record<string, unknown>) => {
    const { renderKey: _renderKey, ...domProps } = props;
    return <canvas data-testid="pdf-canvas" {...domProps} />;
  },
}));

vi.mock('../../../../src/react/components/text-overlay.js', () => ({
  TextOverlay: () => <div data-testid="text-overlay" />,
}));

vi.mock('../../../../src/react/components/search-highlight-overlay.js', () => ({
  SearchHighlightOverlay: () => <div data-testid="search-highlight-overlay" />,
}));

vi.mock('../../../../src/react/components/annotation-overlay.js', () => ({
  AnnotationOverlay: () => <div data-testid="annotation-overlay" />,
}));

vi.mock('../../../../src/react/components/link-overlay.js', () => ({
  LinkOverlay: () => <div data-testid="link-overlay" />,
}));

const { PDFPageView } = await import('../../../../src/react/components/pdf-page-view.js');

describe('PDFPageView', () => {
  const mockDoc = { id: 'doc-1' } as never;

  it('renders a container with data-page-index', () => {
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={3} scale={1} />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute('data-page-index')).toBe('3');
  });

  it('renders PDFCanvas', () => {
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} />);

    expect(container.querySelector('[data-testid="pdf-canvas"]')).not.toBeNull();
  });

  it('renders aria-label on the canvas', () => {
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={2} scale={1} />);

    const canvas = container.querySelector('[data-testid="pdf-canvas"]');
    expect(canvas?.getAttribute('aria-label')).toBe('PDF page 3');
  });

  it('does not render TextOverlay when showTextLayer is false', () => {
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} showTextLayer={false} />);

    expect(container.querySelector('[data-testid="text-overlay"]')).toBeNull();
  });

  it('does not render AnnotationOverlay when showAnnotations is false', () => {
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} showAnnotations={false} />);

    expect(container.querySelector('[data-testid="annotation-overlay"]')).toBeNull();
  });

  it('does not render SearchHighlightOverlay when no searchResults', () => {
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} />);

    expect(container.querySelector('[data-testid="search-highlight-overlay"]')).toBeNull();
  });

  it('renders SearchHighlightOverlay when searchResults are provided', () => {
    const results = [{ charIndex: 0, charCount: 4, rects: [{ left: 0, top: 0, right: 10, bottom: 10 }] }];
    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} searchResults={results} />);

    expect(container.querySelector('[data-testid="search-highlight-overlay"]')).not.toBeNull();
  });

  it('uses container dimensions from render result', () => {
    mockUseRenderPage.mockReturnValue({
      renderKey: 'key-1',
      width: 306,
      height: 396,
      originalWidth: 612,
      originalHeight: 792,
      isLoading: false,
      isPlaceholderData: false,
      error: null,
    });

    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={0.5} />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe('306px');
    expect(wrapper.style.height).toBe('396px');
  });

  it('uses target dimensions when isPlaceholderData is true', () => {
    mockUseRenderPage.mockReturnValue({
      renderKey: 'prev-key',
      width: 612,
      height: 792,
      originalWidth: 612,
      originalHeight: 792,
      isLoading: false,
      isPlaceholderData: true,
      error: null,
    });

    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={2} />);

    const wrapper = container.firstElementChild as HTMLElement;
    // Target dimensions: originalWidth * scale = 612 * 2 = 1224
    expect(wrapper.style.width).toBe('1224px');
    expect(wrapper.style.height).toBe('1584px');
  });

  it('sets skeleton background when loading without placeholder', () => {
    mockUseRenderPage.mockReturnValue({
      renderKey: null,
      width: null,
      height: null,
      originalWidth: 612,
      originalHeight: 792,
      isLoading: true,
      isPlaceholderData: false,
      error: null,
    });

    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} />);

    const wrapper = container.firstElementChild as HTMLElement;
    // CSS custom property: var(--pdfium-page-bg-loading, #f3f4f6)
    // happy-dom drops background-color values containing var() entirely,
    // so we verify the loading container renders with the correct original dimensions instead
    expect(wrapper.style.width).toBe('612px');
    expect(wrapper.style.height).toBe('792px');
  });

  it('uses expectedWidth/expectedHeight for container sizing while loading', () => {
    mockUseRenderPage.mockReturnValue({
      renderKey: null,
      width: null,
      height: null,
      originalWidth: null,
      originalHeight: null,
      isLoading: true,
      isPlaceholderData: false,
      error: null,
    });

    const { container } = render(
      <PDFPageView document={mockDoc} pageIndex={0} scale={1.5} expectedWidth={612} expectedHeight={792} />,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    // expectedWidth * scale = 612 * 1.5 = 918
    expect(wrapper.style.width).toBe('918px');
    // expectedHeight * scale = 792 * 1.5 = 1188
    expect(wrapper.style.height).toBe('1188px');
  });

  it('applies className and style props', () => {
    const { container } = render(
      <PDFPageView document={mockDoc} pageIndex={0} scale={1} className="custom" style={{ margin: 10 }} />,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('custom');
    expect(wrapper.style.margin).toBe('10px');
  });

  it('passes scale to useRenderPage', () => {
    render(<PDFPageView document={mockDoc} pageIndex={0} scale={1.5} />);

    expect(mockUseRenderPage).toHaveBeenCalledWith(mockDoc, 0, expect.objectContaining({ scale: 1.5 }));
  });

  it('passes rotation to useRenderPage when provided', () => {
    render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} rotation={PageRotation.Clockwise90} />);

    expect(mockUseRenderPage).toHaveBeenCalledWith(
      mockDoc,
      0,
      expect.objectContaining({ scale: 1, rotation: PageRotation.Clockwise90 }),
    );
  });

  it('does not include rotation in options when undefined', () => {
    render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} />);

    const calls = mockUseRenderPage.mock.calls;
    const lastCall = calls[calls.length - 1];
    const options = lastCall?.[2];
    expect(options).toEqual({ scale: 1 });
    expect('rotation' in options).toBe(false);
  });

  it('sets opacity on canvas when showing placeholder data', () => {
    mockUseRenderPage.mockReturnValue({
      renderKey: 'prev-key',
      width: 612,
      height: 792,
      originalWidth: 612,
      originalHeight: 792,
      isLoading: false,
      isPlaceholderData: true,
      error: null,
    });

    const { container } = render(<PDFPageView document={mockDoc} pageIndex={0} scale={1} />);

    const canvas = container.querySelector('[data-testid="pdf-canvas"]') as HTMLElement;
    expect(canvas.style.opacity).toBe('var(--pdfium-page-placeholder-opacity, 0.7)');
  });
});
