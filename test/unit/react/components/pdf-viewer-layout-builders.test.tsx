import { cleanup, render, screen } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UseResizeHandleProps } from '../../../../src/react/hooks/use-resize.js';

const capturedPagesProps: Array<Record<string, unknown>> = [];

vi.mock('../../../../src/react/components/default-toolbar.js', () => ({
  DefaultToolbar: (props: { className?: string }) => (
    <div data-testid="default-toolbar" className={props.className}>
      toolbar
    </div>
  ),
}));

vi.mock('../../../../src/react/components/pdf-viewer-slot-wrappers.js', () => ({
  Pages: (props: Record<string, unknown>) => {
    capturedPagesProps.push(props);
    return <div data-testid="pages" />;
  },
  PagesSearch: (props: { className?: string }) => <div data-testid="search" className={props.className} />,
  PagesThumbnails: () => <div data-testid="thumbnails-slot" />,
  PagesBookmarks: () => <div data-testid="bookmarks-slot" />,
}));

vi.mock('../../../../src/react/components/viewer-shell-layout.js', () => ({
  ViewerPanelLayout: (props: { toolbar: ReactNode; search: ReactNode; pages: ReactNode }) => (
    <div data-testid="panel-layout">
      <div data-testid="toolbar-slot">{props.toolbar}</div>
      <div data-testid="search-slot">{props.search}</div>
      <div data-testid="pages-slot">{props.pages}</div>
    </div>
  ),
  ViewerDefaultLayout: (props: { toolbar: ReactNode; search: ReactNode; pages: ReactNode }) => (
    <div data-testid="default-layout">
      <div data-testid="toolbar-slot">{props.toolbar}</div>
      <div data-testid="search-slot">{props.search}</div>
      <div data-testid="pages-slot">{props.pages}</div>
    </div>
  ),
}));

const { buildDefaultLayout, buildPanelLayout } = await import(
  '../../../../src/react/components/pdf-viewer-layout-builders.js'
);

const resizeHandleProps: UseResizeHandleProps = {
  onPointerDown: vi.fn(),
  onKeyDown: vi.fn(),
  style: { cursor: 'col-resize' },
  role: 'separator',
  'aria-orientation': 'vertical',
  'aria-label': 'Resize sidebar',
  'aria-valuenow': 280,
  'aria-valuemin': 200,
  'aria-valuemax': 500,
  tabIndex: 0,
  'data-pdfium-resize-handle': '',
};

afterEach(() => {
  cleanup();
  capturedPagesProps.length = 0;
});

describe('buildPanelLayout', () => {
  it('uses custom children toolbar and applies built-in panel viewport effects', () => {
    const node = buildPanelLayout({
      fullscreenRef: createRef<HTMLDivElement>(),
      className: 'root',
      classNames: { search: 'search-class' },
      style: undefined,
      isResizing: false,
      isSearchOpen: true,
      children: <div data-testid="custom-toolbar" />,
      panels: ['forms', 'thumbnails'],
      activePanel: 'forms',
      togglePanel: vi.fn(),
      lastFocusedButtonRef: createRef<HTMLButtonElement>(),
      panelContainerRef: createRef<HTMLDivElement>(),
      sidebarWidth: 280,
      resizeHandleProps,
      gap: 24,
      bufferPages: 2,
      showTextLayer: true,
      showAnnotations: true,
      showLinks: true,
      renderFormFields: false,
      renderPageOverlay: undefined,
      panelOverlay: null,
      overlayVersion: 1,
    });

    render(node);

    expect(screen.getByTestId('panel-layout')).toBeDefined();
    expect(screen.getByTestId('custom-toolbar')).toBeDefined();
    expect(screen.queryByTestId('default-toolbar')).toBeNull();
    expect(screen.getByTestId('search').className).toBe('search-class');

    const pagesProps = capturedPagesProps.at(-1)!;
    expect(pagesProps.showTextLayer).toBe(false);
    expect(pagesProps.showAnnotations).toBe(false);
    expect(pagesProps.renderFormFields).toBe(true);
  });

  it('falls back to default toolbar and prefers panel overlay over external overlay', () => {
    const externalOverlay = vi.fn();
    const panelOverlay = vi.fn();

    const node = buildPanelLayout({
      fullscreenRef: createRef<HTMLDivElement>(),
      className: 'root',
      classNames: { toolbar: 'toolbar-class' },
      style: undefined,
      isResizing: false,
      isSearchOpen: false,
      children: undefined,
      panels: ['thumbnails'],
      activePanel: 'thumbnails',
      togglePanel: vi.fn(),
      lastFocusedButtonRef: createRef<HTMLButtonElement>(),
      panelContainerRef: createRef<HTMLDivElement>(),
      sidebarWidth: 280,
      resizeHandleProps,
      gap: undefined,
      bufferPages: undefined,
      showTextLayer: true,
      showAnnotations: true,
      showLinks: true,
      renderFormFields: false,
      renderPageOverlay: externalOverlay,
      panelOverlay,
      overlayVersion: 2,
    });

    render(node);

    expect(screen.getByTestId('default-toolbar').className).toBe('toolbar-class');
    expect(screen.queryByTestId('search')).toBeNull();

    const pagesProps = capturedPagesProps.at(-1)!;
    expect(pagesProps.renderPageOverlay).toBe(panelOverlay);
  });
});

describe('buildDefaultLayout', () => {
  it('builds default layout with toolbar and forwards page props', () => {
    const externalOverlay = vi.fn();

    const node = buildDefaultLayout({
      fullscreenRef: createRef<HTMLDivElement>(),
      className: 'root',
      classNames: { toolbar: 'toolbar-class', search: 'search-class', pages: 'pages-class' },
      style: undefined,
      isSearchOpen: true,
      gap: 16,
      bufferPages: 3,
      showTextLayer: false,
      showAnnotations: false,
      showLinks: true,
      renderFormFields: true,
      renderPageOverlay: externalOverlay,
    });

    render(node);

    expect(screen.getByTestId('default-layout')).toBeDefined();
    expect(screen.getByTestId('default-toolbar').className).toBe('toolbar-class');
    expect(screen.getByTestId('search').className).toBe('search-class');

    const pagesProps = capturedPagesProps.at(-1)!;
    expect(pagesProps.className).toBe('pages-class');
    expect(pagesProps.showTextLayer).toBe(false);
    expect(pagesProps.showAnnotations).toBe(false);
    expect(pagesProps.renderFormFields).toBe(true);
    expect(pagesProps.renderPageOverlay).toBe(externalOverlay);
  });
});
