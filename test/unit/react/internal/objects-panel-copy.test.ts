import { describe, expect, it } from 'vitest';
import { PageObjectType } from '../../../../src/core/types.js';
import {
  formatObjectDetailHeading,
  formatObjectsSummary,
  formatObjectsTruncatedSummary,
  OBJECTS_PANEL_COPY,
} from '../../../../src/react/internal/objects-panel-copy.js';

describe('objects-panel-copy', () => {
  it('exposes stable copy labels', () => {
    expect(OBJECTS_PANEL_COPY.emptyStateMessage).toBe('No page objects found');
    expect(OBJECTS_PANEL_COPY.closeDetailAriaLabel).toBe('Close detail');
    expect(OBJECTS_PANEL_COPY.showAllLabel).toBe('Show all');
  });

  it('formats object list summaries', () => {
    expect(formatObjectsSummary(12)).toBe('12 total');
    expect(formatObjectsTruncatedSummary(200, 275)).toBe('Showing 200 of 275 objects.');
  });

  it('formats detail heading', () => {
    expect(formatObjectDetailHeading(7, PageObjectType.Text)).toBe('Object #7 — Text');
  });
});
