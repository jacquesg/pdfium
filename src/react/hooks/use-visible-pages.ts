import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PageRotation } from '../../core/types.js';
import { resolveVisiblePagesGeometry, type ScrollMode, type SpreadMode } from '../internal/visible-pages-geometry.js';
import {
  areVisiblePagesEqual,
  computeCurrentPageIndex,
  computeVisiblePages,
  type VisiblePage,
} from '../internal/visible-pages-model.js';
import type { PageDimension } from './use-page-dimensions.js';

export type { ScrollMode, SpreadMode } from '../internal/visible-pages-geometry.js';

/** Anchor data written by useWheelZoom for cursor-anchored zoom. */
export interface ZoomAnchor {
  /** Cursor X relative to container viewport. */
  cursorX: number;
  /** Cursor Y relative to container viewport. */
  cursorY: number;
  /** Container scrollTop at the moment of the wheel event (unclamped). */
  scrollTop: number;
  /** Container scrollLeft at the moment of the wheel event (unclamped). */
  scrollLeft: number;
  /** newScale / oldScale ratio. */
  ratio: number;
}

export interface UseVisiblePagesOptions {
  /** Gap between pages in CSS pixels. Default: 16. */
  gap?: number;
  /** Number of extra pages to render above/below the viewport. Default: 1. */
  bufferPages?: number;
  /**
   * Ref written by useWheelZoom for cursor-anchored zoom.
   * When set, the next scroll adjustment uses the anchor instead of ratio-based preservation.
   */
  zoomAnchorRef?: RefObject<ZoomAnchor | null> | undefined;
  /** Spread mode. Default: 'none'. */
  spreadMode?: SpreadMode | undefined;
  /** Per-page rotation getter. When provided, effective dimensions account for rotation. */
  getRotation?: ((pageIndex: number) => PageRotation) | undefined;
  /** Scroll direction. Default: 'continuous'. */
  scrollMode?: ScrollMode | undefined;
}
export type { VisiblePage } from '../internal/visible-pages-model.js';

export interface UseVisiblePagesResult {
  visiblePages: VisiblePage[];
  /** Total height of all pages + gaps, in CSS pixels. For the scroll container's inner div. */
  totalHeight: number;
  /** Total width in horizontal mode, in CSS pixels. */
  totalWidth?: number | undefined;
  /** Max row width in vertical mode (for spacer min-width, enabling horizontal scroll on wide pages). */
  maxContentWidth: number;
  /** Index of the page with the most visible area. For toolbar display. */
  currentPageIndex: number;
}

// useLayoutEffect on client, useEffect on server (avoids SSR warning)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Virtualisation hook: given a scroll container, page dimensions, and scale,
 * determines which pages are currently visible (plus buffer pages).
 *
 * Uses binary search on the cumulative offset array for O(log n) scroll
 * performance — NOT O(n) linear scan through all pages.
 *
 * Scroll events are throttled via requestAnimationFrame to avoid layout thrashing.
 */
