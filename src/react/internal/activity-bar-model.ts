'use client';

import type { PanelEntry } from '../components/panels/types.js';
import { getPanelId, getPanelLabel } from '../components/panels/types.js';

interface ActivityBarItemModel {
  entry: PanelEntry;
  id: string;
  label: string;
  isActive: boolean;
  tabIndex: number;
  showSeparatorBefore: boolean;
}

function buildActivityBarItems(panels: readonly PanelEntry[], activePanel: string | null): ActivityBarItemModel[] {
  return panels.map((entry, index) => {
    const id = getPanelId(entry);
    const previousEntry = index > 0 ? panels[index - 1] : undefined;
    const isActive = activePanel === id;

    return {
      entry,
      id,
      label: getPanelLabel(entry),
      isActive,
      tabIndex: resolveActivityBarTabIndex(activePanel, isActive, index),
      showSeparatorBefore: previousEntry !== undefined && getPanelId(previousEntry) === 'bookmarks',
    };
  });
}

function resolveActivityBarTabIndex(activePanel: string | null, isActive: boolean, index: number): 0 | -1 {
  if (isActive) return 0;
  if (activePanel === null && index === 0) return 0;
  return -1;
}

function resolveActivityBarFocusTarget(key: string, currentIndex: number, count: number): number | null {
  if (count <= 0) return null;

  switch (key) {
    case 'ArrowDown':
      return (currentIndex + 1) % count;
    case 'ArrowUp':
      return (currentIndex - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

export { buildActivityBarItems, resolveActivityBarFocusTarget, resolveActivityBarTabIndex };
export type { ActivityBarItemModel };
