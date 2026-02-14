import { describe, expect, it } from 'vitest';
import {
  FORMS_PANEL_COPY,
  formatHighlightAlphaAriaValueText,
  formatHighlightAlphaLabel,
  formatHighlightAlphaPercent,
  formatWidgetsSummary,
  formatWidgetValue,
} from '../../../../src/react/internal/forms-panel-copy.js';

describe('forms-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(FORMS_PANEL_COPY.formDetectedBadge).toBe('Form Detected');
    expect(FORMS_PANEL_COPY.noFormBadge).toBe('No Form');
    expect(FORMS_PANEL_COPY.emptyWidgetsMessage).toBe('No form widgets on this page');
    expect(FORMS_PANEL_COPY.widgetsListAriaLabel).toBe('Form widgets');
    expect(FORMS_PANEL_COPY.highlightAlphaAriaLabel).toBe('Highlight alpha');
    expect(FORMS_PANEL_COPY.flattenConfirmButton).toBe('Confirm flatten?');
  });

  it('formats widget and alpha labels', () => {
    expect(formatWidgetsSummary(0)).toBe('0 widgets');
    expect(formatWidgetsSummary(3)).toBe('3 widgets');
    expect(formatHighlightAlphaPercent(128)).toBe('50%');
    expect(formatHighlightAlphaLabel(255)).toBe('Alpha: 100%');
    expect(formatHighlightAlphaAriaValueText(100)).toBe('Alpha 100 of 255');
  });

  it('formats detail values with fallback for empty entries', () => {
    expect(formatWidgetValue('hello')).toBe('hello');
    expect(formatWidgetValue(5)).toBe('5');
    expect(formatWidgetValue('')).toBe('\u2014');
    expect(formatWidgetValue(null)).toBe('\u2014');
    expect(formatWidgetValue(undefined)).toBe('\u2014');
  });
});
