import { afterEach, describe, expect, it } from 'vitest';
import { applyPDFiumTheme, getPDFiumThemeCSS, PDFIUM_THEME_VARIABLES } from '../../../src/react/theme.js';

describe('PDFIUM_THEME_VARIABLES', () => {
  it('contains expected keys', () => {
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-toolbar-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-container-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-page-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-sidebar-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-search-bg');
  });

  it('each variable has light, dark, and group properties', () => {
    for (const [key, variable] of Object.entries(PDFIUM_THEME_VARIABLES)) {
      expect(variable, `${key} missing "light"`).toHaveProperty('light');
      expect(variable, `${key} missing "dark"`).toHaveProperty('dark');
      expect(variable, `${key} missing "group"`).toHaveProperty('group');
      expect(typeof variable.light, `${key}.light is not a string`).toBe('string');
      expect(typeof variable.dark, `${key}.dark is not a string`).toBe('string');
      expect(typeof variable.group, `${key}.group is not a string`).toBe('string');
    }
  });
});

describe('getPDFiumThemeCSS', () => {
  it('returns a CSS string containing dark values for dark mode', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(typeof css).toBe('string');
    expect(css).toContain('data-pdfium-theme="dark"');
    expect(css).toContain('--pdfium-toolbar-bg');
    expect(css).toContain(PDFIUM_THEME_VARIABLES['--pdfium-toolbar-bg']!.dark);
  });

  it('returns a CSS string for light mode', () => {
    const css = getPDFiumThemeCSS('light');
    expect(typeof css).toBe('string');
    expect(css).toContain('data-pdfium-theme="light"');
    expect(css).toContain('--pdfium-toolbar-bg');
    expect(css).toContain(PDFIUM_THEME_VARIABLES['--pdfium-toolbar-bg']!.light);
  });

  it('includes system media query for system mode', () => {
    const css = getPDFiumThemeCSS('system');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('data-pdfium-theme="system"');
  });

  it('does not include system media query for dark mode', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('returns CSS containing dark theme variables for dark mode', () => {
    const css = getPDFiumThemeCSS('dark');
    for (const [key, { dark }] of Object.entries(PDFIUM_THEME_VARIABLES)) {
      expect(css, `missing dark value for ${key}`).toContain(dark);
    }
  });

  it('includes focus-visible rules with box-shadow', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('box-shadow');
  });

  it('includes pan mode pointer-events rules', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('data-pdfium-interaction="pan"');
    expect(css).toContain('pointer-events: none');
  });

  it('includes marquee mode pointer-events rules', () => {
    const css = getPDFiumThemeCSS('light');
    expect(css).toContain('data-pdfium-interaction="marquee"');
    expect(css).toContain('pointer-events: none');
  });
});

describe('applyPDFiumTheme', () => {
  afterEach(() => {
    document.getElementById('pdfium-theme-style')?.remove();
    document.documentElement.removeAttribute('data-pdfium-theme');
  });

  it('injects a <style> element with id pdfium-theme-style for dark mode', () => {
    applyPDFiumTheme('dark');
    const el = document.getElementById('pdfium-theme-style');
    expect(el).not.toBeNull();
    expect(el?.tagName.toLowerCase()).toBe('style');
  });

  it('sets data-pdfium-theme="light" on document.documentElement for light mode', () => {
    applyPDFiumTheme('light');
    expect(document.documentElement.getAttribute('data-pdfium-theme')).toBe('light');
  });

  it('sets data-pdfium-theme="dark" on document.documentElement for dark mode', () => {
    applyPDFiumTheme('dark');
    expect(document.documentElement.getAttribute('data-pdfium-theme')).toBe('dark');
  });

  it('sets data-pdfium-theme="system" on document.documentElement for system mode', () => {
    applyPDFiumTheme('system');
    expect(document.documentElement.getAttribute('data-pdfium-theme')).toBe('system');
  });

  it('sets data-pdfium-theme on a custom target element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    applyPDFiumTheme('dark', div);
    expect(div.getAttribute('data-pdfium-theme')).toBe('dark');
    div.remove();
  });

  it('does not set data-pdfium-theme on documentElement when a custom target is given', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    applyPDFiumTheme('dark', div);
    expect(document.documentElement.getAttribute('data-pdfium-theme')).toBeNull();
    div.remove();
  });

  it('generates CSS with @media prefers-color-scheme for system mode', () => {
    applyPDFiumTheme('system');
    const el = document.getElementById('pdfium-theme-style') as HTMLStyleElement;
    expect(el.textContent).toContain('@media (prefers-color-scheme: dark)');
  });

  it('is idempotent — calling twice results in exactly one <style> element', () => {
    applyPDFiumTheme('dark');
    applyPDFiumTheme('light');
    const all = document.head.querySelectorAll('#pdfium-theme-style');
    expect(all.length).toBe(1);
  });

  it('updates the style content when called a second time with a different mode', () => {
    applyPDFiumTheme('dark');
    applyPDFiumTheme('light');
    const el = document.getElementById('pdfium-theme-style') as HTMLStyleElement;
    expect(el.textContent).toContain('data-pdfium-theme="light"');
    expect(document.documentElement.getAttribute('data-pdfium-theme')).toBe('light');
  });

  it('injected style content matches getPDFiumThemeCSS output', () => {
    applyPDFiumTheme('dark');
    const el = document.getElementById('pdfium-theme-style') as HTMLStyleElement;
    expect(el.textContent).toBe(getPDFiumThemeCSS('dark'));
  });
});

