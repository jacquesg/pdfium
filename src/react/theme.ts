'use client';

// ---------------------------------------------------------------------------
// CSS Custom Property Theme System
// ---------------------------------------------------------------------------

interface ThemeVariable {
  light: string;
  dark: string;
  group: string;
}

/**
 * Complete catalogue of all CSS variables with their light/dark defaults.
 *
 * Components use `var(--pdfium-*, fallback)` in inline styles — the fallback
 * IS the light value. Consumers override any variable in their own CSS.
 * `applyPDFiumTheme('dark')` injects all dark values at once via `<style>`.
 */
const PDFIUM_THEME_VARIABLES: Record<string, ThemeVariable> = {
  // ── Page & Container ─────────────────────────────────────────────
  '--pdfium-container-bg': { light: '#e8eaed', dark: '#1a1a1a', group: 'Page & Container' },
  '--pdfium-page-bg': { light: '#ffffff', dark: '#2a2a2a', group: 'Page & Container' },
  '--pdfium-page-bg-loading': { light: '#f3f4f6', dark: '#333333', group: 'Page & Container' },
  '--pdfium-page-shadow': {
    light: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
    dark: '0 1px 4px rgba(0,0,0,0.5)',
    group: 'Page & Container',
  },
  '--pdfium-page-border': { light: 'none', dark: '1px solid #444', group: 'Page & Container' },
  '--pdfium-loading-colour': { light: 'inherit', dark: '#aaa', group: 'Page & Container' },

  // ── Toolbar ──────────────────────────────────────────────────────
  '--pdfium-toolbar-bg': { light: '#ffffff', dark: '#252525', group: 'Toolbar' },
  '--pdfium-toolbar-border': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Toolbar' },
  '--pdfium-toolbar-colour': { light: '#374151', dark: '#d1d5db', group: 'Toolbar' },
  '--pdfium-toolbar-btn-bg': { light: 'transparent', dark: 'transparent', group: 'Toolbar' },
  '--pdfium-toolbar-btn-hover-bg': { light: '#f3f4f6', dark: '#3a3a3a', group: 'Toolbar' },
  '--pdfium-toolbar-btn-active-bg': { light: '#e5e7eb', dark: '#4a4a4a', group: 'Toolbar' },
  '--pdfium-toolbar-btn-colour': { light: '#374151', dark: '#d1d5db', group: 'Toolbar' },
  '--pdfium-toolbar-btn-disabled': { light: '0.35', dark: '0.3', group: 'Toolbar' },
  '--pdfium-toolbar-separator': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Toolbar' },
  '--pdfium-toolbar-input-bg': { light: '#ffffff', dark: '#1e1e1e', group: 'Toolbar' },
  '--pdfium-toolbar-input-border': { light: '#d1d5db', dark: '#4a4a4a', group: 'Toolbar' },
  '--pdfium-toolbar-radius': { light: '4px', dark: '4px', group: 'Toolbar' },

  // ── Search ─────────────────────────────────────────────────────
  '--pdfium-search-bg': { light: '#ffffff', dark: '#252525', group: 'Search' },
  '--pdfium-search-border': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Search' },
  '--pdfium-search-input-bg': { light: '#ffffff', dark: '#1e1e1e', group: 'Search' },
  '--pdfium-search-input-border': { light: '#d1d5db', dark: '#4a4a4a', group: 'Search' },
  '--pdfium-search-badge-bg': { light: '#f3f4f6', dark: '#3a3a3a', group: 'Search' },
  '--pdfium-search-badge-colour': { light: '#6b7280', dark: '#9ca3af', group: 'Search' },

  // ── Sidebar ────────────────────────────────────────────────────
  '--pdfium-sidebar-bg': { light: '#ffffff', dark: '#1e1e1e', group: 'Sidebar' },
  '--pdfium-sidebar-border': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Sidebar' },
  '--pdfium-sidebar-header-bg': { light: '#f9fafb', dark: '#252525', group: 'Sidebar' },
  '--pdfium-sidebar-header-colour': { light: '#374151', dark: '#d1d5db', group: 'Sidebar' },
  '--pdfium-sidebar-header-border': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Sidebar' },

  // ── Bookmark ───────────────────────────────────────────────────
  '--pdfium-bookmark-indent': { light: '16px', dark: '16px', group: 'Bookmark' },
  '--pdfium-bookmark-active-colour': { light: '#3b82f6', dark: '#60a5fa', group: 'Bookmark' },

  // ── Thumbnail ──────────────────────────────────────────────────
  '--pdfium-thumb-active-colour': { light: '#3b82f6', dark: '#60a5fa', group: 'Thumbnail' },
  '--pdfium-thumb-shadow': {
    light: '0 0 0 1px rgba(0,0,0,0.1)',
    dark: '0 0 0 1px rgba(255,255,255,0.1)',
    group: 'Thumbnail',
  },
  '--pdfium-thumb-label-colour': { light: '#6b7280', dark: '#9ca3af', group: 'Thumbnail' },

  // ── Activity Bar ──────────────────────────────────────────────
  '--pdfium-activity-bar-bg': { light: '#f9fafb', dark: '#1a1a1a', group: 'Activity Bar' },
  '--pdfium-activity-bar-border': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Activity Bar' },
  '--pdfium-activity-bar-colour': { light: '#6b7280', dark: '#9ca3af', group: 'Activity Bar' },
  '--pdfium-activity-bar-hover-bg': { light: '#f3f4f6', dark: '#2a2a2a', group: 'Activity Bar' },
  '--pdfium-activity-bar-active-bg': { light: '#e5e7eb', dark: '#333333', group: 'Activity Bar' },
  '--pdfium-activity-bar-active-colour': { light: '#3b82f6', dark: '#60a5fa', group: 'Activity Bar' },
  '--pdfium-activity-bar-active-border': { light: '#3b82f6', dark: '#60a5fa', group: 'Activity Bar' },
  '--pdfium-activity-bar-width': { light: '40px', dark: '40px', group: 'Activity Bar' },

  // ── Panel Content ────────────────────────────────────────────
  '--pdfium-panel-colour': { light: '#374151', dark: '#d1d5db', group: 'Panel' },
  '--pdfium-panel-secondary-colour': { light: '#6b7280', dark: '#9ca3af', group: 'Panel' },
  '--pdfium-panel-muted-colour': { light: '#9ca3af', dark: '#6b7280', group: 'Panel' },
  '--pdfium-panel-section-bg': { light: '#f9fafb', dark: '#252525', group: 'Panel' },
  '--pdfium-panel-section-border': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Panel' },
  '--pdfium-panel-item-bg': { light: '#ffffff', dark: '#1e1e1e', group: 'Panel' },
  '--pdfium-panel-item-hover-bg': { light: '#f3f4f6', dark: '#2a2a2a', group: 'Panel' },
  '--pdfium-panel-item-active-bg': { light: '#eff6ff', dark: '#1e3a5f', group: 'Panel' },
  '--pdfium-panel-item-active-border': { light: '#93c5fd', dark: '#2563eb', group: 'Panel' },
  '--pdfium-panel-item-active-colour': { light: '#1d4ed8', dark: '#93c5fd', group: 'Panel' },
  '--pdfium-panel-badge-bg': { light: '#e5e7eb', dark: '#3a3a3a', group: 'Panel' },
  '--pdfium-panel-badge-colour': { light: '#374151', dark: '#d1d5db', group: 'Panel' },
  '--pdfium-panel-badge-success-bg': { light: '#dcfce7', dark: '#14532d', group: 'Panel' },
  '--pdfium-panel-badge-success-colour': { light: '#166534', dark: '#4ade80', group: 'Panel' },
  '--pdfium-panel-badge-error-bg': { light: '#fef2f2', dark: '#450a0a', group: 'Panel' },
  '--pdfium-panel-badge-error-colour': { light: '#991b1b', dark: '#fca5a5', group: 'Panel' },
  '--pdfium-panel-input-bg': { light: '#ffffff', dark: '#1e1e1e', group: 'Panel' },
  '--pdfium-panel-input-border': { light: '#d1d5db', dark: '#4a4a4a', group: 'Panel' },
  '--pdfium-panel-btn-bg': { light: '#3b82f6', dark: '#2563eb', group: 'Panel' },
  '--pdfium-panel-btn-colour': { light: '#ffffff', dark: '#ffffff', group: 'Panel' },
  '--pdfium-panel-btn-secondary-bg': { light: '#f3f4f6', dark: '#374151', group: 'Panel' },
  '--pdfium-panel-btn-secondary-colour': { light: '#374151', dark: '#d1d5db', group: 'Panel' },
  '--pdfium-panel-danger-bg': { light: '#fef2f2', dark: '#450a0a', group: 'Panel' },
  '--pdfium-panel-danger-colour': { light: '#991b1b', dark: '#fca5a5', group: 'Panel' },
  '--pdfium-panel-code-bg': { light: '#f3f4f6', dark: '#1a1a1a', group: 'Panel' },
  '--pdfium-panel-accent-colour': { light: '#3b82f6', dark: '#60a5fa', group: 'Panel' },
  '--pdfium-panel-accent-bg': { light: 'rgba(59,130,246,0.08)', dark: 'rgba(96,165,250,0.08)', group: 'Panel' },
  '--pdfium-panel-surface-colour': { light: '#ffffff', dark: '#252525', group: 'Panel' },
  '--pdfium-panel-selected-bg': { light: '#eff6ff', dark: '#1e3a5f', group: 'Panel' },
  '--pdfium-panel-highlight-bg': { light: '#eff6ff', dark: '#1e3a5f', group: 'Panel' },
  '--pdfium-panel-danger-border': { light: '#fecaca', dark: '#991b1b', group: 'Panel' },
  '--pdfium-panel-code-colour': { light: '#1f2937', dark: '#a3e635', group: 'Panel' },

  // ── Focus & Interaction ────────────────────────────────────────
  '--pdfium-focus-ring': {
    light: '0 0 0 2px rgba(59,130,246,0.5)',
    dark: '0 0 0 2px rgba(96,165,250,0.5)',
    group: 'Focus & Interaction',
  },
  // Consumer CSS override — not used internally (sidebar width is controlled by useResize)
  '--pdfium-sidebar-width': { light: '280px', dark: '280px', group: 'Sidebar' },

  // ── Badge Colours (type badges, flatten results) ─────────────────
  '--pdfium-badge-text-bg': { light: '#dbeafe', dark: '#1e3a5f', group: 'Panel' },
  '--pdfium-badge-text-colour': { light: '#1d4ed8', dark: '#93c5fd', group: 'Panel' },
  '--pdfium-badge-image-bg': { light: '#dcfce7', dark: '#14532d', group: 'Panel' },
  '--pdfium-badge-image-colour': { light: '#15803d', dark: '#4ade80', group: 'Panel' },
  '--pdfium-badge-path-bg': { light: '#fef9c3', dark: '#422006', group: 'Panel' },
  '--pdfium-badge-path-colour': { light: '#a16207', dark: '#fbbf24', group: 'Panel' },
  '--pdfium-badge-form-bg': { light: '#f3e8ff', dark: '#3b0764', group: 'Panel' },
  '--pdfium-badge-form-colour': { light: '#7e22ce', dark: '#c084fc', group: 'Panel' },
  '--pdfium-badge-shading-bg': { light: '#ffe4e6', dark: '#450a0a', group: 'Panel' },
  '--pdfium-badge-shading-colour': { light: '#be123c', dark: '#fca5a5', group: 'Panel' },
  '--pdfium-panel-badge-warning-bg': { light: '#fef9c3', dark: '#422006', group: 'Panel' },
  '--pdfium-panel-badge-warning-colour': { light: '#854d0e', dark: '#fbbf24', group: 'Panel' },
  '--pdfium-panel-badge-warning-border': { light: '#fde047', dark: '#a16207', group: 'Panel' },
  '--pdfium-panel-badge-success-border': { light: '#86efac', dark: '#15803d', group: 'Panel' },
  '--pdfium-panel-badge-error-border': { light: '#fca5a5', dark: '#991b1b', group: 'Panel' },
  '--pdfium-marquee-bg': {
    light: 'rgba(59,130,246,0.15)',
    dark: 'rgba(96,165,250,0.15)',
    group: 'Focus & Interaction',
  },
  '--pdfium-marquee-border': {
    light: 'rgba(59,130,246,0.5)',
    dark: 'rgba(96,165,250,0.5)',
    group: 'Focus & Interaction',
  },
};

