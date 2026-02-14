'use client';

import { useCallback, useState } from 'react';

interface UseZoomOptions {
  initialScale?: number;
  min?: number;
  max?: number;
  step?: number;
}

function useZoom(options?: UseZoomOptions) {
  const min = options?.min ?? 0.25;
  const max = options?.max ?? 5;
  const step = options?.step ?? 0.25;
  const [scale, setScaleInternal] = useState(options?.initialScale ?? 1);

  const setScale = useCallback(
    (value: number) => {
      setScaleInternal(Math.max(min, Math.min(value, max)));
    },
    [min, max],
  );

  const zoomIn = useCallback(() => {
    setScaleInternal((s) => Math.min(s + step, max));
  }, [step, max]);

  const zoomOut = useCallback(() => {
    setScaleInternal((s) => Math.max(s - step, min));
  }, [step, min]);

  const initial = options?.initialScale ?? 1;
  const reset = useCallback(() => {
    setScaleInternal(initial);
  }, [initial]);

  return { scale, setScale, zoomIn, zoomOut, reset, canZoomIn: scale < max, canZoomOut: scale > min };
}

export { useZoom };
export type { UseZoomOptions };