describe('Activity Bar CSS variables', () => {
  it('activity bar variables exist', () => {
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-activity-bar-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-activity-bar-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-activity-bar-active-colour');
  });
});

describe('Panel CSS variables', () => {
  it('panel content variables exist', () => {
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-item-active-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-btn-colour');
  });
});

describe('Badge CSS variables', () => {
  it('includes object type badge variables', () => {
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-text-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-text-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-image-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-image-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-path-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-path-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-form-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-form-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-shading-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-badge-shading-colour');
  });

  it('includes panel badge border variants', () => {
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-badge-warning-bg');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-badge-warning-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-badge-warning-border');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-badge-success-border');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-badge-error-border');
  });
});

describe('Focus rules', () => {
  it('getPDFiumThemeCSS contains data-pdfium-activity-bar in focus rules', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('data-pdfium-activity-bar');
    expect(css).toContain('focus-visible');
  });

  it('includes treeitem and tab focus-visible rules', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('[role="treeitem"]:focus-visible');
    expect(css).toContain('[role="tab"]:focus-visible');
  });
});

describe('Interactive CSS', () => {
  it('includes hover selectors for toolbar buttons', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('[role="toolbar"] button');
    expect(css).toContain(':hover');
  });

  it('includes hover selectors for activity bar buttons', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('[data-pdfium-activity-bar] button');
  });

  it('includes hover selectors for panel items', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('[data-panel-item]:hover');
  });

  it('includes hover selectors for treeitem elements', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('[role="treeitem"]:hover');
  });

  it('includes coarse pointer media query for touch targets', () => {
    const css = getPDFiumThemeCSS('dark');
    expect(css).toContain('pointer: coarse');
    expect(css).toContain('min-height: 44px');
  });
});

describe('Colour naming convention', () => {
  it('all colour variables consistently use -colour suffix (not -text)', () => {
    for (const key of Object.keys(PDFIUM_THEME_VARIABLES)) {
      // Variables ending in -text would be incorrect — should use -colour instead
      // Exceptions: text-layer related variables are fine (they refer to text layers, not colours)
      if (key.includes('-text')) {
        // If a variable contains "-text" it must not be a colour variable — verify it is something
        // like a text-layer toggle, not a colour alias
        expect(key, `${key} should use -colour suffix instead of -text`).not.toMatch(/-text$/);
      }
    }

    // Positive check: verify key colour variables use -colour suffix
    const colourVarKeys = Object.keys(PDFIUM_THEME_VARIABLES).filter((k) => k.endsWith('-colour'));
    expect(colourVarKeys.length).toBeGreaterThanOrEqual(5);

    // Specific assertions for the renamed variables
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-toolbar-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-panel-colour');
    expect(PDFIUM_THEME_VARIABLES).toHaveProperty('--pdfium-activity-bar-colour');
    expect(PDFIUM_THEME_VARIABLES).not.toHaveProperty('--pdfium-toolbar-text');
    expect(PDFIUM_THEME_VARIABLES).not.toHaveProperty('--pdfium-panel-text');
    expect(PDFIUM_THEME_VARIABLES).not.toHaveProperty('--pdfium-activity-bar-text');
  });
});