type PDFiumThemeMode = 'light' | 'dark' | 'system';

const STYLE_ELEMENT_ID = 'pdfium-theme-style';

function buildDarkCSS(): string {
  const vars = Object.entries(PDFIUM_THEME_VARIABLES)
    .map(([key, { dark }]) => `  ${key}: ${dark};`)
    .join('\n');
  return `[data-pdfium-theme="dark"] {\n${vars}\n}`;
}

function buildSystemCSS(): string {
  const vars = Object.entries(PDFIUM_THEME_VARIABLES)
    .map(([key, { dark }]) => `  ${key}: ${dark};`)
    .join('\n');
  return `@media (prefers-color-scheme: dark) {\n  [data-pdfium-theme="system"] {\n${vars}\n  }\n}`;
}

function buildLightCSS(): string {
  const vars = Object.entries(PDFIUM_THEME_VARIABLES)
    .map(([key, { light }]) => `  ${key}: ${light};`)
    .join('\n');
  return `[data-pdfium-theme="light"] {\n${vars}\n}`;
}

const PAN_MODE_CSS = `[data-pdfium-interaction="pan"] .pdfium-text-layer { pointer-events: none !important; user-select: none !important; cursor: inherit !important; }
[data-pdfium-interaction="pan"] a { pointer-events: none !important; cursor: inherit !important; }
[data-pdfium-interaction="marquee"] .pdfium-text-layer { pointer-events: none !important; user-select: none !important; cursor: inherit !important; }
[data-pdfium-interaction="marquee"] a { pointer-events: none !important; cursor: inherit !important; }`;

