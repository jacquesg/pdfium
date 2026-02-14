import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { UseResizeHandleProps } from '../../../../src/react/hooks/use-resize.js';

vi.mock('../../../../src/react/components/activity-bar.js', () => ({
  ActivityBar: (props: { activePanel: string | null; className?: string; panelContainerId?: string }) => (
    <div
      data-testid="activity-bar"
      data-active-panel={String(props.activePanel)}
      data-panel-container-id={props.panelContainerId ?? ''}
      className={props.className}
    />
  ),
}));

vi.mock('../../../../src/react/components/viewer-panel-sidebar.js', () => ({
  ViewerPanelSidebar: (props: {
    activePanel: string;
    onClose: () => void;
    className?: string;
    panelContainerId?: string;
  }) => (
    <button
      type="button"
      data-testid="panel-sidebar"
      data-active-panel={props.activePanel}
      data-panel-container-id={props.panelContainerId ?? ''}
      className={props.className}
      onClick={props.onClose}
    >
      sidebar
    </button>
  ),
}));

vi.mock('../../../../src/react/components/resize-handle.js', () => ({
  ResizeHandle: (props: { isResizing: boolean }) => (
    <div data-testid="resize-handle" data-resizing={String(props.isResizing)} />
  ),
}));

const { ViewerDefaultLayout, ViewerPanelLayout } = await import(
  '../../../../src/react/components/viewer-shell-layout.js'
);

const baseResizeHandleProps: UseResizeHandleProps = {
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

function renderPanelLayout(overrides?: Partial<ComponentProps<typeof ViewerPanelLayout>>) {
  const onTogglePanel = vi.fn();
  const props: ComponentProps<typeof ViewerPanelLayout> = {
    fullscreenRef: createRef<HTMLDivElement>(),
    className: 'root',
    style: undefined,
    isResizing: false,
    toolbar: <div data-testid="toolbar" />,
    search: <div data-testid="search" />,
    panels: ['thumbnails'],
    activePanel: 'thumbnails',
    onTogglePanel,
    lastFocusedButtonRef: createRef<HTMLButtonElement>(),
    panelContainerRef: createRef<HTMLDivElement>(),
    activityBarClassName: 'activity-bar-class',
    panelClassName: 'panel-class',
    sidebarWidth: 280,
    resizeHandleProps: baseResizeHandleProps,
    pages: <div data-testid="pages" />,
    renderThumbnails: (_onClose: () => void) => <div />,
    renderBookmarks: (_onClose: () => void) => <div />,
    ...overrides,
  };

  return { onTogglePanel, ...render(<ViewerPanelLayout {...props} />) };
}

describe('ViewerPanelLayout', () => {
  it('renders panel shell elements and wires close action through toggle callback', () => {
    const { onTogglePanel, container } = renderPanelLayout({ isResizing: true });

    expect(screen.getByTestId('toolbar')).toBeDefined();
    expect(screen.getByTestId('search')).toBeDefined();
    expect(screen.getByTestId('pages')).toBeDefined();
    expect(screen.getByTestId('activity-bar').getAttribute('data-active-panel')).toBe('thumbnails');
    expect(screen.getByTestId('panel-sidebar').getAttribute('data-active-panel')).toBe('thumbnails');
    expect(screen.getByTestId('resize-handle').getAttribute('data-resizing')).toBe('true');
    const activityBarContainerId = screen.getByTestId('activity-bar').getAttribute('data-panel-container-id');
    const sidebarContainerId = screen.getByTestId('panel-sidebar').getAttribute('data-panel-container-id');
    expect(activityBarContainerId).toBeTruthy();
    expect(activityBarContainerId).toBe(sidebarContainerId);

    fireEvent.click(screen.getByTestId('panel-sidebar'));
    expect(onTogglePanel).toHaveBeenCalledWith('thumbnails');

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe('root');
    expect(root.style.userSelect).toBe('none');
  });

  it('collapses panel area when there is no active panel', () => {
    renderPanelLayout({ activePanel: null });

    expect(screen.getByTestId('activity-bar').getAttribute('data-active-panel')).toBe('null');
    expect(screen.queryByTestId('panel-sidebar')).toBeNull();
    expect(screen.queryByTestId('resize-handle')).toBeNull();
  });
});

describe('ViewerDefaultLayout', () => {
  it('renders toolbar, optional search, and content area with pages', () => {
    render(
      <ViewerDefaultLayout
        fullscreenRef={createRef<HTMLDivElement>()}
        className="default-root"
        style={{ height: '100%' }}
        toolbar={<div data-testid="toolbar" />}
        search={<div data-testid="search" />}
        contentClassName="content-class"
        pages={<div data-testid="pages" />}
      />,
    );

    expect(screen.getByTestId('toolbar')).toBeDefined();
    expect(screen.getByTestId('search')).toBeDefined();
    expect(screen.getByTestId('pages')).toBeDefined();
    const pagesParent = screen.getByTestId('pages').parentElement as HTMLElement;
    expect(pagesParent.className).toBe('content-class');
  });
});
