const ANNOTATIONS_PANEL_COPY = {
  emptyStateMessage: 'No annotations on this page.',
  totalSuffix: 'total',
  commonHeading: 'Common',
  coloursHeading: 'Colours',
  textContentHeading: 'Text Content',
  borderHeading: 'Border',
  linePointsHeading: 'Line Points',
  formFieldHeading: 'Form Field',
  linkHeading: 'Link',
  freeTextHeading: 'Free Text',
  noneLabel: 'None',
  closeDetailAriaLabel: 'Close detail panel',
  strokeLabel: 'Stroke',
  interiorLabel: 'Interior',
  fieldFlagsLabel: 'Field Flags',
  flagsLabel: 'Flags',
  selectedBadge: 'selected',
  moreLabel: 'more',
  pathLabelPrefix: 'Path',
  pointsSuffix: 'pts',
} as const;

function formatAnnotationsSummary(count: number): string {
  return `${count} ${ANNOTATIONS_PANEL_COPY.totalSuffix}`;
}

function formatAnnotationDetailHeading(index: number, type: string): string {
  return `Annotation #${index} \u2014 ${type}`;
}

function formatFlagsHeading(flags: number): string {
  return `${ANNOTATIONS_PANEL_COPY.flagsLabel} (${flags}):`;
}

function formatFieldFlagsHeading(flags: number): string {
  return `${ANNOTATIONS_PANEL_COPY.fieldFlagsLabel} (${flags}):`;
}

function formatVerticesHeading(count: number): string {
  return `Vertices (${count})`;
}

function formatInkPathsHeading(count: number): string {
  return `Ink Paths (${count})`;
}

function formatAttachmentPointsHeading(count: number): string {
  return `Attachment Points (${count})`;
}

function formatOptionsHeading(count: number): string {
  return `Options (${count}):`;
}

function formatPathPointsLabel(pathIndex: number, pointCount: number): string {
  return `${ANNOTATIONS_PANEL_COPY.pathLabelPrefix} ${pathIndex} (${pointCount} ${ANNOTATIONS_PANEL_COPY.pointsSuffix}):`;
}

function formatMoreCount(count: number): string {
  return `... ${count} ${ANNOTATIONS_PANEL_COPY.moreLabel}`;
}

export {
  ANNOTATIONS_PANEL_COPY,
  formatAnnotationsSummary,
  formatAnnotationDetailHeading,
  formatAttachmentPointsHeading,
  formatFieldFlagsHeading,
  formatFlagsHeading,
  formatInkPathsHeading,
  formatMoreCount,
  formatOptionsHeading,
  formatPathPointsLabel,
  formatVerticesHeading,
};
