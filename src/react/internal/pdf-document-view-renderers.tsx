import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { PageRotation, TextSearchResult } from '../../core/types.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import { PDFPageView } from '../components/pdf-page-view.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';
import type { VisiblePage } from '../hooks/use-visible-pages.js';

interface PageRenderSharedProps {
  document: WorkerPDFiumDocument;
  scale: number;
  showTextLayer: boolean;
  showAnnotations: boolean;
  showLinks: boolean;
  renderFormFields: boolean;
  getRotation: ((pageIndex: number) => PageRotation) | undefined;
  onCurrentPageChange: ((pageIndex: number) => void) | undefined;
  renderPageOverlay: ((info: PageOverlayInfo) => ReactNode) | undefined;
  pageClassName: string | undefined;
  searchResultsByPage: Map<number, TextSearchResult[]> | undefined;
  searchCurrentIndex: number | undefined;
  searchMatchIndexMap: ReadonlyArray<{ pageIndex: number; localIndex: number }> | undefined;
}

interface SinglePageDocumentRendererProps extends PageRenderSharedProps {
  effectiveRef: RefObject<HTMLDivElement | null>;
  dimensions: PageDimension[];
  controlledPageIndex: number | undefined;
  containerClassName: string | undefined;
  containerStyle: CSSProperties | undefined;
  gap: number;
}

interface ScrollableDocumentRendererProps extends PageRenderSharedProps {
  effectiveRef: RefObject<HTMLDivElement | null>;
  dimensions: PageDimension[] | undefined;
  dimensionsLoading: boolean;
  groupedRows: Map<number, VisiblePage[]>;
  totalHeight: number;
  totalWidth: number | undefined;
  maxContentWidth: number;
  isHorizontal: boolean;
  gap: number;
  classNames: { loadingPlaceholder?: string | undefined };
  containerClassName: string | undefined;
  loadingContent: ReactNode | undefined;
  containerStyle: CSSProperties | undefined;
}

function getLocalMatchIndex(
  pageIndex: number,
  globalIndex: number | undefined,
  indexMap: ReadonlyArray<{ pageIndex: number; localIndex: number }> | undefined,
): number {
  if (globalIndex === undefined || !indexMap || globalIndex < 0 || globalIndex >= indexMap.length) return -1;
  const entry = indexMap[globalIndex];
  if (!entry || entry.pageIndex !== pageIndex) return -1;
  return entry.localIndex;
}

function createDocumentPageProps(
  pageIndex: number,
  dimensions: PageDimension[] | undefined,
  props: PageRenderSharedProps,
): Omit<Parameters<typeof PDFPageView>[0], 'className'> & { className: string | undefined } {
  const rotation = props.getRotation?.(pageIndex);
  const dim = dimensions?.[pageIndex];
  return {
    document: props.document,
    pageIndex,
    scale: props.scale,
    ...(rotation !== undefined ? { rotation } : undefined),
    showTextLayer: props.showTextLayer,
    showAnnotations: props.showAnnotations,
    showLinks: props.showLinks,
    renderFormFields: props.renderFormFields,
    expectedWidth: dim?.width,
    expectedHeight: dim?.height,
    searchResults: props.searchResultsByPage?.get(pageIndex),
    currentMatchOnPage: getLocalMatchIndex(pageIndex, props.searchCurrentIndex, props.searchMatchIndexMap),
    onLinkNavigate: props.onCurrentPageChange,
    renderPageOverlay: props.renderPageOverlay,
    className: props.pageClassName,
  };
}

function renderSinglePageDocument(props: SinglePageDocumentRendererProps): ReactNode {
  const pageIndex = props.controlledPageIndex ?? 0;
  if (pageIndex >= props.dimensions.length) return null;

  return (
    <div
      ref={props.effectiveRef}
      className={props.containerClassName}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'auto',
        backgroundColor: 'var(--pdfium-container-bg, #e8eaed)',
        padding: props.gap,
        ...props.containerStyle,
      }}
    >
      <PDFPageView {...createDocumentPageProps(pageIndex, props.dimensions, props)} />
    </div>
  );
}

function renderScrollableDocument(props: ScrollableDocumentRendererProps): ReactNode {
  return (
    <div
      ref={props.effectiveRef}
      className={props.containerClassName}
      role="document"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scroll container must be focusable for keyboard scrolling
      tabIndex={0}
      aria-label="PDF document"
      aria-busy={props.dimensionsLoading}
      style={{
        ...(props.isHorizontal
          ? { overflowX: 'auto' as const, overflowY: 'hidden' as const }
          : { overflow: 'auto' as const }),
        position: 'relative',
        backgroundColor: 'var(--pdfium-container-bg, #e8eaed)',
        ...props.containerStyle,
      }}
    >
      {!props.dimensions ? (
        (props.loadingContent ?? (
          <div
            className={props.classNames.loadingPlaceholder}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--pdfium-loading-colour, inherit)',
            }}
          >
            Loading document...
          </div>
        ))
      ) : (
        <div
          style={{
            position: 'relative',
            height: props.isHorizontal ? '100%' : props.totalHeight + props.gap * 2,
            width: props.isHorizontal ? (props.totalWidth ?? 0) + props.gap * 2 : undefined,
            minWidth: props.isHorizontal
              ? undefined
              : props.maxContentWidth > 0
                ? props.maxContentWidth + props.gap * 2
                : '100%',
          }}
        >
          {Array.from(props.groupedRows.entries()).map(([rowIndex, pages]) => {
            const firstPage = pages[0];
            if (!firstPage) return null;
            const isSinglePage = pages.length === 1;

            if (props.isHorizontal) {
              return pages.map((vp) => (
                <div
                  key={vp.pageIndex}
                  style={{
                    position: 'absolute',
                    left: (vp.offsetX ?? 0) + props.gap,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    contain: 'layout style paint',
                  }}
                >
                  <PDFPageView {...createDocumentPageProps(vp.pageIndex, props.dimensions, props)} />
                </div>
              ));
            }

            return (
              <div
                key={rowIndex}
                style={{
                  position: 'absolute',
                  top: firstPage.offsetY + props.gap,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: isSinglePage ? undefined : 'center',
                  gap: isSinglePage ? undefined : props.gap,
                  contain: 'layout style paint',
                }}
              >
                {pages.map((vp) => (
                  <PDFPageView key={vp.pageIndex} {...createDocumentPageProps(vp.pageIndex, props.dimensions, props)} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { getLocalMatchIndex, renderScrollableDocument, renderSinglePageDocument };
export type { PageRenderSharedProps, ScrollableDocumentRendererProps, SinglePageDocumentRendererProps };
