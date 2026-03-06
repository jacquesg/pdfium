import { type CSSProperties, memo, type ReactNode, useMemo } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { PageRotation, type TextSearchResult } from '../../core/types.js';
import { pdfRectToScreen, pdfToScreen } from '../coordinates.js';
import { useAnnotations } from '../hooks/use-annotations.js';
import { useDevicePixelRatio } from '../hooks/use-device-pixel-ratio.js';
import { useLinks } from '../hooks/use-links.js';
import { useTextContent } from '../hooks/use-text-content.js';
import { useWebLinks } from '../hooks/use-web-links.js';
import { useRenderPage } from '../use-render.js';
import { AnnotationOverlay } from './annotation-overlay.js';
import { LinkOverlay } from './link-overlay.js';
import { PDFCanvas } from './pdf-canvas.js';
import { SearchHighlightOverlay } from './search-highlight-overlay.js';
import { TextOverlay } from './text-overlay.js';

/** Info passed to the `renderPageOverlay` callback. */
interface PageOverlayInfo {
  pageIndex: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  scale: number;
  /** Convert a PDF rect (bottom-left origin) to a screen rect (top-left origin, CSS pixels). */
  transformRect(rect: { left: number; top: number; right: number; bottom: number }): {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Convert a PDF point (bottom-left origin) to a screen point (top-left origin, CSS pixels). */
  transformPoint(point: { x: number; y: number }): { x: number; y: number };
}

interface PDFPageViewProps {
  document: WorkerPDFiumDocument;
  pageIndex: number;
  scale: number;
  rotation?: PageRotation;
  showTextLayer?: boolean;
  showAnnotations?: boolean;
  /** Render clickable link regions. Default: true. */
  showLinks?: boolean;
  /** Render interactive form fields into the page bitmap. */
  renderFormFields?: boolean;
  /** Known page width in points, used for container sizing while the bitmap loads. */
  expectedWidth?: number | undefined;
  /** Known page height in points, used for container sizing while the bitmap loads. */
  expectedHeight?: number | undefined;
  /** Per-page search results for highlighting. Passed from parent (PDFDocumentView). */
  searchResults?: TextSearchResult[] | undefined;
  /** Index of the current match within this page's results. -1 if no match is on this page. */
  currentMatchOnPage?: number;
  /** Called when a link navigates to a page within the document. */
  onLinkNavigate?: ((pageIndex: number) => void) | undefined;
  /** Render custom overlay content on top of the page (e.g. bounding box highlights). */
  renderPageOverlay?: ((info: PageOverlayInfo) => ReactNode) | undefined;
  className?: string | undefined;
  style?: CSSProperties;
}

export const PDFPageView = memo(function PDFPageView({
  document,
  pageIndex,
  scale,
  rotation,
  showTextLayer = true,
  showAnnotations = true,
  showLinks = true,
  renderFormFields = false,
  expectedWidth,
  expectedHeight,
  searchResults,
  currentMatchOnPage = -1,
  onLinkNavigate,
  renderPageOverlay,
  className,
  style,
}: PDFPageViewProps) {
  // Render at scale * DPR for crisp HiDPI output, display at scale via CSS sizing
  const dpr = useDevicePixelRatio();
  const renderScale = scale * dpr;

  const { renderKey, width, height, originalWidth, originalHeight, isLoading, isPlaceholderData } = useRenderPage(
    document,
    pageIndex,
    {
      scale: renderScale,
      ...(rotation !== undefined ? { rotation } : {}),
      ...(renderFormFields ? { renderFormFields: true } : {}),
    },
  );

  const { data: textContent } = useTextContent(document, pageIndex);
  const { data: annotations } = useAnnotations(document, pageIndex);
  const { data: links } = useLinks(document, pageIndex);
  const { data: webLinks } = useWebLinks(document, pageIndex);

  // Container dimensions are always in CSS pixels (display scale, not render scale).
  // originalWidth/Height are in PDF points — multiply by display scale for CSS size.
  // When null (unknown), fall back to expectedWidth.
  const effectiveOrigW = originalWidth ?? expectedWidth ?? 0;
  const effectiveOrigH = originalHeight ?? expectedHeight ?? 0;

  // For transposing rotations (90°/270°), swap container dimensions so the page
  // displays in landscape/portrait correctly instead of squishing the rendered content.
  const transposed = rotation === PageRotation.Clockwise90 || rotation === PageRotation.CounterClockwise90;
  const containerWidth = (transposed ? effectiveOrigH : effectiveOrigW) * scale;
  const containerHeight = (transposed ? effectiveOrigW : effectiveOrigH) * scale;

  const overlayInfo = useMemo<PageOverlayInfo>(
    () => ({
      pageIndex,
      width: containerWidth,
      height: containerHeight,
      originalWidth: effectiveOrigW,
      originalHeight: effectiveOrigH,
      scale,
      transformRect: (rect) => pdfRectToScreen(rect, { scale, originalHeight: effectiveOrigH }),
      transformPoint: (point) => pdfToScreen(point, { scale, originalHeight: effectiveOrigH }),
    }),
    [pageIndex, containerWidth, containerHeight, effectiveOrigW, effectiveOrigH, scale],
  );

  return (
    <div
      className={className}
      data-page-index={pageIndex}
      style={{
        position: 'relative',
        width: containerWidth,
        height: containerHeight,
        overflow: 'hidden',
        backgroundColor:
          isLoading && !isPlaceholderData ? 'var(--pdfium-page-bg-loading, #f3f4f6)' : 'var(--pdfium-page-bg, #fff)',
        boxShadow: 'var(--pdfium-page-shadow, 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1))',
        border: 'var(--pdfium-page-border, none)',
        ...style,
      }}
    >
      <PDFCanvas
        width={width ?? 0}
        height={height ?? 0}
        renderKey={renderKey}
        aria-label={`PDF page ${pageIndex + 1}`}
        style={{
          // CSS-size the canvas to the container so the higher-resolution pixel buffer
          // maps to physical display pixels on HiDPI screens.
          width: containerWidth,
          height: containerHeight,
          // Placeholder opacity is theme-configurable to avoid perceptual flicker
          // in high-frequency mutation flows (for example live editor updates).
          opacity: isPlaceholderData ? 'var(--pdfium-page-placeholder-opacity, 0.7)' : 1,
        }}
      />
      {showTextLayer && textContent && (
        <TextOverlay
          text={textContent.text}
          rects={textContent.rects}
          scale={scale}
          width={containerWidth}
          height={containerHeight}
          originalHeight={effectiveOrigH}
        />
      )}
      {showLinks && (links?.length || webLinks?.length) && (
        <LinkOverlay
          links={links ?? []}
          webLinks={webLinks ?? []}
          width={containerWidth}
          height={containerHeight}
          originalHeight={effectiveOrigH}
          scale={scale}
          onNavigate={onLinkNavigate}
        />
      )}
      {searchResults && searchResults.length > 0 && (
        <SearchHighlightOverlay
          results={searchResults}
          currentIndex={currentMatchOnPage}
          width={containerWidth}
          height={containerHeight}
          originalHeight={effectiveOrigH}
          scale={scale}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}
        />
      )}
      {showAnnotations && annotations && annotations.length > 0 && (
        <AnnotationOverlay
          annotations={annotations}
          width={containerWidth}
          height={containerHeight}
          originalHeight={effectiveOrigH}
          scale={scale}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}
        />
      )}
      {renderPageOverlay?.(overlayInfo)}
    </div>
  );
});

export type { PDFPageViewProps, PageOverlayInfo };
