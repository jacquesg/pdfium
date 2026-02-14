import { describe, expect, it } from 'vitest';
import {
  BOOKMARK_TREE_FILTER_COUNT_FONT_SIZE,
  BOOKMARK_TREE_FILTER_COUNT_PADDING,
  BOOKMARK_TREE_FILTER_INPUT_FONT_SIZE,
  BOOKMARK_TREE_FILTER_INPUT_PADDING,
  BOOKMARK_TREE_GLYPH_SIZE,
  BOOKMARK_TREE_GROUP_PADDING,
  BOOKMARK_TREE_INDENT_VAR,
  BOOKMARK_TREE_ITEM_FONT_SIZE,
  BOOKMARK_TREE_ITEM_HORIZONTAL_PADDING,
  BOOKMARK_TREE_ITEM_PADDING,
  BOOKMARK_TREE_ITEM_VERTICAL_PADDING,
  BOOKMARK_TREE_PAGE_BADGE_FONT_SIZE,
  BOOKMARK_TREE_PAGE_BADGE_PADDING_LEFT,
  BOOKMARK_TREE_TRANSITION,
  getBookmarkTreeItemPaddingLeft,
} from '../../../../src/react/internal/bookmark-style-tokens.js';

describe('bookmark style tokens', () => {
  it('exposes stable spacing and sizing primitives', () => {
    expect(BOOKMARK_TREE_INDENT_VAR).toBe('var(--pdfium-bookmark-indent, 16px)');
    expect(BOOKMARK_TREE_GLYPH_SIZE).toBe(16);
    expect(BOOKMARK_TREE_TRANSITION).toBe('transform 0.15s ease');
    expect(BOOKMARK_TREE_ITEM_VERTICAL_PADDING).toBe('4px');
    expect(BOOKMARK_TREE_ITEM_HORIZONTAL_PADDING).toBe('8px');
    expect(BOOKMARK_TREE_ITEM_PADDING).toBe('4px 8px');
    expect(BOOKMARK_TREE_GROUP_PADDING).toBe('4px 0');
    expect(BOOKMARK_TREE_PAGE_BADGE_PADDING_LEFT).toBe(8);
  });

  it('exposes font-size and padding tokens used by node and panel view', () => {
    expect(BOOKMARK_TREE_ITEM_FONT_SIZE).toBe('0.875em');
    expect(BOOKMARK_TREE_PAGE_BADGE_FONT_SIZE).toBe('0.8em');
    expect(BOOKMARK_TREE_FILTER_INPUT_FONT_SIZE).toBe('0.8125em');
    expect(BOOKMARK_TREE_FILTER_COUNT_FONT_SIZE).toBe('0.75em');
    expect(BOOKMARK_TREE_FILTER_INPUT_PADDING).toBe('6px 10px');
    expect(BOOKMARK_TREE_FILTER_COUNT_PADDING).toBe('2px 8px');
  });

  it('builds depth-sensitive padding-left values', () => {
    expect(getBookmarkTreeItemPaddingLeft(0)).toBe('calc((var(--pdfium-bookmark-indent, 16px) * 0) + 8px)');
    expect(getBookmarkTreeItemPaddingLeft(3)).toBe('calc((var(--pdfium-bookmark-indent, 16px) * 3) + 8px)');
  });
});