export function useVisiblePages(
  containerRef: RefObject<HTMLElement | null>,
  dimensions: PageDimension[] | undefined,
  scale: number,
  options?: UseVisiblePagesOptions,
): UseVisiblePagesResult {
  const gap = options?.gap ?? 16;
  const bufferPages = options?.bufferPages ?? 1;
  const zoomAnchorRef = options?.zoomAnchorRef;
  const spreadMode = options?.spreadMode ?? 'none';
  const getRotation = options?.getRotation;
  const scrollMode = options?.scrollMode ?? 'continuous';

  const geometry = useMemo(
    () =>
      resolveVisiblePagesGeometry({
        dimensions,
        scale,
        gap,
        spreadMode,
        getRotation,
        scrollMode,
      }),
    [dimensions, scale, gap, spreadMode, getRotation, scrollMode],
  );

  const { spreadRows, rowOffsets, pageOffsets, totalHeight, totalWidth, maxContentWidth } = geometry;

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [trackedContainer, setTrackedContainer] = useState<HTMLElement | null>(null);
  const container = trackedContainer;
  const rafRef = useRef(0);
  const prevVisibleRef = useRef<VisiblePage[]>([]);

  // Scroll preservation: save scrollTop in a ref that is protected from browser clamping.
  // When the browser resizes content (e.g. scale change), it clamps scrollTop BEFORE
  // useLayoutEffect fires, which would corrupt our saved value. The isAdjustingRef guard
  // is set during render (before DOM commit) so the scroll handler knows not to save.
  const savedScrollTopRef = useRef(0);
  const savedScrollLeftRef = useRef(0);
  const prevTotalHeightRef = useRef(0);
  const prevTotalWidthRef = useRef(0);
  const isAdjustingRef = useRef(false);

  // The effective total dimension for scroll preservation (vertical or horizontal)
  const totalDimension = scrollMode === 'horizontal' ? (totalWidth ?? 0) : totalHeight;

  // Whether dimensions have loaded (used to re-trigger measurement)
  const hasDimensions = !!dimensions && dimensions.length > 0;

  // Set the guard flag during render when we detect total dimension is about to change.
  // This runs BEFORE the DOM commit, so scroll events from browser clamping won't
  // overwrite saved scroll refs while the guard is active.
  if (
    totalDimension !== (scrollMode === 'horizontal' ? prevTotalWidthRef.current : prevTotalHeightRef.current) &&
    (scrollMode === 'horizontal' ? prevTotalWidthRef.current : prevTotalHeightRef.current) > 0
  ) {
    isAdjustingRef.current = true;
  }

  // Ref assignment happens after render; mirror the live element into state so
  // effects can bind listeners immediately when the container mounts.
  useIsomorphicLayoutEffect(() => {
    const nextContainer = containerRef.current;
    if (nextContainer !== trackedContainer) {
      setTrackedContainer(nextContainer);
    }
  });

  // Attach scroll listener and ResizeObserver.
  // Re-runs when dimensions first become available to re-measure the container
  // after the content switches from loading state to actual pages.
  // biome-ignore lint/correctness/useExhaustiveDependencies: hasDimensions intentionally re-attaches when dimensions load
  useEffect(() => {
    if (!container) return;
    let active = true;

    const handleScroll = () => {
      if (!active || containerRef.current !== container) return;
      // Only save scroll position when NOT adjusting — during scale changes, the browser
      // fires scroll events with clamped values that would corrupt our saved position.
      if (!isAdjustingRef.current) {
        savedScrollTopRef.current = container.scrollTop;
        savedScrollLeftRef.current = container.scrollLeft;
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!active || containerRef.current !== container) return;
        setScrollTop(container.scrollTop);
        setScrollLeft(container.scrollLeft);
        setViewportHeight(container.clientHeight);
        setViewportWidth(container.clientWidth);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // ResizeObserver for container resize — fires immediately on observe() with current size
    const resizeObserver = new ResizeObserver(() => {
      if (!active || containerRef.current !== container) return;
      setViewportHeight(container.clientHeight);
      setViewportWidth(container.clientWidth);
    });
    resizeObserver.observe(container);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [container, hasDimensions]);

  // Synchronous measurement after DOM mutation — useLayoutEffect fires before paint.
  // Handles two types of scroll adjustment:
  // 1. Cursor-anchored zoom: keeps the point under the cursor stationary
  // 2. Ratio-based preservation: keeps the same relative position in the document
  useIsomorphicLayoutEffect(() => {
    if (!container) return;

    const anchor = zoomAnchorRef?.current ?? null;

    if (anchor && zoomAnchorRef) {
      // Cursor-anchored zoom: keep the content under the cursor stationary
      zoomAnchorRef.current = null;
      container.scrollTop = (anchor.scrollTop + anchor.cursorY) * anchor.ratio - anchor.cursorY;
      container.scrollLeft = (anchor.scrollLeft + anchor.cursorX) * anchor.ratio - anchor.cursorX;
    } else if (scrollMode === 'horizontal') {
      const prevWidth = prevTotalWidthRef.current;
      const curWidth = totalWidth ?? 0;
      if (prevWidth > 0 && curWidth > 0 && prevWidth !== curWidth) {
        container.scrollLeft = savedScrollLeftRef.current * (curWidth / prevWidth);
      }
    } else {
      const prevTotal = prevTotalHeightRef.current;
      if (prevTotal > 0 && totalHeight > 0 && prevTotal !== totalHeight) {
        container.scrollTop = savedScrollTopRef.current * (totalHeight / prevTotal);
      }
    }

    // Update refs for next cycle
    isAdjustingRef.current = false;
    prevTotalHeightRef.current = totalHeight;
    prevTotalWidthRef.current = totalWidth ?? 0;
    savedScrollTopRef.current = container.scrollTop;
    savedScrollLeftRef.current = container.scrollLeft;

    setScrollTop(container.scrollTop);
    setScrollLeft(container.scrollLeft);
    setViewportHeight(container.clientHeight);
    setViewportWidth(container.clientWidth);
  }, [container, hasDimensions, totalHeight, totalWidth, scrollMode, zoomAnchorRef]);

  // Binary search on row offsets to find visible rows, then expand to pages
  const visiblePages = useMemo((): VisiblePage[] => {
    if (!dimensions) return [];
    const result = computeVisiblePages({
      spreadRows,
      rowOffsets,
      pageOffsets,
      scrollMode,
      scrollTop,
      scrollLeft,
      viewportHeight,
      viewportWidth,
      bufferPages,
    });
    const prev = prevVisibleRef.current;
    if (areVisiblePagesEqual(prev, result)) {
      return prev;
    }
    prevVisibleRef.current = result;
    return result;
  }, [
    rowOffsets,
    pageOffsets,
    dimensions,
    spreadRows,
    scrollMode,
    scrollTop,
    scrollLeft,
    viewportHeight,
    viewportWidth,
    bufferPages,
  ]);

  // Current page = page with most visible area
  const currentPageIndex = useMemo(() => {
    return computeCurrentPageIndex({
      visiblePages,
      pageOffsets,
      dimensions,
      scrollTop,
      scrollLeft,
      viewportHeight,
      viewportWidth,
      scale,
      scrollMode,
      getRotation,
    });
  }, [
    visiblePages,
    pageOffsets,
    dimensions,
    scrollMode,
    scrollTop,
    scrollLeft,
    viewportHeight,
    viewportWidth,
    scale,
    getRotation,
  ]);

  return { visiblePages, totalHeight, totalWidth, maxContentWidth, currentPageIndex };
}
