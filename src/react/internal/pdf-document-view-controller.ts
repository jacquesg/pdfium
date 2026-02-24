import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { PageRotation, TextSearchResult } from '../../core/types.js';
import { usePDFiumDocument } from '../context.js';
import { useControlledScroll } from '../hooks/use-controlled-scroll.js';
import { usePageDimensions } from '../hooks/use-page-dimensions.js';
import type { SpreadMode, VisiblePage, ZoomAnchor } from '../hooks/use-visible-pages.js';
import { useVisiblePages } from '../hooks/use-visible-pages.js';
import { prefetchPageData } from '../prefetch.js';
import { usePDFiumStores } from './stores-context.js';

interface SearchStateLike {
  resultsByPage: Map<number, TextSearchResult[]>;
  currentIndex: number;
  matchIndexMap: ReadonlyArray<{ pageIndex: number; localIndex: number }>;
  currentMatchPageIndex: number | undefined;
}

interface UsePDFDocumentViewControllerOptions {
  scrollMode: 'continuous' | 'single' | 'horizontal';
  scale: number;
  gap: number;
  bufferPages: number;
  search: SearchStateLike | undefined;
  controlledPageIndex: number | undefined;
  scrollGeneration: number | undefined;
  onCurrentPageChange: ((pageIndex: number) => void) | undefined;
  containerRef: RefObject<HTMLDivElement | null> | undefined;
  zoomAnchorRef: RefObject<ZoomAnchor | null> | undefined;
  getRotation: ((pageIndex: number) => PageRotation) | undefined;
  spreadMode: SpreadMode | undefined;
}

interface UsePDFDocumentViewControllerResult {
  document: ReturnType<typeof usePDFiumDocument>['document'];
  dimensions: ReturnType<typeof usePageDimensions>['data'];
  dimensionsLoading: boolean;
  effectiveRef: RefObject<HTMLDivElement | null>;
  groupedRows: Map<number, VisiblePage[]>;
  totalHeight: number;
  totalWidth: number | undefined;
  maxContentWidth: number;
  scrollToPage: (targetPage: number, behavior: 'auto' | 'smooth') => void;
  searchResultsByPage: SearchStateLike['resultsByPage'] | undefined;
  searchCurrentIndex: number | undefined;
  searchMatchIndexMap: SearchStateLike['matchIndexMap'] | undefined;
  isHorizontal: boolean;
}

function buildVisiblePageKey(visiblePages: VisiblePage[]): string {
  return visiblePages.map((p) => p.pageIndex).join(',');
}

function groupVisiblePagesByRow(visiblePages: VisiblePage[]): Map<number, VisiblePage[]> {
  const rows: Map<number, VisiblePage[]> = new Map();
  for (const visiblePage of visiblePages) {
    const rowIndex = visiblePage.rowIndex ?? visiblePage.pageIndex;
    const row = rows.get(rowIndex);
    if (row) {
      row.push(visiblePage);
      continue;
    }
    rows.set(rowIndex, [visiblePage]);
  }
  return rows;
}

function usePDFDocumentViewController({
  scrollMode,
  scale,
  gap,
  bufferPages,
  search,
  controlledPageIndex,
  scrollGeneration,
  onCurrentPageChange,
  containerRef,
  zoomAnchorRef,
  getRotation,
  spreadMode,
}: UsePDFDocumentViewControllerOptions): UsePDFDocumentViewControllerResult {
  const { document, documentRevision } = usePDFiumDocument();
  const stores = usePDFiumStores();

  const internalRef = useRef<HTMLDivElement>(null);
  const effectiveRef = containerRef ?? internalRef;
  const wheelContainer = effectiveRef.current;

  const { data: dimensions, isLoading: dimensionsLoading } = usePageDimensions(document);

  const scrollRef: RefObject<HTMLElement | null> = effectiveRef;
  const { visiblePages, totalHeight, totalWidth, maxContentWidth, currentPageIndex } = useVisiblePages(
    scrollRef,
    dimensions,
    scale,
    {
      gap,
      bufferPages,
      zoomAnchorRef,
      spreadMode,
      getRotation,
      scrollMode,
    },
  );

  const { scrollToPage } = useControlledScroll({
    containerRef: effectiveRef,
    dimensions: dimensions ?? null,
    scale,
    gap,
    scrollMode,
    spreadMode,
    getRotation,
    currentPageIndex,
    controlledPageIndex,
    scrollGeneration,
    onCurrentPageChange,
  });

  const onPageChangeRef = useRef(onCurrentPageChange);
  const scrollModeRef = useRef(scrollMode);
  useLayoutEffect(() => {
    scrollModeRef.current = scrollMode;
  });

  useEffect(() => {
    if (scrollMode !== 'horizontal') return;
    const container = wheelContainer;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (effectiveRef.current !== container) return;
      if (scrollModeRef.current !== 'horizontal') return;
      if (e.ctrlKey || e.metaKey) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [scrollMode, wheelContainer, effectiveRef]);

  useLayoutEffect(() => {
    onPageChangeRef.current = onCurrentPageChange;
  });

  useEffect(() => {
    if (search?.currentMatchPageIndex === undefined) return;
    onPageChangeRef.current?.(search.currentMatchPageIndex);
  }, [search?.currentMatchPageIndex]);

  const visiblePageIndices = useMemo(() => buildVisiblePageKey(visiblePages), [visiblePages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: visiblePageIndices is the stable proxy for visiblePages
  useEffect(() => {
    if (!document || visiblePages.length === 0 || !dimensions) return;
    const firstVisible = visiblePages[0]?.pageIndex ?? 0;
    const lastVisible = visiblePages.at(-1)?.pageIndex ?? 0;
    const pageCount = dimensions.length;

    for (let i = lastVisible + 1; i <= Math.min(lastVisible + 2, pageCount - 1); i++) {
      prefetchPageData(document, i, documentRevision, { stores });
    }
    for (let i = firstVisible - 1; i >= Math.max(firstVisible - 2, 0); i--) {
      prefetchPageData(document, i, documentRevision, { stores });
    }
  }, [document, documentRevision, dimensions, stores, visiblePageIndices]);

  const groupedRows = useMemo(() => groupVisiblePagesByRow(visiblePages), [visiblePages]);
  const isHorizontal = scrollMode === 'horizontal';

  return {
    document,
    dimensions,
    dimensionsLoading,
    effectiveRef,
    groupedRows,
    totalHeight,
    totalWidth,
    maxContentWidth,
    scrollToPage,
    searchResultsByPage: search?.resultsByPage,
    searchCurrentIndex: search?.currentIndex,
    searchMatchIndexMap: search?.matchIndexMap,
    isHorizontal,
  };
}

export { buildVisiblePageKey, groupVisiblePagesByRow, usePDFDocumentViewController };
export type { UsePDFDocumentViewControllerOptions, UsePDFDocumentViewControllerResult };
