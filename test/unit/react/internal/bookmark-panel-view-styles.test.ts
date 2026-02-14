import { describe, expect, it } from 'vitest';
import {
  BOOKMARK_PANEL_CONTAINER_STYLE,
  BOOKMARK_PANEL_FILTER_COUNT_STYLE,
  BOOKMARK_PANEL_FILTER_INPUT_STYLE,
  BOOKMARK_PANEL_ROOT_GROUP_STYLE,
  BOOKMARK_PANEL_TREE_STYLE,
} from '../../../../src/react/internal/bookmark-panel-view-styles.js';

describe('bookmark-panel-view styles', () => {
  it('defines container and layout style contracts', () => {
    expect(BOOKMARK_PANEL_CONTAINER_STYLE.overflow).toBe('auto');
    expect(BOOKMARK_PANEL_CONTAINER_STYLE.display).toBe('flex');
    expect(BOOKMARK_PANEL_CONTAINER_STYLE.flexDirection).toBe('column');
    expect(BOOKMARK_PANEL_TREE_STYLE.flex).toBe(1);
    expect(BOOKMARK_PANEL_ROOT_GROUP_STYLE.padding).toBe('4px 0');
  });

  it('defines filter input and match-count styles', () => {
    expect(BOOKMARK_PANEL_FILTER_INPUT_STYLE.boxSizing).toBe('border-box');
    expect(BOOKMARK_PANEL_FILTER_INPUT_STYLE.borderBottom).toBe('1px solid var(--pdfium-search-input-border, #d1d5db)');
    expect(BOOKMARK_PANEL_FILTER_INPUT_STYLE.fontSize).toBe('0.8125em');
    expect(BOOKMARK_PANEL_FILTER_COUNT_STYLE.fontSize).toBe('0.75em');
    expect(BOOKMARK_PANEL_FILTER_COUNT_STYLE.opacity).toBe(0.5);
  });
});
