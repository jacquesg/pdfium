import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TabDef } from '../../../../src/react/internal/panel-tabs.js';
import { PanelTabs } from '../../../../src/react/internal/panel-tabs.js';

const tabs: TabDef[] = [
  { id: 'info', label: 'Information' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'attachments', label: 'Attachments' },
];

function getTabIds(): string[] {
  return screen
    .getAllByRole('tab')
    .map((tab) => tab.getAttribute('id'))
    .filter((id): id is string => typeof id === 'string');
}

describe('PanelTabs', () => {
  it('renders tablist, tabs, and the active tabpanel', () => {
    render(
      <PanelTabs tabs={tabs} activeTab="info" onChange={vi.fn()}>
        <p>Info content</p>
      </PanelTabs>,
    );

    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel')).toBeDefined();
  });

  it('marks only the active tab as selected and focusable', () => {
    render(
      <PanelTabs tabs={tabs} activeTab="bookmarks" onChange={vi.fn()}>
        <p>Bookmark content</p>
      </PanelTabs>,
    );

    const [info, bookmarks, attachments] = screen.getAllByRole('tab');
    expect(info?.getAttribute('aria-selected')).toBe('false');
    expect(bookmarks?.getAttribute('aria-selected')).toBe('true');
    expect(attachments?.getAttribute('aria-selected')).toBe('false');
    expect(info?.getAttribute('tabindex')).toBe('-1');
    expect(bookmarks?.getAttribute('tabindex')).toBe('0');
    expect(attachments?.getAttribute('tabindex')).toBe('-1');
  });

  it('wires aria-controls and aria-labelledby to matching generated ids', () => {
    render(
      <PanelTabs tabs={tabs} activeTab="info" onChange={vi.fn()}>
        <p>Info content</p>
      </PanelTabs>,
    );

    const tab = screen.getByRole('tab', { name: 'Information' });
    const panel = screen.getByRole('tabpanel');
    expect(tab.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'));
  });

  it('invokes onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    render(
      <PanelTabs tabs={tabs} activeTab="info" onChange={onChange}>
        <p>Info content</p>
      </PanelTabs>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Bookmarks' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('bookmarks');
  });

  it('handles ArrowRight keyboard navigation and moves focus', () => {
    const onChange = vi.fn();
    render(
      <PanelTabs tabs={tabs} activeTab="attachments" onChange={onChange}>
        <p>Content</p>
      </PanelTabs>,
    );

    const tablist = screen.getByRole('tablist');
    const infoTab = screen.getByRole('tab', { name: 'Information' });

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('info');
    expect(document.activeElement).toBe(infoTab);
  });

  it('handles ArrowLeft keyboard navigation and moves focus', () => {
    const onChange = vi.fn();
    render(
      <PanelTabs tabs={tabs} activeTab="info" onChange={onChange}>
        <p>Content</p>
      </PanelTabs>,
    );

    const tablist = screen.getByRole('tablist');
    const attachmentsTab = screen.getByRole('tab', { name: 'Attachments' });

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('attachments');
    expect(document.activeElement).toBe(attachmentsTab);
  });

  it('handles Home and End keyboard navigation', () => {
    const onChange = vi.fn();
    render(
      <PanelTabs tabs={tabs} activeTab="bookmarks" onChange={onChange}>
        <p>Content</p>
      </PanelTabs>,
    );

    const tablist = screen.getByRole('tablist');
    const infoTab = screen.getByRole('tab', { name: 'Information' });
    const attachmentsTab = screen.getByRole('tab', { name: 'Attachments' });

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('info');
    expect(document.activeElement).toBe(infoTab);

    fireEvent.keyDown(tablist, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('attachments');
    expect(document.activeElement).toBe(attachmentsTab);
  });

  it('renders one tabpanel for the current active tab only', () => {
    const { rerender } = render(
      <PanelTabs tabs={tabs} activeTab="info" onChange={vi.fn()}>
        <p>Info panel content</p>
      </PanelTabs>,
    );

    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    const firstPanel = screen.getByRole('tabpanel');
    expect(firstPanel.textContent).toContain('Info panel content');

    rerender(
      <PanelTabs tabs={tabs} activeTab="bookmarks" onChange={vi.fn()}>
        <p>Bookmarks panel content</p>
      </PanelTabs>,
    );

    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    const secondPanel = screen.getByRole('tabpanel');
    expect(secondPanel.textContent).toContain('Bookmarks panel content');
  });

  it('keeps ARIA ids unique when two tabsets are rendered with the same tab ids', () => {
    render(
      <div>
        <PanelTabs tabs={tabs} activeTab="info" onChange={vi.fn()}>
          <p>First</p>
        </PanelTabs>
        <PanelTabs tabs={tabs} activeTab="bookmarks" onChange={vi.fn()}>
          <p>Second</p>
        </PanelTabs>
      </div>,
    );

    const tabIds = getTabIds();
    expect(new Set(tabIds).size).toBe(tabIds.length);

    const panels = screen.getAllByRole('tabpanel');
    const panelIds = panels
      .map((panel) => panel.getAttribute('id'))
      .filter((id): id is string => typeof id === 'string');
    expect(new Set(panelIds).size).toBe(panelIds.length);
  });

  it('supports duplicate tab labels while preserving id/control uniqueness', () => {
    const duplicateLabelTabs: TabDef[] = [
      { id: 'first', label: 'Details' },
      { id: 'second', label: 'Details' },
    ];

    render(
      <PanelTabs tabs={duplicateLabelTabs} activeTab="first" onChange={vi.fn()}>
        <p>Details panel</p>
      </PanelTabs>,
    );

    const detailTabs = screen.getAllByRole('tab', { name: 'Details' });
    expect(detailTabs).toHaveLength(2);
    expect(detailTabs[0]?.getAttribute('id')).not.toBe(detailTabs[1]?.getAttribute('id'));
    expect(detailTabs[0]?.getAttribute('aria-controls')).not.toBe(detailTabs[1]?.getAttribute('aria-controls'));
  });
});
