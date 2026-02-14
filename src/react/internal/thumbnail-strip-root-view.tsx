'use client';

import { type CSSProperties, type KeyboardEvent, memo, useCallback, useEffect, useRef } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { PDFCanvas } from '../components/pdf-canvas.js';
import { useDevicePixelRatio } from '../hooks/use-device-pixel-ratio.js';
import { usePageDimensions } from '../hooks/use-page-dimensions.js';
import { useVisiblePages } from '../hooks/use-visible-pages.js';
import { useRenderPage } from '../use-render.js';
import { resolveThumbnailPageCount, resolveThumbnailTargetPage } from './thumbnail-strip-model.js';

interface ThumbnailStripClassNames {
  container?: string | undefined;
  thumbnail?: string | undefined;
  label?: string | undefined;
  active?: string | undefined;
}

interface ThumbnailStripProps {
  document: WorkerPDFiumDocument | null;
  pageCount: number;
  currentPageIndex: number;
  onPageSelect: (pageIndex: number) => void;
  thumbnailScale?: number | undefined;
  classNames?: ThumbnailStripClassNames | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

const Thumbnail = memo(function Thumbnail({
  document,
  pageIndex,
  scale,
  isActive,
  onClick,
  thumbnailClassName,
  activeClassName,
  labelClassName,
}: {
  document: WorkerPDFiumDocument;
  pageIndex: number;
  scale: number;
  isActive: boolean;
  onClick: (pageIndex: number) => void;
  thumbnailClassName?: string | undefined;
  activeClassName?: string | undefined;
  labelClassName?: string | undefined;
}) {
  const dpr = useDevicePixelRatio();
  const renderScale = scale * dpr;
  const { renderKey, width, height, originalWidth, originalHeight } = useRenderPage(document, pageIndex, {
    scale: renderScale,
  });

  const displayWidth = originalWidth !== null ? originalWidth * scale : 0;
  const displayHeight = originalHeight !== null ? originalHeight * scale : 0;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      aria-label={`Page ${pageIndex + 1}`}
      className={isActive ? activeClassName : thumbnailClassName}
      onClick={() => onClick(pageIndex)}
      style={{
        display: 'block',
        padding: 0,
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        background: 'none',
        textAlign: 'center',
        outline: isActive ? '2px solid var(--pdfium-thumb-active-colour, #3b82f6)' : '2px solid transparent',
        outlineOffset: 2,
      }}
    >
      {renderKey ? (
        <PDFCanvas
          width={width ?? 0}
          height={height ?? 0}
          renderKey={renderKey}
          style={{
            display: 'block',
            width: displayWidth,
            height: displayHeight,
            borderRadius: 2,
            boxShadow: 'var(--pdfium-thumb-shadow, 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.08))',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            display: 'block',
            width: displayWidth,
            height: displayHeight,
            borderRadius: 2,
            background: 'var(--pdfium-page-bg-loading, #f3f4f6)',
            boxShadow: 'var(--pdfium-thumb-shadow, 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.08))',
          }}
        />
      )}
      <div
        className={labelClassName}
        style={{ fontSize: 11, lineHeight: 1.2, marginTop: 4, color: 'var(--pdfium-thumb-label-colour, #6b7280)' }}
      >
        {pageIndex + 1}
      </div>
    </button>
  );
});

function ThumbnailStripRootView({
  document,
  pageCount: _pageCount,
  currentPageIndex,
  onPageSelect,
  thumbnailScale = 0.2,
  classNames,
  className,
  style,
}: ThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: dimensions } = usePageDimensions(document);
  const pageCount = resolveThumbnailPageCount(dimensions?.length);

  const handlePageSelect = useCallback(
    (pageIndex: number) => {
      onPageSelect(pageIndex);
    },
    [onPageSelect],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const targetPage = resolveThumbnailTargetPage({
        key: event.key,
        currentPageIndex,
        pageCount,
      });
      if (targetPage === null) return;
      event.preventDefault();
      onPageSelect(targetPage);
    },
    [currentPageIndex, pageCount, onPageSelect],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPageIndex/document intentionally trigger scroll-to-active on viewer navigation and document swap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [document, currentPageIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: document changes intentionally reset scroll offset for new documents
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = 0;
    container.scrollLeft = 0;
  }, [document]);

  const { visiblePages, totalHeight } = useVisiblePages(containerRef, dimensions, thumbnailScale, {
    gap: 24,
    bufferPages: 3,
  });

  if (!document) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Page thumbnails"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={classNames?.container ?? className}
      style={{ overflow: 'auto', padding: '4px 0', ...style }}
    >
      <div style={{ position: 'relative', height: totalHeight }}>
        {visiblePages.map(({ pageIndex, offsetY }) => (
          <div
            key={pageIndex}
            style={{ position: 'absolute', top: offsetY, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
          >
            <Thumbnail
              document={document}
              pageIndex={pageIndex}
              scale={thumbnailScale}
              isActive={pageIndex === currentPageIndex}
              onClick={handlePageSelect}
              thumbnailClassName={classNames?.thumbnail}
              activeClassName={classNames?.active}
              labelClassName={classNames?.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export { ThumbnailStripRootView };
export type { ThumbnailStripClassNames, ThumbnailStripProps };
