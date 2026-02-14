'use client';

import type { CSSProperties } from 'react';
import {
  BOOKMARK_TREE_GLYPH_SIZE,
  BOOKMARK_TREE_ITEM_FONT_SIZE,
  BOOKMARK_TREE_ITEM_PADDING,
  BOOKMARK_TREE_PAGE_BADGE_FONT_SIZE,
  BOOKMARK_TREE_PAGE_BADGE_PADDING_LEFT,
  BOOKMARK_TREE_TRANSITION,
  getBookmarkTreeItemPaddingLeft,
} from './bookmark-style-tokens.js';

const BOOKMARK_NODE_ITEM_BASE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  textAlign: 'left',
  padding: BOOKMARK_TREE_ITEM_PADDING,
  fontWeight: 'normal',
  color: 'inherit',
  fontSize: BOOKMARK_TREE_ITEM_FONT_SIZE,
};

const BOOKMARK_NODE_TOGGLE_BASE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: BOOKMARK_TREE_GLYPH_SIZE,
  height: BOOKMARK_TREE_GLYPH_SIZE,
  flexShrink: 0,
  transition: BOOKMARK_TREE_TRANSITION,
  opacity: 0.65,
};

const BOOKMARK_NODE_LEAF_PLACEHOLDER_STYLE: CSSProperties = {
  width: BOOKMARK_TREE_GLYPH_SIZE,
  flexShrink: 0,
};

const BOOKMARK_NODE_TITLE_STYLE: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const BOOKMARK_NODE_PAGE_BADGE_STYLE: CSSProperties = {
  marginLeft: 'auto',
  flexShrink: 0,
  fontSize: BOOKMARK_TREE_PAGE_BADGE_FONT_SIZE,
  color: 'var(--pdfium-panel-muted-colour, #6b7280)',
  paddingLeft: BOOKMARK_TREE_PAGE_BADGE_PADDING_LEFT,
};

function getBookmarkNodeItemStyle({
  depth,
  isActive,
  isInteractive,
}: {
  depth: number;
  isActive: boolean;
  isInteractive: boolean;
}): CSSProperties {
  return {
    ...BOOKMARK_NODE_ITEM_BASE_STYLE,
    cursor: isInteractive ? 'pointer' : 'default',
    paddingLeft: getBookmarkTreeItemPaddingLeft(depth),
    backgroundColor: isActive ? 'var(--pdfium-panel-item-active-bg, #eff6ff)' : 'transparent',
    borderLeft: isActive ? '2px solid var(--pdfium-panel-item-active-border, #93c5fd)' : '2px solid transparent',
  };
}

function getBookmarkNodeToggleStyle(isExpanded: boolean): CSSProperties {
  return {
    ...BOOKMARK_NODE_TOGGLE_BASE_STYLE,
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
  };
}

export {
  BOOKMARK_NODE_ITEM_BASE_STYLE,
  BOOKMARK_NODE_LEAF_PLACEHOLDER_STYLE,
  BOOKMARK_NODE_PAGE_BADGE_STYLE,
  BOOKMARK_NODE_TITLE_STYLE,
  BOOKMARK_NODE_TOGGLE_BASE_STYLE,
  getBookmarkNodeItemStyle,
  getBookmarkNodeToggleStyle,
};
