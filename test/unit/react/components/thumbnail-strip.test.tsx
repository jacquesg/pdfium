import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: () => ({ document: null, documentRevision: 0 }),
}));

const mockDimensions = [
  { width: 612, height: 792 },
  { width: 612, height: 792 },
  { width: 612, height: 792 },
];

vi.mock('../../../../src/react/hooks/use-page-dimensions.js', () => ({
  usePageDimensions: () => ({
    data: mockDimensions,
    isLoading: false,
    error: null,
  }),
}));

const mockUseVisiblePages = vi.fn().mockReturnValue({
  visiblePages: [
    { pageIndex: 0, offsetY: 0 },
    { pageIndex: 1, offsetY: 170 },
    { pageIndex: 2, offsetY: 340 },
  ],
  totalHeight: 510,
  currentPageIndex: 0,
});

vi.mock('../../../../src/react/hooks/use-visible-pages.js', () => ({
  useVisiblePages: (...args: unknown[]) => mockUseVisiblePages(...args),
}));

// Stub useRenderPage and PDFCanvas to avoid the full render pipeline
const mockUseRenderPage = vi.fn();
vi.mock('../../../../src/react/use-render.js', () => ({
  useRenderPage: (...args: unknown[]) => mockUseRenderPage(...args),
}));

vi.mock('../../../../src/react/components/pdf-canvas.js', () => ({
  PDFCanvas: ({ renderKey: _renderKey, ...props }: Record<string, unknown>) => (
    <canvas data-testid="thumb-canvas" {...props} />
  ),
}));

const { ThumbnailStrip } = await import('../../../../src/react/components/thumbnail-strip.js');

const defaultRenderPageResult = {
  renderKey: null,
  width: 122,
  height: 158,
  originalWidth: 612,
  originalHeight: 792,
  isLoading: false,
  isPlaceholderData: false,
  error: null,
};

