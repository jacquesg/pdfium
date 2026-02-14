'use client';

import type { CSSProperties } from 'react';
import {
  BOOKMARK_TREE_FILTER_COUNT_FONT_SIZE,
  BOOKMARK_TREE_FILTER_COUNT_PADDING,
  BOOKMARK_TREE_FILTER_INPUT_FONT_SIZE,
  BOOKMARK_TREE_FILTER_INPUT_PADDING,
  BOOKMARK_TREE_GROUP_PADDING,
} from './bookmark-style-tokens.js';

const BOOKMARK_PANEL_CONTAINER_STYLE: CSSProperties = {
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const BOOKMARK_PANEL_FILTER_INPUT_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: BOOKMARK_TREE_FILTER_INPUT_PADDING,
  border: 'none',
  borderBottom: '1px solid var(--pdfium-search-input-border, #d1d5db)',
  background: 'var(--pdfium-search-input-bg, #ffffff)',
  color: 'inherit',
  fontSize: BOOKMARK_TREE_FILTER_INPUT_FONT_SIZE,
};

const BOOKMARK_PANEL_FILTER_COUNT_STYLE: CSSProperties = {
  fontSize: BOOKMARK_TREE_FILTER_COUNT_FONT_SIZE,
  padding: BOOKMARK_TREE_FILTER_COUNT_PADDING,
  opacity: 0.5,
};

const BOOKMARK_PANEL_TREE_STYLE: CSSProperties = {
  flex: 1,
};

const BOOKMARK_PANEL_ROOT_GROUP_STYLE: CSSProperties = {
  padding: BOOKMARK_TREE_GROUP_PADDING,
};

export {
  BOOKMARK_PANEL_CONTAINER_STYLE,
  BOOKMARK_PANEL_FILTER_COUNT_STYLE,
  BOOKMARK_PANEL_FILTER_INPUT_STYLE,
  BOOKMARK_PANEL_ROOT_GROUP_STYLE,
  BOOKMARK_PANEL_TREE_STYLE,
};
