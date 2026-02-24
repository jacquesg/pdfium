import type { ReactNode } from 'react';
import { PDFPanelContext, type PDFPanelState, PDFViewerContext, type PDFViewerState } from './pdf-viewer-context.js';

interface PDFViewerProvidersProps {
  viewerState: PDFViewerState;
  panelState: PDFPanelState;
  children: ReactNode;
}

function PDFViewerProviders({ viewerState, panelState, children }: PDFViewerProvidersProps) {
  return (
    <PDFViewerContext.Provider value={viewerState}>
      <PDFPanelContext.Provider value={panelState}>{children}</PDFPanelContext.Provider>
    </PDFViewerContext.Provider>
  );
}

export { PDFViewerProviders };
export type { PDFViewerProvidersProps };
