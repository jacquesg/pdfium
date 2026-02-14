import { describe, expect, it } from 'vitest';
import {
  ANNOTATIONS_PANEL_COPY,
  formatAnnotationDetailHeading,
  formatAnnotationsSummary,
  formatAttachmentPointsHeading,
  formatFieldFlagsHeading,
  formatFlagsHeading,
  formatInkPathsHeading,
  formatMoreCount,
  formatOptionsHeading,
  formatPathPointsLabel,
  formatVerticesHeading,
} from '../../../../src/react/internal/annotations-panel-copy.js';

describe('annotations-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(ANNOTATIONS_PANEL_COPY.emptyStateMessage).toBe('No annotations on this page.');
    expect(ANNOTATIONS_PANEL_COPY.commonHeading).toBe('Common');
    expect(ANNOTATIONS_PANEL_COPY.coloursHeading).toBe('Colours');
    expect(ANNOTATIONS_PANEL_COPY.noneLabel).toBe('None');
    expect(ANNOTATIONS_PANEL_COPY.closeDetailAriaLabel).toBe('Close detail panel');
  });

  it('formats dynamic annotations labels', () => {
    expect(formatAnnotationsSummary(2)).toBe('2 total');
    expect(formatAnnotationDetailHeading(7, 'Highlight')).toBe('Annotation #7 \u2014 Highlight');
    expect(formatFlagsHeading(12)).toBe('Flags (12):');
    expect(formatFieldFlagsHeading(4)).toBe('Field Flags (4):');
    expect(formatVerticesHeading(3)).toBe('Vertices (3)');
    expect(formatInkPathsHeading(5)).toBe('Ink Paths (5)');
    expect(formatAttachmentPointsHeading(2)).toBe('Attachment Points (2)');
    expect(formatOptionsHeading(6)).toBe('Options (6):');
    expect(formatPathPointsLabel(1, 8)).toBe('Path 1 (8 pts):');
    expect(formatMoreCount(11)).toBe('... 11 more');
  });
});
