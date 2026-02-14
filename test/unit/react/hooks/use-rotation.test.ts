import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import { useRotation } from '../../../../src/react/hooks/use-rotation.js';

describe('useRotation', () => {
  describe('rotatePage (clockwise cycle)', () => {
    it('cycles None → Clockwise90 → Rotate180 → CounterClockwise90 → None', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(0, 'cw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.Clockwise90);

      act(() => result.current.rotatePage(0, 'cw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.Rotate180);

      act(() => result.current.rotatePage(0, 'cw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.CounterClockwise90);

      act(() => result.current.rotatePage(0, 'cw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.None);
    });

    it('defaults direction to cw when omitted', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(0));
      expect(result.current.getRotation(0)).toBe(PageRotation.Clockwise90);
    });
  });

  describe('rotatePage (counter-clockwise cycle)', () => {
    it('cycles None → CounterClockwise90 → Rotate180 → Clockwise90 → None', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(0, 'ccw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.CounterClockwise90);

      act(() => result.current.rotatePage(0, 'ccw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.Rotate180);

      act(() => result.current.rotatePage(0, 'ccw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.Clockwise90);

      act(() => result.current.rotatePage(0, 'ccw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.None);
    });
  });

  describe('rotatePage (180 rotation)', () => {
    it('cycles None → Rotate180 → None', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(0, '180'));
      expect(result.current.getRotation(0)).toBe(PageRotation.Rotate180);

      act(() => result.current.rotatePage(0, '180'));
      expect(result.current.getRotation(0)).toBe(PageRotation.None);
    });

    it('rotates from Clockwise90 to CounterClockwise90', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(0, 'cw'));
      act(() => result.current.rotatePage(0, '180'));
      expect(result.current.getRotation(0)).toBe(PageRotation.CounterClockwise90);
    });
  });

  describe('rotateAllPages', () => {
    it('rotates all pages clockwise', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotateAllPages('cw'));

      expect(result.current.getRotation(0)).toBe(PageRotation.Clockwise90);
      expect(result.current.getRotation(1)).toBe(PageRotation.Clockwise90);
      expect(result.current.getRotation(2)).toBe(PageRotation.Clockwise90);
    });

    it('rotates all pages counter-clockwise', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotateAllPages('ccw'));

      expect(result.current.getRotation(0)).toBe(PageRotation.CounterClockwise90);
      expect(result.current.getRotation(1)).toBe(PageRotation.CounterClockwise90);
      expect(result.current.getRotation(2)).toBe(PageRotation.CounterClockwise90);
    });

    it('applies rotation on top of existing per-page rotation', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(1, 'cw'));
      act(() => result.current.rotateAllPages('cw'));

      expect(result.current.getRotation(0)).toBe(PageRotation.Clockwise90);
      expect(result.current.getRotation(1)).toBe(PageRotation.Rotate180);
      expect(result.current.getRotation(2)).toBe(PageRotation.Clockwise90);
    });
  });

  describe('resetPageRotation', () => {
    it('resets a single page back to None', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotatePage(0, 'cw'));
      act(() => result.current.rotatePage(1, 'cw'));
      expect(result.current.getRotation(0)).toBe(PageRotation.Clockwise90);

      act(() => result.current.resetPageRotation(0));
      expect(result.current.getRotation(0)).toBe(PageRotation.None);
      expect(result.current.getRotation(1)).toBe(PageRotation.Clockwise90);
    });

    it('is a no-op for pages that are not rotated', () => {
      const { result } = renderHook(() => useRotation(3));
      const before = result.current.rotations;

      act(() => result.current.resetPageRotation(0));
      expect(result.current.rotations).toBe(before);
    });
  });

  describe('resetAllRotations', () => {
    it('clears all page rotations', () => {
      const { result } = renderHook(() => useRotation(3));

      act(() => result.current.rotateAllPages('cw'));
      act(() => result.current.resetAllRotations());

      expect(result.current.getRotation(0)).toBe(PageRotation.None);
      expect(result.current.getRotation(1)).toBe(PageRotation.None);
      expect(result.current.getRotation(2)).toBe(PageRotation.None);
      expect(result.current.rotations.size).toBe(0);
    });

    it('is a no-op when already empty', () => {
      const { result } = renderHook(() => useRotation(3));
      const before = result.current.rotations;

      act(() => result.current.resetAllRotations());
      expect(result.current.rotations).toBe(before);
    });
  });

  describe('getRotation', () => {
    it('returns PageRotation.None for unrotated pages', () => {
      const { result } = renderHook(() => useRotation(5));

      expect(result.current.getRotation(0)).toBe(PageRotation.None);
      expect(result.current.getRotation(4)).toBe(PageRotation.None);
    });

    it('returns PageRotation.None for page indices beyond pageCount', () => {
      const { result } = renderHook(() => useRotation(2));

      expect(result.current.getRotation(99)).toBe(PageRotation.None);
    });
  });

  describe('referential inequality', () => {
    it('creates a new Map on each update', () => {
      const { result } = renderHook(() => useRotation(3));
      const before = result.current.rotations;

      act(() => result.current.rotatePage(0, 'cw'));
      expect(result.current.rotations).not.toBe(before);
    });

    it('preserves reference when reset is a no-op', () => {
      const { result } = renderHook(() => useRotation(3));
      const before = result.current.rotations;

      act(() => result.current.resetAllRotations());
      expect(result.current.rotations).toBe(before);
    });
  });

  describe('pageCount trimming', () => {
    it('removes entries for pages beyond the new pageCount', () => {
      const { result, rerender } = renderHook(({ count }) => useRotation(count), {
        initialProps: { count: 5 },
      });

      act(() => result.current.rotatePage(3, 'cw'));
      act(() => result.current.rotatePage(4, 'cw'));

      rerender({ count: 4 });

      expect(result.current.getRotation(3)).toBe(PageRotation.Clockwise90);
      expect(result.current.getRotation(4)).toBe(PageRotation.None);
      expect(result.current.rotations.has(4)).toBe(false);
    });
  });
});
