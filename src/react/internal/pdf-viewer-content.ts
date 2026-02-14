'use client';

import type { ReactNode } from 'react';
import type { PDFPanelState, PDFViewerState } from '../components/pdf-viewer-context.js';
import type { ViewerLayoutMode } from './viewer-layout.js';

interface ResolvePDFViewerContentOptions {
  layoutMode: ViewerLayoutMode;
  children: ReactNode | ((state: PDFViewerState & PDFPanelState) => ReactNode);
  viewerState: PDFViewerState;
  panelState: PDFPanelState;
  renderPanelLayout: () => ReactNode;
  renderDefaultLayout: () => ReactNode;
}

function resolvePDFViewerContent({
  layoutMode,
  children,
  viewerState,
  panelState,
  renderPanelLayout,
  renderDefaultLayout,
}: ResolvePDFViewerContentOptions): ReactNode {
  if (layoutMode === 'render-function') {
    const renderChildren = children as (state: PDFViewerState & PDFPanelState) => ReactNode;
    return renderChildren({ ...viewerState, ...panelState });
  }
  if (layoutMode === 'panel-layout') {
    return renderPanelLayout();
  }
  if (layoutMode === 'custom-children') {
    return children as ReactNode;
  }
  return renderDefaultLayout();
}

export { resolvePDFViewerContent };
export type { ResolvePDFViewerContentOptions };
