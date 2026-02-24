import { usePDFViewerPipeline } from '../internal/pdf-viewer-pipeline.js';
import { createPDFViewerCompound } from './pdf-viewer-compound.js';
import {
  PDFPanelContext,
  type PDFPanelState,
  PDFViewerContext,
  type PDFViewerState,
  usePDFPanel,
  usePDFPanelOptional,
  usePDFViewer,
  usePDFViewerOptional,
} from './pdf-viewer-context.js';
import { Pages, PagesBookmarks, PagesSearch, PagesThumbnails } from './pdf-viewer-slot-wrappers.js';
import type { PDFViewerClassNames, PDFViewerProps } from './pdf-viewer-types.js';

// ---------------------------------------------------------------------------
// PDFViewer root
// ---------------------------------------------------------------------------

function PDFViewerRoot({ ...props }: PDFViewerProps) {
  return usePDFViewerPipeline(props);
}

const PDFViewer = createPDFViewerCompound(PDFViewerRoot, {
  Pages,
  Thumbnails: PagesThumbnails,
  Search: PagesSearch,
  Bookmarks: PagesBookmarks,
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  PDFPanelContext,
  PDFViewer,
  PDFViewerContext,
  usePDFPanel,
  usePDFPanelOptional,
  usePDFViewer,
  usePDFViewerOptional,
};
export type { PDFPanelState, PDFViewerClassNames, PDFViewerProps, PDFViewerState };
