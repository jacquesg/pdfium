'use client';

import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import type {
  ButtonOverrides,
  ButtonProps,
  InputOverrides,
  InputProps,
  NavigationRenderProps,
} from './pdf-toolbar-types.js';
import { TOOLBAR_LABELS } from './toolbar-config.js';
import { createToolbarButtonProps, createToolbarNumberInputProps } from './toolbar-prop-getters.js';
import { clampPageNumber } from './toolbar-value-parsers.js';

interface NavigationBuilderArgs {
  pageIndex: number;
  setPageIndex: UseViewerSetupResult['navigation']['setPageIndex'];
  next: UseViewerSetupResult['navigation']['next'];
  prev: UseViewerSetupResult['navigation']['prev'];
  canNext: boolean;
  canPrev: boolean;
  pageCount: number;
  goToPage: (pageNumber: number) => void;
}

function createGoToPage(
  pageCount: number,
  setPageIndex: UseViewerSetupResult['navigation']['setPageIndex'],
): (pageNumber: number) => void {
  return (pageNumber: number) => {
    const clampedPageNumber = clampPageNumber(pageNumber, pageCount);
    if (clampedPageNumber === null) return;
    setPageIndex(clampedPageNumber - 1);
  };
}

function createNavigationRenderProps({
  pageIndex,
  setPageIndex,
  next,
  prev,
  canNext,
  canPrev,
  pageCount,
  goToPage,
}: NavigationBuilderArgs): NavigationRenderProps {
  const pageNumber = pageCount === 0 ? 0 : pageIndex + 1;

  const getPrevProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: !canPrev,
        onClick: prev,
        ariaLabel: TOOLBAR_LABELS.previousPage,
      },
      overrides,
    );

  const getNextProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: !canNext,
        onClick: next,
        ariaLabel: TOOLBAR_LABELS.nextPage,
      },
      overrides,
    );

  const getInputProps = (overrides?: InputOverrides): InputProps =>
    createToolbarNumberInputProps(
      {
        min: pageCount === 0 ? 0 : 1,
        max: pageCount,
        value: pageNumber,
        disabled: pageCount === 0,
        onChange: (e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(parsed)) goToPage(parsed);
        },
        ariaLabel: TOOLBAR_LABELS.pageNumber,
      },
      overrides,
    );

  return {
    pageIndex,
    setPageIndex,
    next,
    prev,
    canNext,
    canPrev,
    pageCount,
    pageNumber,
    goToPage,
    getPrevProps,
    getNextProps,
    getInputProps,
  };
}

export { createGoToPage, createNavigationRenderProps };
export type { NavigationBuilderArgs };
