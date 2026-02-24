// ---------------------------------------------------------------------------
// Shared table styles used by links-panel and structure-panel
// ---------------------------------------------------------------------------

const TABLE_STYLE = {
  width: '100%',
  fontSize: '13px',
  textAlign: 'left' as const,
  borderCollapse: 'collapse' as const,
  color: 'var(--pdfium-panel-colour, #374151)',
};

const TH_STYLE = {
  padding: '6px 8px',
  fontWeight: 600,
  fontSize: '12px',
  color: 'var(--pdfium-panel-secondary-colour, #6b7280)',
  borderBottom: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
  whiteSpace: 'nowrap' as const,
};

const TD_STYLE = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
  fontSize: '13px',
};

const MONO_STYLE = {
  ...TD_STYLE,
  fontFamily: 'monospace',
  fontSize: '12px',
};

const PAGE_SELECT_STYLE = {
  boxSizing: 'border-box' as const,
  background: 'var(--pdfium-panel-input-bg, transparent)',
  color: 'var(--pdfium-panel-colour, #374151)',
  border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
  borderRadius: '4px',
  padding: '2px 6px',
  fontSize: '13px',
};

export { MONO_STYLE, PAGE_SELECT_STYLE, TABLE_STYLE, TD_STYLE, TH_STYLE };
