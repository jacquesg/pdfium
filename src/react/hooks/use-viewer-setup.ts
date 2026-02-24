import { type RefObject, useMemo, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { usePDFiumDocument } from '../context.js';
import { useViewerDocumentControls } from '../internal/use-viewer-document-controls.js';
import { useViewerFitZoomState } from '../internal/use-viewer-fit-zoom-state.js';
import { useViewerInteractionState } from '../internal/use-viewer-interaction-state.js';
import { useViewerRotationState } from '../internal/use-viewer-rotation-state.js';
import type { FitMode } from './use-fit-zoom.js';
import type { FullscreenState } from './use-fullscreen.js';
import type { InteractionMode, InteractionModeState } from './use-interaction-mode.js';
import type { PageDimension } from './use-page-dimensions.js';
import { usePageDimensions } from './use-page-dimensions.js';
import { usePageNavigation } from './use-page-navigation.js';
import type { PrintState } from './use-print.js';
import type { RotationState } from './use-rotation.js';
import type { SpreadMode, ZoomAnchor } from './use-visible-pages.js';
import { useWheelZoom } from './use-wheel-zoom.js';

interface NavigationState {
  pageIndex: number;
  setPageIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  canNext: boolean;
  canPrev: boolean;
  pageCount: number;
}

interface ZoomState {
  scale: number;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

interface FitState {
  fitWidth: () => void;
  fitHeight: () => void;
  fitPage: () => void;
  fitScale: (mode: FitMode) => number;
  /** Currently active fit mode, or null if the user has manually zoomed. */
  activeFitMode: FitMode | null;
}

interface ScrollModeState {
  scrollMode: 'continuous' | 'single' | 'horizontal';
  setScrollMode: (mode: 'continuous' | 'single' | 'horizontal') => void;
}

interface SpreadModeState {
  spreadMode: SpreadMode;
  setSpreadMode: (mode: SpreadMode) => void;
}

interface ContainerState {
  ref: RefObject<HTMLDivElement | null>;
  /** Ref for the outermost viewer element — used by fullscreen so controls remain visible. */
  fullscreenRef?: RefObject<HTMLDivElement | null> | undefined;
  dimensions: PageDimension[] | undefined;
  /** Ref for cursor-anchored zoom coordination between useWheelZoom and useVisiblePages. */
  zoomAnchorRef: RefObject<ZoomAnchor | null>;
}

interface UseViewerSetupOptions {
  initialScale?: number;
  initialScrollMode?: 'continuous' | 'single' | 'horizontal';
  initialSpreadMode?: SpreadMode;
  initialInteractionMode?: InteractionMode;
  /** Page gap in CSS px used by layout-dependent fit calculations. Default: 16. */
  pageGap?: number;
}

interface UseViewerSetupResult {
  document: WorkerPDFiumDocument | null;
  navigation: NavigationState;
  zoom: ZoomState;
  fit: FitState;
  scroll: ScrollModeState;
  container: ContainerState;
  rotation: RotationState;
  fullscreen: FullscreenState;
  spread: SpreadModeState;
  print: PrintState;
  interaction: InteractionModeState;
}

function useViewerSetup(options?: UseViewerSetupOptions): UseViewerSetupResult {
  const { document } = usePDFiumDocument();
  const pageCount = document?.pageCount ?? 0;

  const { pageIndex, setPageIndex, next, prev, canNext, canPrev } = usePageNavigation(pageCount);

  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const { data: dimensions } = usePageDimensions(document);

  const rotation = useViewerRotationState(pageCount, document);

  const [spreadMode, setSpreadMode] = useState<SpreadMode>(options?.initialSpreadMode ?? 'none');
  const pageGap = options?.pageGap ?? 16;

  const fitZoom = useViewerFitZoomState({
    containerRef,
    dimensions,
    pageIndex,
    pageCount,
    spreadMode,
    pageGap,
    getRotation: rotation.getRotation,
    initialScale: options?.initialScale,
  });

  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);
  useWheelZoom(containerRef, {
    scale: fitZoom.scale,
    setScale: fitZoom.setScaleManual,
    zoomAnchorRef,
    onManualZoom: fitZoom.clearFitMode,
  });

  const [scrollMode, setScrollMode] = useState<'continuous' | 'single' | 'horizontal'>(
    options?.initialScrollMode ?? 'continuous',
  );

  const { fullscreen, print } = useViewerDocumentControls(document, fullscreenRef);

  const interaction = useViewerInteractionState({
    containerRef,
    scale: fitZoom.scale,
    setScale: fitZoom.setScaleManual,
    scrollMode,
    zoomAnchorRef,
    initialInteractionMode: options?.initialInteractionMode,
  });

  const navigation = useMemo<NavigationState>(
    () => ({ pageIndex, setPageIndex, next, prev, canNext, canPrev, pageCount }),
    [pageIndex, setPageIndex, next, prev, canNext, canPrev, pageCount],
  );

  const zoom = useMemo<ZoomState>(
    () => ({
      scale: fitZoom.scale,
      setScale: fitZoom.setScaleManual,
      zoomIn: fitZoom.zoomInManual,
      zoomOut: fitZoom.zoomOutManual,
      reset: fitZoom.resetManual,
      canZoomIn: fitZoom.canZoomIn,
      canZoomOut: fitZoom.canZoomOut,
    }),
    [
      fitZoom.scale,
      fitZoom.setScaleManual,
      fitZoom.zoomInManual,
      fitZoom.zoomOutManual,
      fitZoom.resetManual,
      fitZoom.canZoomIn,
      fitZoom.canZoomOut,
    ],
  );

  const fit = useMemo<FitState>(
    () => ({
      fitWidth: fitZoom.fitWidth,
      fitHeight: fitZoom.fitHeight,
      fitPage: fitZoom.fitPage,
      fitScale: fitZoom.fitScale,
      activeFitMode: fitZoom.activeFitMode,
    }),
    [fitZoom.fitWidth, fitZoom.fitHeight, fitZoom.fitPage, fitZoom.fitScale, fitZoom.activeFitMode],
  );

  const scroll = useMemo<ScrollModeState>(() => ({ scrollMode, setScrollMode }), [scrollMode]);

  const spread = useMemo<SpreadModeState>(() => ({ spreadMode, setSpreadMode }), [spreadMode]);

  const container = useMemo<ContainerState>(
    () => ({ ref: containerRef, fullscreenRef, dimensions, zoomAnchorRef }),
    [dimensions],
  );

  return useMemo<UseViewerSetupResult>(
    () => ({
      document,
      navigation,
      zoom,
      fit,
      scroll,
      container,
      rotation,
      fullscreen,
      spread,
      print,
      interaction,
    }),
    [document, navigation, zoom, fit, scroll, container, rotation, fullscreen, spread, print, interaction],
  );
}

export { useViewerSetup };
export type {
  ContainerState,
  FitState,
  NavigationState,
  ScrollModeState,
  SpreadModeState,
  UseViewerSetupOptions,
  UseViewerSetupResult,
  ZoomState,
};
