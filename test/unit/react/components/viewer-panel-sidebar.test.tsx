import { render, screen } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BUILTIN_LABELS } from '../../../../src/react/components/panels/types.js';

vi.mock('../../../../src/react/components/sidebar-panel.js', () => ({
  SidebarPanel: (props: { title: string; children: ReactNode }) => (
    <div data-testid="sidebar-panel" data-title={props.title}>
      {props.children}
    </div>
  ),
}));

vi.mock('../../../../src/react/components/panels/annotations-panel.js', () => ({
  AnnotationsPanel: () => <div data-testid="annotations-panel" />,
}));
vi.mock('../../../../src/react/components/panels/attachments-panel.js', () => ({
  AttachmentsPanel: () => <div data-testid="attachments-panel" />,
}));
vi.mock('../../../../src/react/components/panels/forms-panel.js', () => ({
  FormsPanel: () => <div data-testid="forms-panel" />,
}));
vi.mock('../../../../src/react/components/panels/info-panel.js', () => ({
  InfoPanel: () => <div data-testid="info-panel" />,
}));
vi.mock('../../../../src/react/components/panels/links-panel.js', () => ({
  LinksPanel: () => <div data-testid="links-panel" />,
}));
vi.mock('../../../../src/react/components/panels/objects-panel.js', () => ({
  ObjectsPanel: () => <div data-testid="objects-panel" />,
}));
vi.mock('../../../../src/react/components/panels/structure-panel.js', () => ({
  StructurePanel: () => <div data-testid="structure-panel" />,
}));
vi.mock('../../../../src/react/components/panels/text-panel.js', () => ({
  TextPanel: () => <div data-testid="text-panel" />,
}));

const { ViewerPanelSidebar } = await import('../../../../src/react/components/viewer-panel-sidebar.js');

describe('ViewerPanelSidebar', () => {
  it('returns null when active panel is not found', () => {
    const { container } = render(
      <ViewerPanelSidebar
        panels={['thumbnails']}
        activePanel="missing"
        onClose={() => {}}
        panelContainerRef={createRef<HTMLDivElement>()}
        renderThumbnails={() => <div data-testid="thumb-slot" />}
        renderBookmarks={() => <div data-testid="bookmark-slot" />}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('uses injected thumbnails renderer for thumbnails built-in panel', () => {
    const renderThumbnails = vi.fn().mockReturnValue(<div data-testid="thumb-slot" />);
    const renderBookmarks = vi.fn().mockReturnValue(<div data-testid="bookmark-slot" />);

    render(
      <ViewerPanelSidebar
        panels={['thumbnails', 'bookmarks']}
        activePanel="thumbnails"
        onClose={() => {}}
        panelContainerRef={createRef<HTMLDivElement>()}
        renderThumbnails={renderThumbnails}
        renderBookmarks={renderBookmarks}
      />,
    );

    expect(screen.getByTestId('thumb-slot')).toBeDefined();
    expect(renderThumbnails).toHaveBeenCalledTimes(1);
    expect(renderBookmarks).not.toHaveBeenCalled();
  });

  it('renders built-in static panel content for annotations', () => {
    render(
      <ViewerPanelSidebar
        panels={['annotations']}
        activePanel="annotations"
        onClose={() => {}}
        panelContainerRef={createRef<HTMLDivElement>()}
        renderThumbnails={() => <div data-testid="thumb-slot" />}
        renderBookmarks={() => <div data-testid="bookmark-slot" />}
      />,
    );

    expect(screen.getByTestId('sidebar-panel').getAttribute('data-title')).toBe('Annotations');
    expect(screen.getByTestId('annotations-panel')).toBeDefined();
  });

  it.each([
    ['annotations', 'annotations-panel'],
    ['objects', 'objects-panel'],
    ['forms', 'forms-panel'],
    ['text', 'text-panel'],
    ['structure', 'structure-panel'],
    ['attachments', 'attachments-panel'],
    ['links', 'links-panel'],
    ['info', 'info-panel'],
  ] as const)('renders built-in "%s" panel with canonical title', (activePanel, testId) => {
    render(
      <ViewerPanelSidebar
        panels={[activePanel]}
        activePanel={activePanel}
        onClose={() => {}}
        panelContainerRef={createRef<HTMLDivElement>()}
        renderThumbnails={() => <div data-testid="thumb-slot" />}
        renderBookmarks={() => <div data-testid="bookmark-slot" />}
      />,
    );

    expect(screen.getByTestId('sidebar-panel').getAttribute('data-title')).toBe(BUILTIN_LABELS[activePanel]);
    expect(screen.getByTestId(testId)).toBeDefined();
  });

  it('renders custom panel entry with provided title and content', () => {
    render(
      <ViewerPanelSidebar
        panels={[
          {
            id: 'custom-panel',
            icon: null,
            label: 'Custom Panel',
            render: () => <div data-testid="custom-content" />,
          },
        ]}
        activePanel="custom-panel"
        onClose={() => {}}
        panelContainerRef={createRef<HTMLDivElement>()}
        renderThumbnails={() => <div data-testid="thumb-slot" />}
        renderBookmarks={() => <div data-testid="bookmark-slot" />}
      />,
    );

    expect(screen.getByTestId('sidebar-panel').getAttribute('data-title')).toBe('Custom Panel');
    expect(screen.getByTestId('custom-content')).toBeDefined();
  });

  it('attaches panelContainerRef and className to the root wrapper', () => {
    const panelContainerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <ViewerPanelSidebar
        panels={['annotations']}
        activePanel="annotations"
        onClose={() => {}}
        panelContainerRef={panelContainerRef}
        className="panel-wrapper"
        renderThumbnails={() => <div data-testid="thumb-slot" />}
        renderBookmarks={() => <div data-testid="bookmark-slot" />}
      />,
    );

    const root = container.firstElementChild as HTMLDivElement | null;
    expect(root).not.toBeNull();
    expect(root).toBe(panelContainerRef.current);
    expect(root?.className).toBe('panel-wrapper');
    expect(root?.style.height).toBe('100%');
  });

  it('applies panelContainerId to the root wrapper id', () => {
    const { container } = render(
      <ViewerPanelSidebar
        panels={['annotations']}
        activePanel="annotations"
        onClose={() => {}}
        panelContainerId="sidebar-container-id"
        panelContainerRef={createRef<HTMLDivElement>()}
        renderThumbnails={() => <div data-testid="thumb-slot" />}
        renderBookmarks={() => <div data-testid="bookmark-slot" />}
      />,
    );

    const root = container.firstElementChild as HTMLDivElement | null;
    expect(root?.id).toBe('sidebar-container-id');
  });
});
