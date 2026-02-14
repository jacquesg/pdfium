'use client';

import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { UseResizeHandleProps } from '../hooks/use-resize.js';
import { resolvePanelOverlay, resolvePanelViewportSettings } from '../internal/viewer-layout.js';
import { DefaultToolbar } from './default-toolbar.js';
import type { PanelEntry } from './panels/types.js';
import type { PageOverlayInfo } from './pdf-page-view.js';
import { Pages, PagesBookmarks, PagesSearch, PagesThumbnails } from './pdf-viewer-slot-wrappers.js';
import type { PDFViewerClassNames } from './pdf-viewer-types.js';
import { ViewerDefaultLayout, ViewerPanelLayout } from './viewer-shell-layout.js';

interface BuildPanelLayoutOptions {
  fullscreenRef: RefObject<HTMLDivElement | null> | undefined;
  className?: string | undefined;
  classNames?: PDFViewerClassNames | undefined;
  style?: CSSProperties | undefined;
  isResizing: boolean;
  isSearchOpen: boolean;
  children: ReactNode;
  panels: readonly PanelEntry[] | undefined;
  activePanel: string | null;
  togglePanel: (id: string) => void;
  lastFocusedButtonRef: RefObject<HTMLButtonElement | null>;
  panelContainerRef: RefObject<HTMLDivElement | null>;
  sidebarWidth: number;
  resizeHandleProps: UseResizeHandleProps;
  gap?: number | undefined;
  bufferPages?: number | undefined;
  showTextLayer: boolean;
  showAnnotations: boolean;
  showLinks: boolean;
  renderFormFields: boolean;
  renderPageOverlay: ((info: PageOverlayInfo) => ReactNode) | undefined;
  panelOverlay: ((info: PageOverlayInfo) => ReactNode) | null;
  overlayVersion: number;
}

interface BuildDefaultLayoutOptions {
  fullscreenRef: RefObject<HTMLDivElement | null> | undefined;
  className?: string | undefined;
  classNames?: PDFViewerClassNames | undefined;
  style?: CSSProperties | undefined;
  isSearchOpen: boolean;
  gap?: number | undefined;
  bufferPages?: number | undefined;
  showTextLayer: boolean;
  showAnnotations: boolean;
  showLinks: boolean;
  renderFormFields: boolean;
  renderPageOverlay: ((info: PageOverlayInfo) => ReactNode) | undefined;
}

function buildPanelLayout({
  fullscreenRef,
  className,
  classNames,
  style,
  isResizing,
  isSearchOpen,
  children,
  panels,
  activePanel,
  togglePanel,
  lastFocusedButtonRef,
  panelContainerRef,
  sidebarWidth,
  resizeHandleProps,
  gap,
  bufferPages,
  showTextLayer,
  showAnnotations,
  showLinks,
  renderFormFields,
  renderPageOverlay,
  panelOverlay,
  overlayVersion,
}: BuildPanelLayoutOptions): ReactNode {
  const resolvedPanels = panels ?? [];
  const effectiveViewport = resolvePanelViewportSettings({
    activePanel,
    panels: resolvedPanels,
    showTextLayer,
    showAnnotations,
    renderFormFields,
  });
  const effectiveOverlay = resolvePanelOverlay(panelOverlay, renderPageOverlay);
  const toolbar = children ?? <DefaultToolbar className={classNames?.toolbar} />;

  return (
    <ViewerPanelLayout
      fullscreenRef={fullscreenRef}
      className={classNames?.root ?? className}
      style={style}
      isResizing={isResizing}
      toolbar={toolbar}
      search={isSearchOpen ? <PagesSearch className={classNames?.search} /> : null}
      panels={resolvedPanels}
      activePanel={activePanel}
      onTogglePanel={togglePanel}
      lastFocusedButtonRef={lastFocusedButtonRef}
      panelContainerRef={panelContainerRef}
      activityBarClassName={classNames?.activityBar}
      panelClassName={classNames?.panel}
      sidebarWidth={sidebarWidth}
      resizeHandleProps={resizeHandleProps}
      pages={
        <Pages
          className={classNames?.pages}
          style={{ flex: 1, minHeight: 0 }}
          gap={gap}
          bufferPages={bufferPages}
          showTextLayer={effectiveViewport.showTextLayer}
          showAnnotations={effectiveViewport.showAnnotations}
          showLinks={showLinks}
          renderFormFields={effectiveViewport.renderFormFields}
          renderPageOverlay={effectiveOverlay}
          overlayVersion={overlayVersion}
        />
      }
      renderThumbnails={(onClose) => <PagesThumbnails onClose={onClose} />}
      renderBookmarks={(onClose) => <PagesBookmarks onClose={onClose} />}
    />
  );
}

function buildDefaultLayout({
  fullscreenRef,
  className,
  classNames,
  style,
  isSearchOpen,
  gap,
  bufferPages,
  showTextLayer,
  showAnnotations,
  showLinks,
  renderFormFields,
  renderPageOverlay,
}: BuildDefaultLayoutOptions): ReactNode {
  return (
    <ViewerDefaultLayout
      fullscreenRef={fullscreenRef}
      className={classNames?.root ?? className}
      style={style}
      toolbar={<DefaultToolbar className={classNames?.toolbar} />}
      search={isSearchOpen ? <PagesSearch className={classNames?.search} /> : null}
      contentClassName={classNames?.content}
      pages={
        <Pages
          className={classNames?.pages}
          style={{ flex: 1, minHeight: 0 }}
          gap={gap}
          bufferPages={bufferPages}
          showTextLayer={showTextLayer}
          showAnnotations={showAnnotations}
          showLinks={showLinks}
          renderFormFields={renderFormFields}
          renderPageOverlay={renderPageOverlay}
        />
      }
    />
  );
}

export { buildDefaultLayout, buildPanelLayout };
export type { BuildDefaultLayoutOptions, BuildPanelLayoutOptions };
