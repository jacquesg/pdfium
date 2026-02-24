import type { CSSProperties } from 'react';
import {
  PANEL_BADGE_PILL_STYLE,
  PANEL_BADGE_TAG_STYLE,
  PANEL_ICON_GHOST_BUTTON_STYLE,
  PANEL_ROW_ALIGN_CENTER_STYLE,
  PANEL_ROW_BETWEEN_CENTER_STYLE,
  PANEL_SELECTABLE_ITEM_BASE_STYLE,
  PANEL_STACK_4_STYLE,
  PANEL_TEXT_MUTED_12_STYLE,
} from './panel-view-primitives.js';

const FLAG_BADGES_EMPTY_STYLE: CSSProperties = {
  ...PANEL_TEXT_MUTED_12_STYLE,
  fontStyle: 'italic',
};

const FLAG_BADGES_CONTAINER_STYLE: CSSProperties = {
  ...PANEL_STACK_4_STYLE,
  flexDirection: 'row',
  flexWrap: 'wrap',
};

const FLAG_BADGE_STYLE: CSSProperties = {
  ...PANEL_BADGE_TAG_STYLE,
  padding: '2px 6px',
};

const GROUP_CONTAINER_STYLE: CSSProperties = { marginBottom: '4px' };

const GROUP_HEADER_BUTTON_STYLE: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
  backgroundColor: 'var(--pdfium-panel-section-bg, #f9fafb)',
  padding: '6px 8px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
};

const GROUP_HEADER_META_STYLE: CSSProperties = { ...PANEL_ROW_ALIGN_CENTER_STYLE };

const GROUP_COUNT_BADGE_STYLE: CSSProperties = {
  ...PANEL_BADGE_PILL_STYLE,
  backgroundColor: 'var(--pdfium-panel-badge-bg, #e5e7eb)',
  color: 'var(--pdfium-panel-badge-colour, #374151)',
  fontFamily: 'monospace',
};

const GROUP_CHEVRON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  transition: 'transform 150ms ease',
  opacity: 0.65,
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
};

const GROUP_ITEMS_CONTAINER_STYLE: CSSProperties = { ...PANEL_STACK_4_STYLE, marginTop: '2px' };

const GROUP_ITEM_BASE_STYLE: CSSProperties = { ...PANEL_SELECTABLE_ITEM_BASE_STYLE };

const GROUP_ITEM_ROW_STYLE: CSSProperties = { ...PANEL_ROW_BETWEEN_CENTER_STYLE };

const GROUP_ITEM_INDEX_STYLE: CSSProperties = { fontFamily: 'monospace' };

const GROUP_ITEM_BOUNDS_STYLE: CSSProperties = {
  fontSize: '10px',
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginLeft: '8px',
  maxWidth: '140px',
};

const GROUP_ITEM_CONTENTS_STYLE: CSSProperties = {
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginTop: '2px',
  fontSize: '10px',
};

const DETAIL_ROOT_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px' };

const DETAIL_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
};

const DETAIL_TITLE_STYLE: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--pdfium-panel-colour, #374151)',
  margin: 0,
};

const DETAIL_CLOSE_BUTTON_STYLE: CSSProperties = {
  ...PANEL_ICON_GHOST_BUTTON_STYLE,
};

const DETAIL_STACK_4_STYLE: CSSProperties = { ...PANEL_STACK_4_STYLE };

const DETAIL_MUTED_LABEL_STYLE: CSSProperties = { ...PANEL_TEXT_MUTED_12_STYLE };

const DETAIL_BLOCK_SCROLL_128_STYLE: CSSProperties = { maxHeight: '128px', overflowY: 'auto' };

const DETAIL_BLOCK_SCROLL_160_STYLE: CSSProperties = { maxHeight: '160px', overflowY: 'auto' };

const DETAIL_BLOCK_SCROLL_112_STYLE: CSSProperties = { maxHeight: '112px', overflowY: 'auto', marginTop: '4px' };

const DETAIL_OPTIONS_ROW_STYLE: CSSProperties = { ...PANEL_ROW_ALIGN_CENTER_STYLE };

const DETAIL_SELECTED_BADGE_STYLE: CSSProperties = {
  color: 'var(--pdfium-panel-badge-success-colour, #166534)',
  fontWeight: 600,
  fontSize: '9px',
};

export {
  DETAIL_BLOCK_SCROLL_112_STYLE,
  DETAIL_BLOCK_SCROLL_128_STYLE,
  DETAIL_BLOCK_SCROLL_160_STYLE,
  DETAIL_CLOSE_BUTTON_STYLE,
  DETAIL_HEADER_STYLE,
  DETAIL_MUTED_LABEL_STYLE,
  DETAIL_OPTIONS_ROW_STYLE,
  DETAIL_ROOT_STYLE,
  DETAIL_SELECTED_BADGE_STYLE,
  DETAIL_STACK_4_STYLE,
  DETAIL_TITLE_STYLE,
  FLAG_BADGE_STYLE,
  FLAG_BADGES_CONTAINER_STYLE,
  FLAG_BADGES_EMPTY_STYLE,
  GROUP_CHEVRON_STYLE,
  GROUP_CONTAINER_STYLE,
  GROUP_COUNT_BADGE_STYLE,
  GROUP_HEADER_BUTTON_STYLE,
  GROUP_HEADER_META_STYLE,
  GROUP_ITEM_BASE_STYLE,
  GROUP_ITEM_BOUNDS_STYLE,
  GROUP_ITEM_CONTENTS_STYLE,
  GROUP_ITEM_INDEX_STYLE,
  GROUP_ITEM_ROW_STYLE,
  GROUP_ITEMS_CONTAINER_STYLE,
};
