'use client';

import type { PageObjectType } from '../../core/types.js';

const OBJECTS_PANEL_COPY = {
  emptyStateMessage: 'No page objects found',
  closeDetailAriaLabel: 'Close detail',
  showAllLabel: 'Show all',
  transformMatrixHeading: 'Transform Matrix',
  textDetailsHeading: 'Text Details',
  imageDetailsHeading: 'Image Details',
  pathDetailsHeading: 'Path Details',
  contentMarksHeading: 'Content Marks',
  fontHeading: 'Font',
  segmentsHeading: 'Segments (first 50)',
} as const;

function formatObjectsSummary(totalCount: number): string {
  return `${totalCount} total`;
}

function formatObjectsTruncatedSummary(visibleCount: number, totalCount: number): string {
  return `Showing ${visibleCount} of ${totalCount} objects.`;
}

function formatObjectDetailHeading(index: number, type: PageObjectType): string {
  return `Object #${index} — ${type}`;
}

export { OBJECTS_PANEL_COPY, formatObjectDetailHeading, formatObjectsSummary, formatObjectsTruncatedSummary };
