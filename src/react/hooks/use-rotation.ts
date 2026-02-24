import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageRotation } from '../../core/types.js';

const CW_CYCLE: readonly PageRotation[] = [
  PageRotation.None,
  PageRotation.Clockwise90,
  PageRotation.Rotate180,
  PageRotation.CounterClockwise90,
];

function rotateCW(r: PageRotation): PageRotation {
  return CW_CYCLE[(CW_CYCLE.indexOf(r) + 1) % 4] ?? PageRotation.None;
}

function rotateCCW(r: PageRotation): PageRotation {
  return CW_CYCLE[(CW_CYCLE.indexOf(r) + 3) % 4] ?? PageRotation.None;
}

function rotate180(r: PageRotation): PageRotation {
  return CW_CYCLE[(CW_CYCLE.indexOf(r) + 2) % 4] ?? PageRotation.None;
}

function applyRotation(current: PageRotation, direction: 'cw' | 'ccw' | '180'): PageRotation {
  if (direction === 'cw') return rotateCW(current);
  if (direction === 'ccw') return rotateCCW(current);
  return rotate180(current);
}

interface RotationState {
  rotations: ReadonlyMap<number, PageRotation>;
  getRotation: (pageIndex: number) => PageRotation;
  rotatePage: (pageIndex: number, direction?: 'cw' | 'ccw' | '180') => void;
  rotateAllPages: (direction: 'cw' | 'ccw' | '180') => void;
  resetPageRotation: (pageIndex: number) => void;
  resetAllRotations: () => void;
}

function useRotation(pageCount: number): RotationState {
  const [rotations, setRotations] = useState<Map<number, PageRotation>>(() => new Map());

  useEffect(() => {
    setRotations((prev) => {
      let trimmed = false;
      for (const key of prev.keys()) {
        if (key >= pageCount) {
          trimmed = true;
          break;
        }
      }
      if (!trimmed) return prev;
      const next = new Map(prev);
      for (const key of next.keys()) {
        if (key >= pageCount) next.delete(key);
      }
      return next;
    });
  }, [pageCount]);

  const getRotation = useCallback(
    (pageIndex: number): PageRotation => rotations.get(pageIndex) ?? PageRotation.None,
    [rotations],
  );

  const rotatePage = useCallback((pageIndex: number, direction: 'cw' | 'ccw' | '180' = 'cw') => {
    setRotations((prev) => {
      const next = new Map(prev);
      const current = prev.get(pageIndex) ?? PageRotation.None;
      const result = applyRotation(current, direction);
      if (result === PageRotation.None) next.delete(pageIndex);
      else next.set(pageIndex, result);
      return next;
    });
  }, []);

  const rotateAllPages = useCallback(
    (direction: 'cw' | 'ccw' | '180') => {
      setRotations((prev) => {
        const next = new Map(prev);
        for (let i = 0; i < pageCount; i++) {
          const current = prev.get(i) ?? PageRotation.None;
          const result = applyRotation(current, direction);
          if (result === PageRotation.None) next.delete(i);
          else next.set(i, result);
        }
        return next;
      });
    },
    [pageCount],
  );

  const resetPageRotation = useCallback((pageIndex: number) => {
    setRotations((prev) => {
      if (!prev.has(pageIndex)) return prev;
      const next = new Map(prev);
      next.delete(pageIndex);
      return next;
    });
  }, []);

  const resetAllRotations = useCallback(() => {
    setRotations((prev) => (prev.size === 0 ? prev : new Map()));
  }, []);

  return useMemo<RotationState>(
    () => ({ rotations, getRotation, rotatePage, rotateAllPages, resetPageRotation, resetAllRotations }),
    [rotations, getRotation, rotatePage, rotateAllPages, resetPageRotation, resetAllRotations],
  );
}

export { useRotation };
export type { RotationState };
