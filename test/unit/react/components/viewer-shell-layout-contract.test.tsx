import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelEntry } from '../../../../src/react/components/panels/types.js';
import { ViewerPanelLayout } from '../../../../src/react/components/viewer-shell-layout.js';
import type { UseResizeHandleProps } from '../../../../src/react/hooks/use-resize.js';

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

describe('ViewerPanelLayout contract', () => {
  it('links activity-bar button aria-controls to rendered panel container id', () => {
    const onTogglePanel = vi.fn();
    const panels: readonly PanelEntry[] = [
      {
        id: 'custom-panel',
        label: 'Custom Panel',
        icon: <span aria-hidden="true">C</span>,
        render: () => <div data-testid="custom-panel-content">content</div>,
      },
    ];

    const { container } = render(
      <ViewerPanelLayout
        fullscreenRef={createRef<HTMLDivElement>()}
        isResizing={false}
        toolbar={<div data-testid="toolbar" />}
        search={<div data-testid="search" />}
        panels={panels}
        activePanel="custom-panel"
        onTogglePanel={onTogglePanel}
        lastFocusedButtonRef={createRef<HTMLButtonElement>()}
        panelContainerRef={createRef<HTMLDivElement>()}
        sidebarWidth={280}
        resizeHandleProps={baseResizeHandleProps}
        pages={<div data-testid="pages" />}
        renderThumbnails={() => <div />}
        renderBookmarks={() => <div />}
      />,
    );

    const activityButton = screen.getByRole('button', { name: 'Custom Panel' });
    const panelContainer = container.querySelector('[data-pdfium-activity-bar] + div > div[id]') as HTMLElement | null;
    expect(panelContainer).not.toBeNull();
    expect(activityButton.getAttribute('aria-controls')).toBe(panelContainer?.id ?? null);
    expect(screen.getByTestId('custom-panel-content')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onTogglePanel).toHaveBeenCalledWith('custom-panel');
  });
});