const FOCUS_CSS = `[role="toolbar"] button:focus-visible,
[data-pdfium-sidebar] button:focus-visible,
[data-pdfium-activity-bar] button:focus-visible,
[role="toolbar"] select:focus-visible,
[role="toolbar"] input:focus-visible,
[data-pdfium-sidebar] [role="treeitem"]:focus-visible,
[data-pdfium-tree-id] [role="treeitem"]:focus-visible,
[role="tablist"] [role="tab"]:focus-visible {
  outline: none;
  box-shadow: var(--pdfium-focus-ring, 0 0 0 2px rgba(59,130,246,0.5));
}

[data-pdfium-resize-handle]:focus-visible {
  outline: none;
  box-shadow: var(--pdfium-focus-ring, 0 0 0 2px rgba(59,130,246,0.5));
}`;

const INTERACTIVE_CSS = `/* Toolbar buttons */
[role="toolbar"] button:not(:disabled):hover {
  background: var(--pdfium-toolbar-btn-hover-bg, #f3f4f6);
}
[role="toolbar"] button:not(:disabled):active {
  background: var(--pdfium-toolbar-btn-active-bg, #e5e7eb);
}

/* Toolbar selects & inputs */
[role="toolbar"] select:hover,
[role="toolbar"] input:hover {
  border-color: var(--pdfium-toolbar-btn-colour, #374151);
}

/* Activity bar buttons */
[data-pdfium-activity-bar] button:not([aria-pressed="true"]):hover {
  background: var(--pdfium-activity-bar-hover-bg, #f3f4f6);
}
[data-pdfium-activity-bar] button:not([aria-pressed="true"]):active {
  background: var(--pdfium-activity-bar-active-bg, #e5e7eb);
}

/* Sidebar close button */
[data-pdfium-sidebar] header button:hover {
  background: var(--pdfium-toolbar-btn-hover-bg, #f3f4f6);
}

/* Panel list items */
[data-pdfium-sidebar] button[data-panel-item]:hover {
  background: var(--pdfium-panel-item-hover-bg, #f3f4f6);
}

/* Bookmark tree items */
[data-pdfium-sidebar] [role="treeitem"]:hover {
  background: var(--pdfium-panel-item-hover-bg, #f3f4f6);
}

/* TreeView items (internal) */
[data-pdfium-tree-id] [role="treeitem"]:hover {
  background: var(--pdfium-panel-item-hover-bg, #f3f4f6);
}

/* Panel tabs */
[role="tablist"] [role="tab"]:hover {
  color: var(--pdfium-panel-colour, #374151);
}

/* Thumbnail buttons */
[role="listbox"] [role="option"]:hover {
  outline-color: var(--pdfium-thumb-active-colour, #3b82f6) !important;
}

/* Collapsible section toggles */
[data-pdfium-sidebar] button[data-collapsible]:hover {
  background: var(--pdfium-panel-item-hover-bg, #f3f4f6);
}

/* Resize handle */
[data-pdfium-resize-handle]:hover > div:first-child { background: var(--pdfium-activity-bar-active-colour, #3b82f6) !important; }
[data-pdfium-resize-handle]:hover [data-pdfium-resize-grip] { opacity: 1 !important; }
[data-pdfium-resize-handle]:hover [data-pdfium-resize-grip] > div { background: var(--pdfium-activity-bar-active-colour, #3b82f6) !important; }

/* Disabled opacity */
[role="toolbar"] button:disabled,
[role="toolbar"] select:disabled {
  opacity: var(--pdfium-toolbar-btn-disabled, 0.4);
}
search button:disabled {
  opacity: var(--pdfium-toolbar-btn-disabled, 0.4);
}

/* Touch targets */
@media (pointer: coarse) {
  [role="toolbar"] button { min-height: 44px; min-width: 44px; }
  [role="toolbar"] select,
  [role="toolbar"] input { min-height: 36px; }
  [data-pdfium-activity-bar] button { min-height: 44px; min-width: 44px; }
  [data-pdfium-sidebar] header button { min-height: 44px; min-width: 44px; }
}`;

