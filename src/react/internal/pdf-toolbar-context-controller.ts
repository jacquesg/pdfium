'use client';

import { useMemo } from 'react';
import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import {
  createFirstLastPageRenderProps,
  createFitRenderProps,
  createFullscreenRenderProps,
  createGoToPage,
  createInteractionRenderProps,
  createNavigationRenderProps,
  createPrintRenderProps,
  createRotationRenderProps,
  createScrollModeRenderProps,
  createSearchRenderProps,
  createSpreadRenderProps,
  createToolbarContextValue,
  createZoomRenderProps,
} from './pdf-toolbar-context-builders.js';
import type {
  FirstLastPageRenderProps,
  FitRenderProps,
  FullscreenRenderProps,
  InteractionModeRenderProps,
  NavigationRenderProps,
  PrintRenderProps,
  RotationRenderProps,
  ScrollModeRenderProps,
  SearchRenderProps,
  SpreadRenderProps,
  ToolbarContextValue,
  ToolbarSearchState,
  ZoomRenderProps,
} from './pdf-toolbar-types.js';

function usePDFToolbarContextValue(
  viewer: UseViewerSetupResult,
  searchState: ToolbarSearchState | undefined,
): ToolbarContextValue {
  const { pageIndex, setPageIndex, next, prev, canNext, canPrev, pageCount } = viewer.navigation;

  const goToPage = useMemo(() => createGoToPage(pageCount, setPageIndex), [pageCount, setPageIndex]);

  const navigation = useMemo<NavigationRenderProps>(
    () =>
      createNavigationRenderProps({
        pageIndex,
        setPageIndex,
        next,
        prev,
        canNext,
        canPrev,
        pageCount,
        goToPage,
      }),
    [pageIndex, setPageIndex, next, prev, canNext, canPrev, pageCount, goToPage],
  );

  const zoom = useMemo<ZoomRenderProps>(() => createZoomRenderProps(viewer.zoom), [viewer.zoom]);

  const fit = useMemo<FitRenderProps>(() => createFitRenderProps(viewer.fit), [viewer.fit]);

  const scrollModeState = useMemo<ScrollModeRenderProps>(
    () => createScrollModeRenderProps(viewer.scroll),
    [viewer.scroll],
  );

  const rotation = useMemo<RotationRenderProps>(
    () => createRotationRenderProps(viewer.rotation, pageIndex),
    [viewer.rotation, pageIndex],
  );

  const spread = useMemo<SpreadRenderProps>(() => createSpreadRenderProps(viewer.spread), [viewer.spread]);

  const fullscreen = useMemo<FullscreenRenderProps>(
    () => createFullscreenRenderProps(viewer.fullscreen),
    [viewer.fullscreen],
  );

  const print = useMemo<PrintRenderProps>(() => createPrintRenderProps(viewer.print), [viewer.print]);

  const interaction = useMemo<InteractionModeRenderProps>(
    () => createInteractionRenderProps(viewer.interaction),
    [viewer.interaction],
  );

  const firstLastPage = useMemo<FirstLastPageRenderProps>(
    () => createFirstLastPageRenderProps(pageIndex, pageCount, setPageIndex),
    [pageIndex, pageCount, setPageIndex],
  );

  const search = useMemo<SearchRenderProps | null>(() => createSearchRenderProps(searchState), [searchState]);

  return useMemo<ToolbarContextValue>(
    () =>
      createToolbarContextValue({
        navigation,
        zoom,
        fit,
        scrollMode: scrollModeState,
        search,
        rotation,
        spread,
        fullscreen,
        print,
        interaction,
        firstLastPage,
      }),
    [navigation, zoom, fit, scrollModeState, search, rotation, spread, fullscreen, print, interaction, firstLastPage],
  );
}

export { usePDFToolbarContextValue };
