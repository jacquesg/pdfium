'use client';

import type { CSSProperties } from 'react';
import {
  PANEL_BADGE_PILL_STYLE,
  PANEL_BADGE_TAG_STYLE,
  PANEL_ELLIPSIS_MONO_TEXT_STYLE,
  PANEL_ICON_GHOST_BUTTON_STYLE,
  PANEL_ROW_BETWEEN_CENTER_STYLE,
  PANEL_SELECTABLE_ITEM_BASE_STYLE,
  PANEL_STACK_4_STYLE,
  PANEL_STACK_12_STYLE,
  PANEL_TEXT_MUTED_11_STYLE,
  PANEL_TEXT_MUTED_12_STYLE,
} from './panel-view-primitives.js';

const OBJECT_LIST_CONTAINER_STYLE: CSSProperties = { ...PANEL_STACK_4_STYLE };

const OBJECT_LIST_ITEM_BASE_STYLE: CSSProperties = {
  ...PANEL_SELECTABLE_ITEM_BASE_STYLE,
  display: 'block',
  color: 'var(--pdfium-panel-colour, #374151)',
};

const OBJECT_LIST_ITEM_HEADER_STYLE: CSSProperties = { ...PANEL_ROW_BETWEEN_CENTER_STYLE };

const OBJECT_TYPE_BADGE_STYLE: CSSProperties = {
  ...PANEL_BADGE_PILL_STYLE,
};

const OBJECT_INDEX_LABEL_STYLE: CSSProperties = { ...PANEL_TEXT_MUTED_11_STYLE };

const OBJECT_BOUNDS_LABEL_STYLE: CSSProperties = {
  color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
  marginTop: '4px',
};

const OBJECT_TEXT_PREVIEW_STYLE: CSSProperties = {
  ...PANEL_ELLIPSIS_MONO_TEXT_STYLE,
  marginTop: '4px',
  color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
};

const OBJECT_TRUNCATION_CONTAINER_STYLE: CSSProperties = { padding: '8px', textAlign: 'center' };

const OBJECT_TRUNCATION_TEXT_STYLE: CSSProperties = { ...PANEL_TEXT_MUTED_12_STYLE };

const OBJECT_TRUNCATION_BUTTON_STYLE: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  color: 'var(--pdfium-panel-item-active-colour, #1d4ed8)',
  textDecoration: 'underline',
  padding: 0,
  font: 'inherit',
};

const OBJECT_DETAIL_HEADER_STYLE: CSSProperties = {
  ...PANEL_ROW_BETWEEN_CENTER_STYLE,
  marginBottom: '8px',
};

const OBJECT_DETAIL_TITLE_STYLE: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--pdfium-panel-colour, #374151)',
};

const OBJECT_DETAIL_CLOSE_STYLE: CSSProperties = {
  ...PANEL_ICON_GHOST_BUTTON_STYLE,
  fontSize: '14px',
};

const OBJECT_DETAIL_STACK_STYLE: CSSProperties = { ...PANEL_STACK_12_STYLE };

const OBJECT_MARK_STYLE: CSSProperties = {
  fontSize: '12px',
  backgroundColor: 'var(--pdfium-panel-surface-colour, #f9fafb)',
  padding: '4px 8px',
  borderRadius: '4px',
  marginBottom: '4px',
  color: 'var(--pdfium-panel-colour, #374151)',
};

const OBJECT_MARK_NAME_STYLE: CSSProperties = { fontFamily: 'monospace', fontWeight: 700 };

const OBJECT_MARK_PARAMS_STYLE: CSSProperties = {
  marginLeft: '12px',
  color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
};

const OBJECT_TEXT_BODY_STYLE: CSSProperties = {
  fontSize: '12px',
  backgroundColor: 'var(--pdfium-panel-highlight-bg, #eff6ff)',
  padding: '8px',
  marginBottom: '8px',
  wordBreak: 'break-word',
  color: 'var(--pdfium-panel-colour, #374151)',
};

const OBJECT_FLAG_CONTAINER_STYLE: CSSProperties = { ...PANEL_STACK_4_STYLE, flexDirection: 'row', flexWrap: 'wrap' };

const OBJECT_FLAG_BADGE_STYLE: CSSProperties = {
  ...PANEL_BADGE_TAG_STYLE,
};

const OBJECT_SEGMENTS_CONTAINER_STYLE: CSSProperties = { marginTop: '8px' };

const OBJECT_SEGMENTS_LIST_STYLE: CSSProperties = {
  maxHeight: '160px',
  overflowY: 'auto',
  padding: '4px',
  color: 'var(--pdfium-panel-colour, #374151)',
};

const OBJECT_SEGMENT_ROW_STYLE: CSSProperties = { display: 'flex', gap: '8px' };

const OBJECT_SEGMENT_TYPE_STYLE: CSSProperties = {
  color: 'var(--pdfium-panel-accent-colour, #3b82f6)',
  width: '48px',
  flexShrink: 0,
};

const OBJECT_SEGMENT_CLOSE_STYLE: CSSProperties = { color: 'var(--pdfium-panel-danger-colour, #991b1b)' };

export {
  OBJECT_BOUNDS_LABEL_STYLE,
  OBJECT_DETAIL_CLOSE_STYLE,
  OBJECT_DETAIL_HEADER_STYLE,
  OBJECT_DETAIL_STACK_STYLE,
  OBJECT_DETAIL_TITLE_STYLE,
  OBJECT_FLAG_BADGE_STYLE,
  OBJECT_FLAG_CONTAINER_STYLE,
  OBJECT_INDEX_LABEL_STYLE,
  OBJECT_LIST_CONTAINER_STYLE,
  OBJECT_LIST_ITEM_BASE_STYLE,
  OBJECT_LIST_ITEM_HEADER_STYLE,
  OBJECT_MARK_NAME_STYLE,
  OBJECT_MARK_PARAMS_STYLE,
  OBJECT_MARK_STYLE,
  OBJECT_SEGMENT_CLOSE_STYLE,
  OBJECT_SEGMENT_ROW_STYLE,
  OBJECT_SEGMENT_TYPE_STYLE,
  OBJECT_SEGMENTS_CONTAINER_STYLE,
  OBJECT_SEGMENTS_LIST_STYLE,
  OBJECT_TEXT_BODY_STYLE,
  OBJECT_TEXT_PREVIEW_STYLE,
  OBJECT_TRUNCATION_BUTTON_STYLE,
  OBJECT_TRUNCATION_CONTAINER_STYLE,
  OBJECT_TRUNCATION_TEXT_STYLE,
  OBJECT_TYPE_BADGE_STYLE,
};
