import { describe, expect, it } from 'vitest';
import {
  formatAngleDegreesLabel,
  formatCharacterCount,
  formatExtractionCall,
  formatFontSizeLabel,
  formatPageSummary,
  formatUnicodeLabel,
  TEXT_PANEL_COPY,
} from '../../../../src/react/internal/text-panel-copy.js';

describe('text-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(TEXT_PANEL_COPY.charactersTabLabel).toBe('Characters');
    expect(TEXT_PANEL_COPY.extractionTabLabel).toBe('Extraction');
    expect(TEXT_PANEL_COPY.noDocumentMessage).toBe('Load a document to inspect text.');
    expect(TEXT_PANEL_COPY.fullPageTextAriaLabel).toBe('Full page text content');
    expect(TEXT_PANEL_COPY.extractButtonLabel).toBe('Extract');
  });

  it('formats dynamic text panel labels', () => {
    expect(formatCharacterCount(0)).toBe('0 characters');
    expect(formatCharacterCount(1)).toBe('1 character');
    expect(formatUnicodeLabel(65)).toBe('U+0041');
    expect(formatFontSizeLabel(10.24)).toBe('10.2pt');
    expect(formatAngleDegreesLabel(Math.PI / 2)).toBe('90.0°');
    expect(formatPageSummary(1, 612, 792, 1.5)).toBe('Page 2: 612 x 792 pt @ 1.50x');
    expect(formatExtractionCall(1, 2, 3, 4)).toBe('getTextInRect(1, 2, 3, 4)');
  });
});
