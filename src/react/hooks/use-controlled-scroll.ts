'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { PageRotation } from '../../core/types.js';
import { getTargetPageOffset, resolveControlledScrollDecision } from '../internal/controlled-scroll-model.js';
import type { PageDimension } from './use-page-dimensions.js';
import type { SpreadMode } from './use-visible-pages.js';

interface UseControlledScrollOptions {
  containerRef: RefObject<HTMLElement | null>;
  dimensions: PageDimension[] | null;
  scale: number;
  gap: number;
  scrollMode: 'continuous' | 'single' | 'horizontal';
  spreadMode?: SpreadMode | undefined;
  getRotation?: ((pageIndex: number) => PageRotation) | undefined;
  currentPageIndex: number;
  controlledPageIndex: number | undefined;
  scrollGeneration: number | undefined;
  onCurrentPageChange: ((pageIndex: number) => void) | undefined;
}

interface UseControlledScrollResult {
  scrollToPage: (targetPage: number, behavior: 'auto' | 'smooth') => void;
}

function useControlledScroll({
  containerRef,
  dimensions,
  scale,
  gap,
  scrollMode,
  spreadMode = 'none',
  getRotation,
  currentPageIndex,
  controlledPageIndex,
  scrollGeneration,
  onCurrentPageChange,
}: UseControlledScrollOptions): UseControlledScrollResult {
  const prevCurrentPageRef = useRef(currentPageIndex);
  const isScrollingToPageRef = useRef(false);
  const scrollRequestIdRef = useRef(0);
  // Set of pages reported via onCurrentPageChange that haven't been "consumed"
  // by the controlled scroll effect yet. A Set (not single value) is needed because
  // the page-change effect can fire multiple times before the controlled effect runs.
  const reportedPagesRef = useRef<Set<number>>(new Set());
  const lastHandledScrollRequestRef = useRef<{ pageIndex: number; generation: number | undefined } | null>(null);
  const activeScrollCleanupRef = useRef<(() => void) | null>(null);
  const trackedContainerRef = useRef<HTMLElement | null>(containerRef.current);

  // Keep a ref for currentPageIndex so the controlled scroll effect can read
  // the latest value without re-firing when the user scrolls.
  const currentPageRef = useRef(currentPageIndex);
  useLayoutEffect(() => {
    currentPageRef.current = currentPageIndex;
  });

  // If the container element changes, any in-flight smooth-scroll suppression
  // is stale and must be cancelled immediately.
  useLayoutEffect(() => {
    const nextContainer = containerRef.current;
    if (trackedContainerRef.current === nextContainer) return;
    trackedContainerRef.current = nextContainer;
    activeScrollCleanupRef.current?.();
    activeScrollCleanupRef.current = null;
    reportedPagesRef.current.clear();
    lastHandledScrollRequestRef.current = null;
  });

  // Stabilise onCurrentPageChange via ref to prevent effect re-firing
  // when the parent passes an inline arrow function.
  const onCurrentPageChangeRef = useRef(onCurrentPageChange);
  useLayoutEffect(() => {
    onCurrentPageChangeRef.current = onCurrentPageChange;
  });

  // Use a ref for scale so that scrollToPage callback identity is stable
  // across zoom changes. This prevents the controlled scroll effect from
  // re-firing on every zoom step and overriding cursor-anchored scroll.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Notify parent of current page changes (scroll-driven).
  useEffect(() => {
    if (currentPageIndex !== prevCurrentPageRef.current) {
      prevCurrentPageRef.current = currentPageIndex;
      if (!isScrollingToPageRef.current || controlledPageIndex === undefined) {
        if (controlledPageIndex === undefined) {
          // In uncontrolled mode we only need the latest reported page.
          // This prevents stale history from suppressing future intentional jumps.
          reportedPagesRef.current.clear();
        }
        reportedPagesRef.current.add(currentPageIndex);
        onCurrentPageChangeRef.current?.(currentPageIndex);
      }
    }
  }, [controlledPageIndex, currentPageIndex]);

  // Scroll to a specific page, centring it in the viewport.
  // NOTE: `scale` is read from a ref (not a dep) so the callback identity
  // stays stable across zoom changes. This prevents the controlled scroll
  // effect from re-running on every zoom step, which would override the
  // cursor-anchored scroll position set by useVisiblePages.
  const scrollToPage = useCallback(
    (targetPage: number, behavior: 'auto' | 'smooth') => {
      if (!dimensions || scrollMode === 'single') return;
      if (targetPage < 0 || targetPage >= dimensions.length) return;
      const container = containerRef.current;
      if (!container) return;

      // Clean up any previous scroll in progress
      activeScrollCleanupRef.current?.();
      activeScrollCleanupRef.current = null;

      const currentScale = scaleRef.current;
      const isHorizontal = scrollMode === 'horizontal';
      const target = getTargetPageOffset({
        dimensions,
        targetPage,
        scale: currentScale,
        gap,
        isHorizontal,
        spreadMode,
        getRotation,
      });
      if (!target) return;
      const { pageOffset, pageSize } = target;

      // Centre the page in the viewport (or align to start if page is larger than viewport)
      const viewportSize = isHorizontal ? container.clientWidth : container.clientHeight;
      const targetScroll = pageSize < viewportSize ? pageOffset - (viewportSize - pageSize) / 2 : pageOffset;

      const scrollOptions: ScrollToOptions = {
        behavior,
        ...(isHorizontal ? { left: Math.max(0, targetScroll) } : { top: Math.max(0, targetScroll) }),
      };

      // Suppress page-change callback only during smooth programmatic scroll.
      if (behavior !== 'smooth') {
        container.scrollTo(scrollOptions);
        return;
      }

      const requestId = ++scrollRequestIdRef.current;
      isScrollingToPageRef.current = true;
      container.scrollTo(scrollOptions);
      let fallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

      const cleanupProgrammaticScroll = () => {
        if (fallbackTimer !== null) {
          globalThis.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        container.removeEventListener('scrollend', scrollendHandler);
        if (scrollRequestIdRef.current === requestId) {
          isScrollingToPageRef.current = false;
        }
        if (activeScrollCleanupRef.current === cleanupProgrammaticScroll) {
          activeScrollCleanupRef.current = null;
        }
      };

      const scrollendHandler = () => {
        cleanupProgrammaticScroll();
      };
      fallbackTimer = globalThis.setTimeout(cleanupProgrammaticScroll, 700);

      container.addEventListener('scrollend', scrollendHandler, { once: true });

      // Store cleanup so we can cancel on unmount or next scroll
      activeScrollCleanupRef.current = cleanupProgrammaticScroll;
    },
    [dimensions, gap, scrollMode, spreadMode, getRotation, containerRef],
  );

  // Controlled scroll: when controlledPageIndex or scrollGeneration changes.
  // currentPageRef is read (not a dep) so user-scroll changes don't re-trigger this effect.
  useEffect(() => {
    const decision = resolveControlledScrollDecision({
      controlledPageIndex,
      scrollGeneration,
      previousRequest: lastHandledScrollRequestRef.current,
      currentPageIndex: currentPageRef.current,
      reportedPages: reportedPagesRef.current,
    });
    lastHandledScrollRequestRef.current = decision.nextRequest;

    if (decision.action === 'clear') {
      activeScrollCleanupRef.current?.();
      activeScrollCleanupRef.current = null;
      reportedPagesRef.current.clear();
      return;
    }

    if (decision.action === 'scroll') {
      const request = decision.nextRequest;
      if (request === null) return;
      scrollToPage(request.pageIndex, 'smooth');
      reportedPagesRef.current.clear();
      return;
    }

    if (decision.action === 'consume-reported') {
      const request = decision.nextRequest;
      if (request !== null) reportedPagesRef.current.delete(request.pageIndex);
      return;
    }
  }, [controlledPageIndex, scrollGeneration, scrollToPage]);

  // Clean up active scroll on unmount
  useEffect(() => {
    return () => {
      activeScrollCleanupRef.current?.();
    };
  }, []);

  return { scrollToPage };
}

export { useControlledScroll };
export type { UseControlledScrollOptions, UseControlledScrollResult };
