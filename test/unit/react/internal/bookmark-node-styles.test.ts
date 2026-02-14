import { describe, expect, it } from 'vitest';
import {
  BOOKMARK_NODE_ITEM_BASE_STYLE,
  BOOKMARK_NODE_LEAF_PLACEHOLDER_STYLE,
  BOOKMARK_NODE_PAGE_BADGE_STYLE,
  BOOKMARK_NODE_TITLE_STYLE,
  BOOKMARK_NODE_TOGGLE_BASE_STYLE,
  getBookmarkNodeItemStyle,
  getBookmarkNodeToggleStyle,
} from '../../../../src/react/internal/bookmark-node-styles.js';

describe('bookmark-node styles', () => {
  it('provides stable base style contracts for shared node elements', () => {
    expect(BOOKMARK_NODE_ITEM_BASE_STYLE.display).toBe('flex');
    expect(BOOKMARK_NODE_ITEM_BASE_STYLE.textAlign).toBe('left');
    expect(BOOKMARK_NODE_TOGGLE_BASE_STYLE.transition).toBe('transform 0.15s ease');
    expect(BOOKMARK_NODE_LEAF_PLACEHOLDER_STYLE.width).toBe(16);
    expect(BOOKMARK_NODE_TITLE_STYLE.whiteSpace).toBe('nowrap');
    expect(BOOKMARK_NODE_PAGE_BADGE_STYLE.marginLeft).toBe('auto');
  });

  it('builds item style with depth, activity, and interaction state', () => {
    const activeInteractive = getBookmarkNodeItemStyle({
      depth: 2,
      isActive: true,
      isInteractive: true,
    });
    const inactiveStatic = getBookmarkNodeItemStyle({
      depth: 0,
      isActive: false,
      isInteractive: false,
    });

    expect(activeInteractive.cursor).toBe('pointer');
    expect(activeInteractive.paddingLeft).toBe('calc((var(--pdfium-bookmark-indent, 16px) * 2) + 8px)');
    expect(activeInteractive.backgroundColor).toBe('var(--pdfium-panel-item-active-bg, #eff6ff)');
    expect(activeInteractive.borderLeft).toBe('2px solid var(--pdfium-panel-item-active-border, #93c5fd)');

    expect(inactiveStatic.cursor).toBe('default');
    expect(inactiveStatic.backgroundColor).toBe('transparent');
    expect(inactiveStatic.borderLeft).toBe('2px solid transparent');
  });

  it('builds toggle style transform based on expansion state', () => {
    expect(getBookmarkNodeToggleStyle(true).transform).toBe('rotate(90deg)');
    expect(getBookmarkNodeToggleStyle(false).transform).toBe('rotate(0deg)');
  });
});
