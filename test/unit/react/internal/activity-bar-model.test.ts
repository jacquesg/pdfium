import { describe, expect, it } from 'vitest';
import type { PanelEntry } from '../../../../src/react/components/panels/types.js';
import {
  buildActivityBarItems,
  resolveActivityBarFocusTarget,
  resolveActivityBarTabIndex,
} from '../../../../src/react/internal/activity-bar-model.js';

describe('activity-bar-model', () => {
  it('resolves keyboard focus targets with wrap-around', () => {
    expect(resolveActivityBarFocusTarget('ArrowDown', 0, 3)).toBe(1);
    expect(resolveActivityBarFocusTarget('ArrowDown', 2, 3)).toBe(0);
    expect(resolveActivityBarFocusTarget('ArrowUp', 0, 3)).toBe(2);
    expect(resolveActivityBarFocusTarget('Home', 2, 3)).toBe(0);
    expect(resolveActivityBarFocusTarget('End', 0, 3)).toBe(2);
    expect(resolveActivityBarFocusTarget('Escape', 0, 3)).toBeNull();
  });

  it('computes roving tabindex values from active panel state', () => {
    expect(resolveActivityBarTabIndex('objects', false, 0)).toBe(-1);
    expect(resolveActivityBarTabIndex('objects', true, 1)).toBe(0);
    expect(resolveActivityBarTabIndex(null, false, 0)).toBe(0);
    expect(resolveActivityBarTabIndex(null, false, 2)).toBe(-1);
  });

  it('builds item models with labels, active state, and bookmark separator markers', () => {
    const panels: PanelEntry[] = ['thumbnails', 'bookmarks', 'annotations'];
    const items = buildActivityBarItems(panels, 'annotations');

    expect(items.map((item) => item.id)).toEqual(['thumbnails', 'bookmarks', 'annotations']);
    expect(items.map((item) => item.label)).toEqual(['Thumbnails', 'Bookmarks', 'Annotations']);
    expect(items.map((item) => item.isActive)).toEqual([false, false, true]);
    expect(items.map((item) => item.showSeparatorBefore)).toEqual([false, false, true]);
  });
});
