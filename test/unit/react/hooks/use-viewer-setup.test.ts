import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';

vi.mock('../../../../src/react/context.js', () => ({
  usePDFiumDocument: vi.fn().mockReturnValue({ document: null, documentRevision: 0 }),
}));

vi.mock('../../../../src/react/hooks/use-page-dimensions.js', () => ({
  usePageDimensions: vi.fn().mockReturnValue({ data: undefined }),
}));

vi.mock('../../../../src/react/hooks/use-fit-zoom.js', () => ({
  useFitZoom: vi.fn().mockReturnValue({ fitScale: vi.fn().mockReturnValue(1) }),
}));

const { useViewerSetup } = await import('../../../../src/react/hooks/use-viewer-setup.js');

describe('useViewerSetup', () => {
  it('returns grouped result with all expected groups', () => {
    const { result } = renderHook(() => useViewerSetup());
    const groups = ['document', 'navigation', 'zoom', 'fit', 'scroll', 'container'];
    for (const group of groups) {
      expect(result.current).toHaveProperty(group);
    }
    expect(result.current.document).toBeNull();
  });

  it('navigation group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { navigation } = result.current;
    expect(navigation.pageCount).toBe(0);
    expect(typeof navigation.pageIndex).toBe('number');
    expect(typeof navigation.setPageIndex).toBe('function');
    expect(typeof navigation.next).toBe('function');
    expect(typeof navigation.prev).toBe('function');
    expect(typeof navigation.canNext).toBe('boolean');
    expect(typeof navigation.canPrev).toBe('boolean');
  });

  it('zoom group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { zoom } = result.current;
    expect(typeof zoom.scale).toBe('number');
    expect(typeof zoom.setScale).toBe('function');
    expect(typeof zoom.zoomIn).toBe('function');
    expect(typeof zoom.zoomOut).toBe('function');
    expect(typeof zoom.reset).toBe('function');
    expect(typeof zoom.canZoomIn).toBe('boolean');
    expect(typeof zoom.canZoomOut).toBe('boolean');
  });

  it('fit group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { fit } = result.current;
    expect(typeof fit.fitWidth).toBe('function');
    expect(typeof fit.fitPage).toBe('function');
    expect(typeof fit.fitScale).toBe('function');
    expect(fit.activeFitMode).toBeNull();
  });

  it('scroll group defaults to continuous', () => {
    const { result } = renderHook(() => useViewerSetup());
    expect(result.current.scroll.scrollMode).toBe('continuous');
  });

  it('accepts initialScrollMode option', () => {
    const { result } = renderHook(() => useViewerSetup({ initialScrollMode: 'single' }));
    expect(result.current.scroll.scrollMode).toBe('single');
  });

  it('accepts initialScale option', () => {
    const { result } = renderHook(() => useViewerSetup({ initialScale: 2 }));
    expect(result.current.zoom.scale).toBe(2);
  });

  it('container group has ref and dimensions', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { container } = result.current;
    expect(container.ref).toHaveProperty('current');
    expect(container.ref.current).toBeNull();
    expect(container.dimensions).toBeUndefined();
    expect(container.zoomAnchorRef).toHaveProperty('current');
  });

  it('rotation group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { rotation } = result.current;
    expect(rotation.rotations).toBeInstanceOf(Map);
    expect(typeof rotation.getRotation).toBe('function');
    expect(typeof rotation.rotatePage).toBe('function');
    expect(typeof rotation.rotateAllPages).toBe('function');
    expect(typeof rotation.resetPageRotation).toBe('function');
    expect(typeof rotation.resetAllRotations).toBe('function');
  });

  it('fullscreen group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { fullscreen } = result.current;
    expect(typeof fullscreen.isFullscreen).toBe('boolean');
    expect(typeof fullscreen.enterFullscreen).toBe('function');
    expect(typeof fullscreen.exitFullscreen).toBe('function');
    expect(typeof fullscreen.toggleFullscreen).toBe('function');
  });

  it('spread group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { spread } = result.current;
    expect(spread.spreadMode).toBe('none');
    expect(typeof spread.setSpreadMode).toBe('function');
  });

  it('print group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { print } = result.current;
    expect(typeof print.isPrinting).toBe('boolean');
    expect(typeof print.progress).toBe('number');
    expect(typeof print.print).toBe('function');
    expect(typeof print.cancel).toBe('function');
  });

  it('interaction group contains expected properties', () => {
    const { result } = renderHook(() => useViewerSetup());
    const { interaction } = result.current;
    expect(interaction.mode).toBe('pointer');
    expect(typeof interaction.setMode).toBe('function');
    expect(typeof interaction.isDragging).toBe('boolean');
    expect(interaction.marqueeRect).toBeNull();
  });

  it('fit dimension accounts for rotation (90 degrees swaps width/height)', async () => {
    const { usePageDimensions } = await import('../../../../src/react/hooks/use-page-dimensions.js');
    const { useFitZoom } = await import('../../../../src/react/hooks/use-fit-zoom.js');
    const mockPageDimensions = vi.mocked(usePageDimensions);
    const mockFitZoom = vi.mocked(useFitZoom);

    mockPageDimensions.mockReturnValue({ data: [{ width: 612, height: 792 }] } as ReturnType<typeof usePageDimensions>);

    let capturedWidth = 0;
    let capturedHeight = 0;
    mockFitZoom.mockImplementation((_ref, w, h) => {
      capturedWidth = w;
      capturedHeight = h;
      return { fitScale: vi.fn().mockReturnValue(1) };
    });

    // Render the hook — initial rotation is None so dimensions are unswapped
    const { result, rerender } = renderHook(() => useViewerSetup());
    expect(capturedWidth).toBe(612);
    expect(capturedHeight).toBe(792);

    // Rotate page 0 by 90 degrees clockwise — width/height should swap
    act(() => {
      result.current.rotation.rotatePage(0, 'cw');
    });
    rerender();

    expect(capturedWidth).toBe(792);
    expect(capturedHeight).toBe(612);
  });

  it('accepts initialSpreadMode option', () => {
    const { result } = renderHook(() => useViewerSetup({ initialSpreadMode: 'odd' }));
    expect(result.current.spread.spreadMode).toBe('odd');
  });

  it('uses configured page gap when computing spread fit width', async () => {
    const { usePDFiumDocument } = await import('../../../../src/react/context.js');
    const { usePageDimensions } = await import('../../../../src/react/hooks/use-page-dimensions.js');
    const { useFitZoom } = await import('../../../../src/react/hooks/use-fit-zoom.js');

    const mockPDFiumDocument = vi.mocked(usePDFiumDocument);
    const mockPageDimensions = vi.mocked(usePageDimensions);
    const mockFitZoom = vi.mocked(useFitZoom);

    mockPDFiumDocument.mockReturnValue({
      document: { pageCount: 2 } as never,
      documentRevision: 0,
      documentName: null,
      bumpDocumentRevision: vi.fn(),
      invalidateCache: vi.fn(),
      loadDocument: vi.fn(async () => {}),
      loadDocumentFromUrl: vi.fn(async () => {}),
      error: null,
      isInitialising: false,
      password: {
        required: false,
        attempted: false,
        error: null,
        submit: vi.fn(async () => {}),
        cancel: vi.fn(),
      },
    });

    mockPageDimensions.mockReturnValue({
      data: [
        { width: 612, height: 792 },
        { width: 612, height: 792 },
      ],
    } as ReturnType<typeof usePageDimensions>);

    let capturedWidth = 0;
    mockFitZoom.mockImplementation((_ref, width) => {
      capturedWidth = width;
      return { fitScale: vi.fn().mockReturnValue(1) };
    });

    // `pageGap` is intentionally provided to validate spread fit width wiring.
    renderHook(() => useViewerSetup({ initialSpreadMode: 'even', pageGap: 40 } as never));

    expect(capturedWidth).toBe(1264); // 612 + 612 + 40

    // Restore default context mock for following tests.
    mockPDFiumDocument.mockReturnValue({ document: null, documentRevision: 0 } as ReturnType<typeof usePDFiumDocument>);
  });

  it('clears active fit mode after a manual zoom action', () => {
    const { result } = renderHook(() => useViewerSetup());

    act(() => {
      result.current.fit.fitWidth();
    });
    expect(result.current.fit.activeFitMode).toBe('page-width');

    act(() => {
      result.current.zoom.zoomIn();
    });
    expect(result.current.fit.activeFitMode).toBeNull();
  });

  it('resets per-page rotations when the document instance changes', async () => {
    const { usePDFiumDocument } = await import('../../../../src/react/context.js');
    const mockPDFiumDocument = vi.mocked(usePDFiumDocument);

    const firstDocument = { pageCount: 1 } as never;
    const secondDocument = { pageCount: 1 } as never;
    let currentDocument = firstDocument;

    mockPDFiumDocument.mockImplementation(
      () =>
        ({
          document: currentDocument,
          documentRevision: 0,
          documentName: null,
          bumpDocumentRevision: vi.fn(),
          invalidateCache: vi.fn(),
          loadDocument: vi.fn(async () => {}),
          loadDocumentFromUrl: vi.fn(async () => {}),
          error: null,
          isInitialising: false,
          password: {
            required: false,
            attempted: false,
            error: null,
            submit: vi.fn(async () => {}),
            cancel: vi.fn(),
          },
        }) as ReturnType<typeof usePDFiumDocument>,
    );

    const { result, rerender } = renderHook(() => useViewerSetup());

    act(() => {
      result.current.rotation.rotatePage(0, 'cw');
    });
    expect(result.current.rotation.getRotation(0)).toBe(PageRotation.Clockwise90);

    currentDocument = secondDocument;
    rerender();

    expect(result.current.rotation.getRotation(0)).toBe(PageRotation.None);

    mockPDFiumDocument.mockReturnValue({ document: null, documentRevision: 0 } as ReturnType<typeof usePDFiumDocument>);
  });

  it('keeps navigation page index within range across rapid document context switches', async () => {
    const { usePDFiumDocument } = await import('../../../../src/react/context.js');
    const mockPDFiumDocument = vi.mocked(usePDFiumDocument);
    type ContextDocument = NonNullable<ReturnType<typeof usePDFiumDocument>['document']>;

    const docs = [{ pageCount: 20 }, { pageCount: 2 }, { pageCount: 50 }, { pageCount: 1 }] as const;
    let currentDocument = docs[0] as unknown as ContextDocument;

    mockPDFiumDocument.mockImplementation(
      () =>
        ({
          document: currentDocument,
          documentRevision: 0,
          documentName: null,
          bumpDocumentRevision: vi.fn(),
          invalidateCache: vi.fn(),
          loadDocument: vi.fn(async () => {}),
          loadDocumentFromUrl: vi.fn(async () => {}),
          error: null,
          isInitialising: false,
          password: {
            required: false,
            attempted: false,
            error: null,
            submit: vi.fn(async () => {}),
            cancel: vi.fn(),
          },
        }) as ReturnType<typeof usePDFiumDocument>,
    );

    const { result, rerender } = renderHook(() => useViewerSetup());

    act(() => {
      result.current.navigation.setPageIndex(15);
    });
    expect(result.current.navigation.pageIndex).toBe(15);

    const switchSequence = [docs[1], docs[2], docs[3], docs[0], docs[1]];
    for (const nextDocument of switchSequence) {
      currentDocument = nextDocument as unknown as ContextDocument;
      rerender();
      const max = Math.max(0, nextDocument.pageCount - 1);
      expect(result.current.navigation.pageIndex).toBeGreaterThanOrEqual(0);
      expect(result.current.navigation.pageIndex).toBeLessThanOrEqual(max);
    }

    mockPDFiumDocument.mockReturnValue({ document: null, documentRevision: 0 } as ReturnType<typeof usePDFiumDocument>);
  });
});