describe('ThumbnailStrip', () => {
  const mockDoc = { id: 'doc-1' } as never;

  beforeEach(() => {
    mockUseRenderPage.mockReset();
    mockUseRenderPage.mockReturnValue(defaultRenderPageResult);
  });

  it('returns null when document is null', () => {
    const { container } = render(
      <ThumbnailStrip document={null} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders a listbox container', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeDefined();
    expect(listbox.getAttribute('aria-label')).toBe('Page thumbnails');
  });

  it('renders visible page thumbnails as option buttons', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('sets aria-selected on the active page', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={1} onPageSelect={vi.fn()} />);

    const options = screen.getAllByRole('option');
    const page1 = options.find((o) => o.getAttribute('aria-label') === 'Page 2');
    expect(page1?.getAttribute('aria-selected')).toBe('true');
  });

  it('sets aria-selected=false on non-active pages', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    const options = screen.getAllByRole('option');
    const page2 = options.find((o) => o.getAttribute('aria-label') === 'Page 2');
    expect(page2?.getAttribute('aria-selected')).toBe('false');
  });

  it('labels thumbnails with page numbers', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Page 1' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Page 2' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Page 3' })).toBeDefined();
  });

  it('calls onPageSelect when a thumbnail is clicked', () => {
    const onPageSelect = vi.fn();
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={onPageSelect} />);

    const page2 = screen.getByRole('option', { name: 'Page 2' });
    fireEvent.click(page2);

    expect(onPageSelect).toHaveBeenCalledWith(1);
  });

  it('applies className and style', () => {
    render(
      <ThumbnailStrip
        document={mockDoc}
        pageCount={5}
        currentPageIndex={0}
        onPageSelect={vi.fn()}
        className="thumb-strip"
        style={{ width: 200 }}
      />,
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox.className).toContain('thumb-strip');
    expect((listbox as HTMLElement).style.width).toBe('200px');
  });

  it('merges className with classNames.container', () => {
    render(
      <ThumbnailStrip
        document={mockDoc}
        pageCount={5}
        currentPageIndex={0}
        onPageSelect={vi.fn()}
        className="thumb-strip"
        classNames={{ container: 'thumb-container' }}
      />,
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox.className).toContain('thumb-strip');
    expect(listbox.className).toContain('thumb-container');
  });

  it('renders loading placeholders when renderKey is null', () => {
    const { container } = render(
      <ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />,
    );

    // renderKey is null in mock → loading placeholder divs instead of PDFCanvas
    const canvases = container.querySelectorAll('[data-testid="thumb-canvas"]');
    expect(canvases).toHaveLength(0);

    // Three visible thumbnails should still render as list items
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(3);
  });

  it('renders canvases when renderKey is present', () => {
    mockUseRenderPage.mockReturnValue({
      ...defaultRenderPageResult,
      renderKey: 'page-render-key',
    });

    const { container } = render(
      <ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />,
    );

    const canvases = container.querySelectorAll('[data-testid="thumb-canvas"]');
    expect(canvases).toHaveLength(3);
  });

  it('falls back canvas dimensions to zero and display size to zero when render dimensions are unavailable', () => {
    mockUseRenderPage.mockReturnValue({
      ...defaultRenderPageResult,
      renderKey: 'page-render-key',
      width: null,
      height: undefined,
      originalWidth: null,
      originalHeight: null,
    });

    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    const firstCanvas = screen.getAllByTestId('thumb-canvas')[0] as HTMLCanvasElement;
    expect(firstCanvas.getAttribute('width')).toBe('0');
    expect(firstCanvas.getAttribute('height')).toBe('0');
    expect(firstCanvas.style.width).toBe('0px');
    expect(firstCanvas.style.height).toBe('0px');
  });

  it('displays page number text below each thumbnail', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('sets total height on the spacer div', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    const listbox = screen.getByRole('listbox');
    const spacer = listbox.firstElementChild as HTMLElement;
    expect(spacer.style.height).toBe('510px');
  });

  it('passes thumbnailScale to useVisiblePages', () => {
    render(
      <ThumbnailStrip
        document={mockDoc}
        pageCount={5}
        currentPageIndex={0}
        onPageSelect={vi.fn()}
        thumbnailScale={0.3}
      />,
    );

    // useVisiblePages should be called with the thumbnail scale
    expect(mockUseVisiblePages).toHaveBeenCalledWith(
      expect.anything(), // containerRef
      mockDimensions,
      0.3,
      expect.objectContaining({ gap: 24, bufferPages: 3 }),
    );
  });

  it('uses default thumbnailScale of 0.2', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    expect(mockUseVisiblePages).toHaveBeenCalledWith(expect.anything(), mockDimensions, 0.2, expect.anything());
  });

  it('highlights active thumbnail with blue border', () => {
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={vi.fn()} />);

    const activeThumbnail = screen.getByRole('option', { name: 'Page 1' });
    // CSS custom property: outline uses var(--pdfium-thumb-active-colour, #3b82f6)
    // happy-dom drops outline values containing var() entirely, so we verify
    // outlineOffset (which is set alongside outline) as a proxy for the active style
    expect(activeThumbnail.style.outlineOffset).toBe('2px');
  });

  it('resets scroll position when document instance changes', async () => {
    const docA = { id: 'doc-a' } as never;
    const docB = { id: 'doc-b' } as never;
    const { rerender } = render(
      <ThumbnailStrip document={docA} pageCount={5} currentPageIndex={1} onPageSelect={vi.fn()} />,
    );

    const listbox = screen.getByRole('listbox') as HTMLElement;
    listbox.scrollTop = 180;
    listbox.scrollLeft = 24;

    rerender(<ThumbnailStrip document={docB} pageCount={5} currentPageIndex={1} onPageSelect={vi.fn()} />);

    await waitFor(() => {
      expect(listbox.scrollTop).toBe(0);
      expect(listbox.scrollLeft).toBe(0);
    });
  });

  it('navigates with keyboard and ignores non-navigation keys', () => {
    const onPageSelect = vi.fn();
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={1} onPageSelect={onPageSelect} />);

    const listbox = screen.getByRole('listbox');

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(onPageSelect).toHaveBeenCalledWith(2);

    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(onPageSelect).toHaveBeenCalledTimes(1);
  });

  it('does not navigate past bounds when keyboard target resolves to null', () => {
    const onPageSelect = vi.fn();
    render(<ThumbnailStrip document={mockDoc} pageCount={5} currentPageIndex={0} onPageSelect={onPageSelect} />);

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });

    expect(onPageSelect).not.toHaveBeenCalled();
  });
});
