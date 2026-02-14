import { describe, expect, it } from 'vitest';
import { ActivityBar } from '../../../../src/react/components/activity-bar.js';
import { BookmarkPanel } from '../../../../src/react/components/bookmark-panel.js';
import { DefaultToolbar } from '../../../../src/react/components/default-toolbar.js';
import { PDFDocumentView } from '../../../../src/react/components/pdf-document-view.js';
import { SearchPanel } from '../../../../src/react/components/search-panel.js';
import { ThumbnailStrip } from '../../../../src/react/components/thumbnail-strip.js';
import { ActivityBarRootView } from '../../../../src/react/internal/activity-bar-root-view.js';
import { BookmarkPanelRootView } from '../../../../src/react/internal/bookmark-panel-root-view.js';
import { DefaultToolbarRootView } from '../../../../src/react/internal/default-toolbar-root-view.js';
import { PDFDocumentViewRoot } from '../../../../src/react/internal/pdf-document-view-root.js';
import { SearchPanelView } from '../../../../src/react/internal/search-panel-view.js';
import { ThumbnailStripRootView } from '../../../../src/react/internal/thumbnail-strip-root-view.js';

describe('component wrapper contracts', () => {
  it('keeps activity bar as a thin wrapper', () => {
    expect(ActivityBar).toBe(ActivityBarRootView);
  });

  it('keeps bookmark panel as a thin wrapper', () => {
    expect(BookmarkPanel).toBe(BookmarkPanelRootView);
  });

  it('keeps default toolbar as a thin wrapper', () => {
    expect(DefaultToolbar).toBe(DefaultToolbarRootView);
  });

  it('keeps document view as a thin wrapper', () => {
    expect(PDFDocumentView).toBe(PDFDocumentViewRoot);
  });

  it('keeps search panel as a thin wrapper', () => {
    expect(SearchPanel).toBe(SearchPanelView);
  });

  it('keeps thumbnail strip as a thin wrapper', () => {
    expect(ThumbnailStrip).toBe(ThumbnailStripRootView);
  });
});
