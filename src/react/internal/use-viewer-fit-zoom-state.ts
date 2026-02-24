import type { RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { PageRotation } from '../../core/types.js';
import type { FitMode } from '../hooks/use-fit-zoom.js';
import { useFitZoom } from '../hooks/use-fit-zoom.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';
import type { SpreadMode } from '../hooks/use-visible-pages.js';
import { useZoom } from '../hooks/use-zoom.js';
import { resolveFitPageDimensions } from './viewer-fit-dimensions.js';

interface UseViewerFitZoomStateArgs {
  containerRef: RefObject<HTMLDivElement | null>;
  dimensions: PageDimension[] | undefined;
  pageIndex: number;
  pageCount: number;
  spreadMode: SpreadMode;
  pageGap: number;
  getRotation: (pageIndex: number) => PageRotation;
  initialScale?: number | undefined;
}

interface ViewerFitZoomState {
  scale: number;
  setScaleManual: (value: number) => void;
  zoomInManual: () => void;
  zoomOutManual: () => void;
  resetManual: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  fitWidth: () => void;
  fitHeight: () => void;
  fitPage: () => void;
  fitScale: (mode: FitMode) => number;
  activeFitMode: FitMode | null;
  clearFitMode: () => void;
}

function useViewerFitZoomState({
  containerRef,
  dimensions,
  pageIndex,
  pageCount,
  spreadMode,
  pageGap,
  getRotation,
  initialScale,
}: UseViewerFitZoomStateArgs): ViewerFitZoomState {
  const { scale, setScale, zoomIn, zoomOut, reset, canZoomIn, canZoomOut } = useZoom(
    initialScale !== undefined ? { initialScale } : undefined,
  );

  const fitPageDimensions = resolveFitPageDimensions({
    dimensions,
    pageIndex,
    pageCount,
    spreadMode,
    pageGap,
    getRotation,
  });

  const { fitScale } = useFitZoom(containerRef, fitPageDimensions.width, fitPageDimensions.height);

  const [activeFitMode, setActiveFitMode] = useState<FitMode | null>(null);

  const clearFitMode = useCallback(() => {
    setActiveFitMode(null);
  }, []);

  const setScaleManual = useCallback(
    (value: number) => {
      setActiveFitMode(null);
      setScale(value);
    },
    [setScale],
  );

  const zoomInManual = useCallback(() => {
    setActiveFitMode(null);
    zoomIn();
  }, [zoomIn]);

  const zoomOutManual = useCallback(() => {
    setActiveFitMode(null);
    zoomOut();
  }, [zoomOut]);

  const resetManual = useCallback(() => {
    setActiveFitMode(null);
    reset();
  }, [reset]);

  const fitWidth = useCallback(() => {
    setActiveFitMode('page-width');
    setScale(fitScale('page-width'));
  }, [fitScale, setScale]);

  const fitHeight = useCallback(() => {
    setActiveFitMode('page-height');
    setScale(fitScale('page-height'));
  }, [fitScale, setScale]);

  const fitPage = useCallback(() => {
    setActiveFitMode('page-fit');
    setScale(fitScale('page-fit'));
  }, [fitScale, setScale]);

  const activeFitScaleValue = activeFitMode ? fitScale(activeFitMode) : null;
  useEffect(() => {
    if (activeFitScaleValue !== null) {
      setScale(activeFitScaleValue);
    }
  }, [activeFitScaleValue, setScale]);

  return {
    scale,
    setScaleManual,
    zoomInManual,
    zoomOutManual,
    resetManual,
    canZoomIn,
    canZoomOut,
    fitWidth,
    fitHeight,
    fitPage,
    fitScale,
    activeFitMode,
    clearFitMode,
  };
}

export { useViewerFitZoomState };
export type { UseViewerFitZoomStateArgs, ViewerFitZoomState };
