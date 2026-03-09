import { useCallback, useRef } from 'react';

const STYLE_MUTATION_BURST_WINDOW_MS = 120;

interface MutationBurstSample {
  readonly atMs: number;
  readonly count: number;
}

function shouldWarnMutationBursts(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

export function useAnnotationStyleMutationBurstWarning(pageIndex: number) {
  const mutationBurstSamplesRef = useRef<Map<string, MutationBurstSample>>(new Map());

  return useCallback(
    (kind: 'colour' | 'border', annotationIndex: number): void => {
      if (!shouldWarnMutationBursts() || typeof performance === 'undefined') {
        return;
      }

      const key = `${kind}:${String(pageIndex)}:${String(annotationIndex)}`;
      const nowMs = performance.now();
      const previous = mutationBurstSamplesRef.current.get(key);
      if (previous !== undefined && nowMs - previous.atMs <= STYLE_MUTATION_BURST_WINDOW_MS) {
        const nextCount = previous.count + 1;
        mutationBurstSamplesRef.current.set(key, { atMs: nowMs, count: nextCount });
        if (nextCount === 2 || nextCount === 5) {
          console.warn(
            `[PDFium Editor] Rapid ${kind} mutation burst detected for annotation ${String(annotationIndex)} on page ${String(pageIndex)} (${String(nextCount)} commits inside ${String(STYLE_MUTATION_BURST_WINDOW_MS)}ms window).`,
          );
        }
        return;
      }

      mutationBurstSamplesRef.current.set(key, { atMs: nowMs, count: 1 });
    },
    [pageIndex],
  );
}
