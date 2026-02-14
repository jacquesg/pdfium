'use client';

import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import type {
  ButtonOverrides,
  ButtonProps,
  FirstLastPageRenderProps,
  FullscreenRenderProps,
  InputOverrides,
  PrintRenderProps,
  SearchInputProps,
  SearchRenderProps,
  ToolbarContextValue,
  ToolbarSearchState,
} from './pdf-toolbar-types.js';
import { TOOLBAR_LABELS, TOOLBAR_SEARCH_PLACEHOLDER } from './toolbar-config.js';
import { createToolbarButtonProps, createToolbarSearchInputProps } from './toolbar-prop-getters.js';

function createFullscreenRenderProps(fullscreen: UseViewerSetupResult['fullscreen']): FullscreenRenderProps {
  const { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen } = fullscreen;

  const getToggleProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => {
          toggleFullscreen();
        },
        ariaLabel: isFullscreen ? TOOLBAR_LABELS.exitFullscreen : TOOLBAR_LABELS.enterFullscreen,
        ariaPressed: isFullscreen,
      },
      overrides,
    );

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen, getToggleProps };
}

function createPrintRenderProps(print: UseViewerSetupResult['print']): PrintRenderProps {
  const { isPrinting, progress, print: doPrint, cancel } = print;

  const getPrintProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: isPrinting ? cancel : doPrint,
        ariaLabel: isPrinting ? TOOLBAR_LABELS.cancelPrint : TOOLBAR_LABELS.print,
      },
      overrides,
    );

  return { isPrinting, progress, print: doPrint, cancel, getPrintProps };
}

function createFirstLastPageRenderProps(
  pageIndex: number,
  pageCount: number,
  setPageIndex: UseViewerSetupResult['navigation']['setPageIndex'],
): FirstLastPageRenderProps {
  const isFirst = pageIndex === 0;
  const isLast = pageCount === 0 || pageIndex === pageCount - 1;

  const getFirstProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: isFirst || pageCount === 0,
        onClick: () => setPageIndex(0),
        ariaLabel: TOOLBAR_LABELS.firstPage,
      },
      overrides,
    );

  const getLastProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: isLast || pageCount === 0,
        onClick: () => setPageIndex(Math.max(0, pageCount - 1)),
        ariaLabel: TOOLBAR_LABELS.lastPage,
      },
      overrides,
    );

  return { isFirst, isLast, getFirstProps, getLastProps };
}

function createSearchRenderProps(searchState: ToolbarSearchState | undefined): SearchRenderProps | null {
  if (!searchState) return null;
  const { query, setQuery, totalMatches, currentIndex, isSearching, next, prev, isOpen, toggle } = searchState;

  const getInputProps = (overrides?: InputOverrides): SearchInputProps =>
    createToolbarSearchInputProps(
      {
        value: query,
        onChange: (e) => setQuery(e.target.value),
        placeholder: TOOLBAR_SEARCH_PLACEHOLDER,
        ariaLabel: TOOLBAR_LABELS.searchInput,
      },
      overrides,
    );

  const getToggleProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: toggle,
        ariaLabel: isOpen ? TOOLBAR_LABELS.searchClose : TOOLBAR_LABELS.searchOpen,
      },
      overrides,
    );

  const getNextProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: totalMatches === 0,
        onClick: next,
        ariaLabel: TOOLBAR_LABELS.searchNextMatch,
      },
      overrides,
    );

  const getPrevProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: totalMatches === 0,
        onClick: prev,
        ariaLabel: TOOLBAR_LABELS.searchPrevMatch,
      },
      overrides,
    );

  return {
    query,
    setQuery,
    totalMatches,
    currentIndex,
    isSearching,
    next,
    prev,
    isOpen,
    toggle,
    getInputProps,
    getToggleProps,
    getNextProps,
    getPrevProps,
  };
}

function createToolbarContextValue(parts: ToolbarContextValue): ToolbarContextValue {
  return parts;
}

export {
  createFirstLastPageRenderProps,
  createFullscreenRenderProps,
  createPrintRenderProps,
  createSearchRenderProps,
  createToolbarContextValue,
};
