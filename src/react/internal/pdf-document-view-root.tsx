'use client';

import { type CSSProperties, forwardRef, type ReactNode, type RefObject, useImperativeHandle } from 'react';
import type { PageRotation, TextSearchResult } from '../../core/types.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import type { SpreadMode, ZoomAnchor } from '../hooks/use-visible-pages.js';
import { mergeClassNames } from './component-api.js';
import { usePDFDocumentViewController } from './pdf-document-view-controller.js';
import { renderScrollableDocument, renderSinglePageDocument } from './pdf-document-view-renderers.js';

interface SearchState {
  resultsByPage: Map<number, TextSearchResult[]>;
  currentIndex: number;
  matchIndexMap: ReadonlyArray<{ pageIndex: number; localIndex: number }>;
  currentMatchPageIndex: number | undefined;
}

interface PDFDocumentViewHandle {
  scrollToPage: (pageIndex: number, behavior?: 'auto' | 'smooth') => void;
}

interface PDFDocumentViewClassNames {
  container?: string | undefined;
  page?: string | undefined;
  loadingPlaceholder?: string | undefined;
}

interface PDFDocumentViewProps {
  scrollMode?: 'continuous' | 'single' | 'horizontal' | undefined;
  scale: number;
  gap?: number | undefined;
  bufferPages?: number | undefined;
  showTextLayer?: boolean | undefined;
  showAnnotations?: boolean | undefined;
  showLinks?: boolean | undefined;
  renderFormFields?: boolean | undefined;
  search?: SearchState | undefined;
  currentPageIndex?: number | undefined;
  scrollGeneration?: number | undefined;
  onCurrentPageChange?: ((pageIndex: number) => void) | undefined;
  renderPageOverlay?: ((info: PageOverlayInfo) => ReactNode) | undefined;
  containerRef?: RefObject<HTMLDivElement | null> | undefined;
  zoomAnchorRef?: RefObject<ZoomAnchor | null> | undefined;
  getRotation?: ((pageIndex: number) => PageRotation) | undefined;
  spreadMode?: SpreadMode | undefined;
  classNames?: PDFDocumentViewClassNames | undefined;
  loadingContent?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

const PDFDocumentViewRoot = forwardRef<PDFDocumentViewHandle, PDFDocumentViewProps>(function PDFDocumentViewRoot(
  {
    scrollMode = 'continuous',
    scale,
    gap = 16,
    bufferPages = 1,
    showTextLayer = true,
    showAnnotations = true,
    showLinks = true,
    renderFormFields = false,
    search,
    currentPageIndex: controlledPageIndex,
    scrollGeneration,
    onCurrentPageChange,
    containerRef,
    zoomAnchorRef,
    getRotation,
    spreadMode,
    renderPageOverlay,
    classNames,
    loadingContent,
    className,
    style,
  }: PDFDocumentViewProps,
  ref,
) {
  const {
    document,
    dimensions,
    dimensionsLoading,
    effectiveRef,
    groupedRows,
    totalHeight,
    totalWidth,
    maxContentWidth,
    scrollToPage,
    searchResultsByPage,
    searchCurrentIndex,
    searchMatchIndexMap,
    isHorizontal,
  } = usePDFDocumentViewController({
    scrollMode,
    scale,
    gap,
    bufferPages,
    search,
    controlledPageIndex,
    scrollGeneration,
    onCurrentPageChange,
    containerRef,
    zoomAnchorRef,
    getRotation,
    spreadMode,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToPage: (pageIndex: number, behavior?: 'auto' | 'smooth') => {
        scrollToPage(pageIndex, behavior ?? 'smooth');
      },
    }),
    [scrollToPage],
  );

  if (!document) return null;

  const containerClassName = mergeClassNames(classNames?.container, className);
  const pageClassName = classNames?.page;

  const sharedRenderProps = {
    document,
    scale,
    showTextLayer,
    showAnnotations,
    showLinks,
    renderFormFields,
    getRotation,
    onCurrentPageChange,
    renderPageOverlay,
    pageClassName,
    searchResultsByPage,
    searchCurrentIndex,
    searchMatchIndexMap,
  };

  if (scrollMode === 'single' && dimensions) {
    return renderSinglePageDocument({
      ...sharedRenderProps,
      effectiveRef,
      dimensions,
      controlledPageIndex,
      containerClassName,
      containerStyle: style,
      gap,
    });
  }

  return renderScrollableDocument({
    ...sharedRenderProps,
    effectiveRef,
    dimensions,
    dimensionsLoading,
    groupedRows,
    totalHeight,
    totalWidth,
    maxContentWidth,
    isHorizontal,
    gap,
    classNames: { loadingPlaceholder: classNames?.loadingPlaceholder },
    containerClassName,
    loadingContent,
    containerStyle: style,
  });
});

export { PDFDocumentViewRoot };
export type { PDFDocumentViewClassNames, PDFDocumentViewHandle, PDFDocumentViewProps, SearchState };
