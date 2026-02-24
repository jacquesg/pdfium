import type { CSSProperties, ReactNode } from 'react';
import type { PanelEntry } from '../components/panels/types.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import type { PDFPanelState, PDFViewerState } from '../components/pdf-viewer-context.js';
import { buildDefaultLayout, buildPanelLayout } from '../components/pdf-viewer-layout-builders.js';
import type { PDFViewerClassNames } from '../components/pdf-viewer-types.js';
import { resolvePDFViewerContent } from './pdf-viewer-content.js';
import type { UsePDFViewerControllerResult } from './use-pdf-viewer-controller.js';
import { resolveViewerLayoutMode } from './viewer-layout.js';

interface BuildPDFViewerRootContentOptions {
  controller: UsePDFViewerControllerResult;
  children: ReactNode | ((state: PDFViewerState & PDFPanelState) => ReactNode);
  panels: readonly PanelEntry[] | undefined;
  className?: string | undefined;
  classNames?: PDFViewerClassNames | undefined;
  style?: CSSProperties | undefined;
  gap?: number | undefined;
  bufferPages?: number | undefined;
  showTextLayer: boolean;
  showAnnotations: boolean;
  showLinks: boolean;
  renderFormFields: boolean;
  renderPageOverlay?: ((info: PageOverlayInfo) => ReactNode) | undefined;
}

function buildPDFViewerRootContent({
  controller,
  children,
  panels,
  className,
  classNames,
  style,
  gap,
  bufferPages,
  showTextLayer,
  showAnnotations,
  showLinks,
  renderFormFields,
  renderPageOverlay,
}: BuildPDFViewerRootContentOptions): ReactNode {
  const {
    viewerState,
    panelState,
    panelOverlayRef,
    overlayVersion,
    lastFocusedButtonRef,
    panelContainerRef,
    sidebarWidth,
    resizeHandleProps,
    isResizing,
  } = controller;

  const { viewer, isSearchOpen } = viewerState;
  const { activePanel, togglePanel, hasPanelBar } = panelState;
  const layoutMode = resolveViewerLayoutMode({ children, hasPanelBar });

  return resolvePDFViewerContent({
    layoutMode,
    children,
    viewerState,
    panelState,
    renderPanelLayout: () =>
      buildPanelLayout({
        fullscreenRef: viewer.container.fullscreenRef,
        className,
        classNames,
        style,
        isResizing,
        isSearchOpen,
        children: children as ReactNode,
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
        panelOverlay: panelOverlayRef.current,
        overlayVersion,
      }),
    renderDefaultLayout: () =>
      buildDefaultLayout({
        fullscreenRef: viewer.container.fullscreenRef,
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
      }),
  });
}

export { buildPDFViewerRootContent };
export type { BuildPDFViewerRootContentOptions };
