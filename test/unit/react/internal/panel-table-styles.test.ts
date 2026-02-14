import { describe, expect, it } from 'vitest';
import {
  MONO_STYLE,
  PAGE_SELECT_STYLE,
  TABLE_STYLE,
  TD_STYLE,
  TH_STYLE,
} from '../../../../src/react/internal/panel-table-styles.js';

describe('panel-table-styles', () => {
  it('exports expected table/header/cell style primitives', () => {
    expect(TABLE_STYLE.width).toBe('100%');
    expect(TABLE_STYLE.borderCollapse).toBe('collapse');
    expect(TH_STYLE.whiteSpace).toBe('nowrap');
    expect(TD_STYLE.padding).toBe('6px 8px');
    expect(TD_STYLE.fontSize).toBe('13px');
  });

  it('builds MONO_STYLE from TD_STYLE with monospace overrides', () => {
    expect(MONO_STYLE.padding).toBe(TD_STYLE.padding);
    expect(MONO_STYLE.borderBottom).toBe(TD_STYLE.borderBottom);
    expect(MONO_STYLE.fontFamily).toBe('monospace');
    expect(MONO_STYLE.fontSize).toBe('12px');
  });

  it('exports select input style contract for panel controls', () => {
    expect(PAGE_SELECT_STYLE.boxSizing).toBe('border-box');
    expect(PAGE_SELECT_STYLE.border).toBe('1px solid var(--pdfium-panel-section-border, #e5e7eb)');
    expect(PAGE_SELECT_STYLE.fontSize).toBe('13px');
  });
});
