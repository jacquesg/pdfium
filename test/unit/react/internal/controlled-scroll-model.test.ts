import { describe, expect, it } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import {
  getTargetPageOffset,
  resolveControlledScrollDecision,
} from '../../../../src/react/internal/controlled-scroll-model.js';

describe('controlled-scroll-model', () => {
  describe('getTargetPageOffset', () => {
    it('computes vertical offsets with row gaps', () => {
      const dimensions = [
        { width: 100, height: 200 },
        { width: 100, height: 200 },
        { width: 100, height: 200 },
      ];

      expect(
        getTargetPageOffset({
          dimensions,
          targetPage: 1,
          scale: 1,
          gap: 10,
          isHorizontal: false,
          spreadMode: 'none',
        }),
      ).toEqual({ pageOffset: 220, pageSize: 200 });
    });

    it('computes horizontal spread offsets with rotation-aware dimensions', () => {
      const dimensions = [
        { width: 100, height: 200 },
        { width: 150, height: 200 },
        { width: 80, height: 300 },
      ];

      expect(
        getTargetPageOffset({
          dimensions,
          targetPage: 1,
          scale: 1,
          gap: 10,
          isHorizontal: true,
          spreadMode: 'even',
          getRotation: (pageIndex) => (pageIndex === 0 ? PageRotation.Clockwise90 : PageRotation.None),
        }),
      ).toEqual({ pageOffset: 220, pageSize: 150 });
    });

    it('returns null when target page is not found', () => {
      expect(
        getTargetPageOffset({
          dimensions: [{ width: 100, height: 100 }],
          targetPage: 9,
          scale: 1,
          gap: 8,
          isHorizontal: false,
          spreadMode: 'none',
        }),
      ).toBeNull();
    });
  });

  describe('resolveControlledScrollDecision', () => {
    it('clears state when controlled mode is disabled', () => {
      expect(
        resolveControlledScrollDecision({
          controlledPageIndex: undefined,
          scrollGeneration: 1,
          previousRequest: { pageIndex: 1, generation: 0 },
          currentPageIndex: 1,
          reportedPages: new Set([1]),
        }),
      ).toEqual({ action: 'clear', nextRequest: null });
    });

    it('forces scroll when generation changes', () => {
      expect(
        resolveControlledScrollDecision({
          controlledPageIndex: 2,
          scrollGeneration: 5,
          previousRequest: { pageIndex: 2, generation: 4 },
          currentPageIndex: 2,
          reportedPages: new Set([2]),
        }),
      ).toEqual({ action: 'scroll', nextRequest: { pageIndex: 2, generation: 5 } });
    });

    it('consumes reported page echoes before issuing a new scroll', () => {
      expect(
        resolveControlledScrollDecision({
          controlledPageIndex: 3,
          scrollGeneration: 1,
          previousRequest: { pageIndex: 3, generation: 1 },
          currentPageIndex: 1,
          reportedPages: new Set([3]),
        }),
      ).toEqual({ action: 'consume-reported', nextRequest: { pageIndex: 3, generation: 1 } });
    });

    it('skips scrolling when requested page is already current', () => {
      expect(
        resolveControlledScrollDecision({
          controlledPageIndex: 4,
          scrollGeneration: 0,
          previousRequest: { pageIndex: 4, generation: 0 },
          currentPageIndex: 4,
          reportedPages: new Set(),
        }),
      ).toEqual({ action: 'skip', nextRequest: { pageIndex: 4, generation: 0 } });
    });

    it('scrolls for an unsatisfied controlled request', () => {
      expect(
        resolveControlledScrollDecision({
          controlledPageIndex: 6,
          scrollGeneration: 0,
          previousRequest: { pageIndex: 2, generation: 0 },
          currentPageIndex: 1,
          reportedPages: new Set(),
        }),
      ).toEqual({ action: 'scroll', nextRequest: { pageIndex: 6, generation: 0 } });
    });
  });
});
