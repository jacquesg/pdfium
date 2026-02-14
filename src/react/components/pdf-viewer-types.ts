import type { CSSProperties, ReactNode } from 'react';
import type { InteractionMode } from '../hooks/use-interaction-mode.js';
import type { SpreadMode } from '../hooks/use-visible-pages.js';
import type { PanelEntry, PanelId } from './panels/types.js';
import type { PageOverlayInfo } from './pdf-page-view.js';
import type { PDFPanelState, PDFViewerState } from './pdf-viewer-context.js';

interface PDFViewerClassNames {
  root?: string | undefined;
  toolbar?: string | undefined;
  search?: string | undefined;
  content?: string | undefined;
  activityBar?: string | undefined;
  panel?: string | undefined;
  pages?: string | undefined;
}

interface PDFViewerProps {
  initialScale?: number;
  initialScrollMode?: 'continuous' | 'single' | 'horizontal';
  initialSpreadMode?: SpreadMode;
  initialInteractionMode?: InteractionMode;
  /** Show search panel toggle. Default: true. */
  showSearch?: boolean;
  /** Show selectable text layer. Default: true. */
  showTextLayer?: boolean;
  /** Show annotation overlays. Default: true. */
  showAnnotations?: boolean;
  /** Show clickable link regions. Default: true. */
  showLinks?: boolean;
  /** Render interactive form fields into the page bitmap. Default: false. */
  renderFormFields?: boolean;
  /** Gap between pages in CSS pixels. Default: 16. */
  gap?: number;
  /** Number of pages to render above/below viewport. Default: 1. */
  bufferPages?: number;
  /** Enable keyboard shortcuts (Ctrl+F search, arrow nav, zoom). Default: true. */
  keyboardShortcuts?: boolean;
  /** Render custom overlay content on top of each page. */
  renderPageOverlay?: (info: PageOverlayInfo) => ReactNode;
  /** Which panels to show in the activity bar. Accepts built-in IDs or custom PanelConfig. */
  panels?: readonly PanelEntry[] | undefined;
  /** Panel to open on mount. */
  initialPanel?: PanelId | string | undefined;
  className?: string;
  classNames?: PDFViewerClassNames | undefined;
  style?: CSSProperties;
  children?: ReactNode | ((state: PDFViewerState & PDFPanelState) => ReactNode);
}

export type { PDFViewerClassNames, PDFViewerProps };
