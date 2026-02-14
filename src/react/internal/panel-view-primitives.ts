'use client';

import type { CSSProperties } from 'react';

const PANEL_STACK_4_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };

const PANEL_STACK_12_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px' };

const PANEL_ROW_BETWEEN_CENTER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const PANEL_ROW_ALIGN_CENTER_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px' };

const PANEL_TEXT_MUTED_12_STYLE: CSSProperties = {
  fontSize: '12px',
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
};

const PANEL_TEXT_MUTED_11_STYLE: CSSProperties = {
  fontSize: '11px',
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
};

const PANEL_BADGE_PILL_STYLE: CSSProperties = {
  display: 'inline-block',
  borderRadius: '9999px',
  fontSize: '11px',
  padding: '2px 8px',
  fontWeight: 600,
};

const PANEL_BADGE_TAG_STYLE: CSSProperties = {
  display: 'inline-block',
  borderRadius: '4px',
  fontSize: '10px',
  padding: '1px 6px',
  backgroundColor: 'var(--pdfium-panel-badge-bg, #e5e7eb)',
  color: 'var(--pdfium-panel-badge-colour, #374151)',
};

const PANEL_SELECTABLE_ITEM_BASE_STYLE: CSSProperties = {
  width: '100%',
  textAlign: 'left',
  fontSize: '12px',
  padding: '6px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  font: 'inherit',
  transition: 'background-color 150ms ease, border-color 150ms ease',
};

const PANEL_ICON_GHOST_BUTTON_STYLE: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px',
  lineHeight: 1,
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
};

const PANEL_ELLIPSIS_MONO_TEXT_STYLE: CSSProperties = {
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export {
  PANEL_BADGE_PILL_STYLE,
  PANEL_BADGE_TAG_STYLE,
  PANEL_ELLIPSIS_MONO_TEXT_STYLE,
  PANEL_ICON_GHOST_BUTTON_STYLE,
  PANEL_ROW_ALIGN_CENTER_STYLE,
  PANEL_ROW_BETWEEN_CENTER_STYLE,
  PANEL_SELECTABLE_ITEM_BASE_STYLE,
  PANEL_STACK_12_STYLE,
  PANEL_STACK_4_STYLE,
  PANEL_TEXT_MUTED_11_STYLE,
  PANEL_TEXT_MUTED_12_STYLE,
};
