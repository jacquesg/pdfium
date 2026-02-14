import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ActivityBar } from '../../../../src/react/components/activity-bar.js';
import type { PanelEntry } from '../../../../src/react/components/panels/types.js';
import { ViewerPanelSidebar } from '../../../../src/react/components/viewer-panel-sidebar.js';
import { PanelTabs } from '../../../../src/react/internal/panel-tabs.js';

function EmbeddedTabsPanel() {
  const [activeTab, setActiveTab] = useState<'one' | 'two'>('one');

  return (
    <PanelTabs
      tabs={[
        { id: 'one', label: 'Tab One' },
        { id: 'two', label: 'Tab Two' },
      ]}
      activeTab={activeTab}
      onChange={(tabId) => {
        if (tabId === 'one' || tabId === 'two') {
          setActiveTab(tabId);
        }
      }}
    >
      <div data-testid={`tab-content-${activeTab}`}>{activeTab}</div>
    </PanelTabs>
  );
}

function ViewerShellHarness() {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const panelContainerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelContainerId = 'viewer-shell-panel-container';

  const panels: readonly PanelEntry[] = [
    {
      id: 'custom-tabs',
      label: 'Custom Tabs',
      icon: <span aria-hidden="true">C</span>,
      render: () => <EmbeddedTabsPanel />,
    },
    {
      id: 'secondary',
      label: 'Secondary',
      icon: <span aria-hidden="true">S</span>,
      render: () => <div data-testid="secondary-panel">secondary</div>,
    },
  ];

  const handleTogglePanel = (panelId: string) => {
    setActivePanel((current) => (current === panelId ? null : panelId));
  };

  const handleClosePanel = () => {
    setActivePanel(null);
    lastFocusedButtonRef.current?.focus();
  };

  return (
    <div>
      <ActivityBar
        panels={panels}
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        panelContainerId={panelContainerId}
        lastFocusedButtonRef={lastFocusedButtonRef}
      />
      {activePanel !== null && (
        <ViewerPanelSidebar
          panels={panels}
          activePanel={activePanel}
          onClose={handleClosePanel}
          panelContainerId={panelContainerId}
          panelContainerRef={panelContainerRef}
          renderThumbnails={() => <div />}
          renderBookmarks={() => <div />}
        />
      )}
    </div>
  );
}

describe('viewer shell interactions', () => {
  it('supports keyboard roving in activity bar and opens selected panel', () => {
    render(<ViewerShellHarness />);

    const customButton = screen.getByRole('button', { name: 'Custom Tabs' });
    const secondaryButton = screen.getByRole('button', { name: 'Secondary' });

    customButton.focus();
    fireEvent.keyDown(customButton, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(secondaryButton);

    fireEvent.click(customButton);
    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.getByTestId('tab-content-one')).toBeDefined();
    expect(customButton.getAttribute('aria-controls')).toBe('viewer-shell-panel-container');
    expect(screen.getByRole('button', { name: 'Close panel' }).closest('div')?.id).toBe('viewer-shell-panel-container');
  });

  it('supports tab keyboard navigation inside sidebar and restores focus on close', () => {
    render(<ViewerShellHarness />);

    const customButton = screen.getByRole('button', { name: 'Custom Tabs' });
    fireEvent.click(customButton);

    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });

    const tabTwo = screen.getByRole('tab', { name: 'Tab Two' });
    expect(tabTwo.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('tab-content-two')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(document.activeElement).toBe(customButton);
  });
});
