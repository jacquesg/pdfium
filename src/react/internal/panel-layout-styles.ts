import type { CSSProperties } from 'react';

const PANEL_ROOT_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

const PANEL_SUMMARY_STYLE: CSSProperties = {
  padding: '6px 12px',
  fontSize: '12px',
  color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
  fontFamily: 'monospace',
  borderBottom: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
};

const PANEL_SCROLL_REGION_STYLE: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
  padding: '8px',
};

const PANEL_DETAIL_REGION_STYLE: CSSProperties = {
  borderTop: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
  padding: '12px',
  maxHeight: '45%',
  overflowY: 'auto',
};

const PANEL_SECTION_HEADING_STYLE: CSSProperties = {
  margin: '0 0 6px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
};

const PANEL_MONO_BLOCK_STYLE: CSSProperties = {
  fontSize: '10px',
  fontFamily: 'monospace',
  backgroundColor: 'var(--pdfium-panel-section-bg, #f9fafb)',
  padding: '6px',
  borderRadius: '4px',
};

export {
  PANEL_DETAIL_REGION_STYLE,
  PANEL_MONO_BLOCK_STYLE,
  PANEL_ROOT_CONTAINER_STYLE,
  PANEL_SCROLL_REGION_STYLE,
  PANEL_SECTION_HEADING_STYLE,
  PANEL_SUMMARY_STYLE,
};