const SCROLLBAR_CSS = `/* Thin scrollbars across the viewer */
[data-pdfium-sidebar],
[data-pdfium-sidebar] * {
  scrollbar-width: thin;
  scrollbar-color: var(--pdfium-panel-badge-bg, #d1d5db) transparent;
}
[data-pdfium-sidebar] ::-webkit-scrollbar { width: 6px; height: 6px; }
[data-pdfium-sidebar] ::-webkit-scrollbar-track { background: transparent; }
[data-pdfium-sidebar] ::-webkit-scrollbar-thumb {
  background: var(--pdfium-panel-badge-bg, #d1d5db);
  border-radius: 3px;
}
[data-pdfium-sidebar] ::-webkit-scrollbar-thumb:hover {
  background: var(--pdfium-panel-muted-colour, #9ca3af);
}`;

/**
 * Returns the raw CSS string for the given mode, without touching the DOM.
 * Safe for SSR — import and inject into your `<head>` manually.
 */
function getPDFiumThemeCSS(mode: PDFiumThemeMode): string {
  const sections = [buildLightCSS(), buildDarkCSS(), PAN_MODE_CSS, FOCUS_CSS, INTERACTIVE_CSS, SCROLLBAR_CSS];
  if (mode === 'system') {
    sections.push(buildSystemCSS());
  }
  return sections.join('\n\n');
}

/**
 * Client-only: injects a `<style>` with theme overrides and sets `data-pdfium-theme` on the target.
 * Idempotent — safe to call multiple times. Subsequent calls update the existing `<style>`.
 *
 * @param mode - 'light' | 'dark' | 'system'
 * @param target - Element to set `data-pdfium-theme` on. Defaults to `document.documentElement`.
 */
function applyPDFiumTheme(mode: PDFiumThemeMode, target?: HTMLElement): void {
  if (typeof document === 'undefined') return;

  const el = target ?? document.documentElement;
  el.setAttribute('data-pdfium-theme', mode);

  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = getPDFiumThemeCSS(mode);
}

export { applyPDFiumTheme, getPDFiumThemeCSS, PDFIUM_THEME_VARIABLES };
export type { PDFiumThemeMode };
