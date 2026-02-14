'use client';

import type { SerialisedAnnotation, SerialisedWidgetData } from '../../context/protocol.js';
import { formatAnnotationBounds } from './annotations-panel-helpers.js';
import type { PropertyRow } from './property-table.js';

function buildAnnotationCommonRows(annotation: SerialisedAnnotation): PropertyRow[] {
  return [
    { label: 'Type', value: annotation.type },
    { label: 'Index', value: annotation.index },
    { label: 'Bounds', value: formatAnnotationBounds(annotation.bounds) },
    { label: 'Has Appearance', value: annotation.appearance !== null },
  ];
}

function buildAnnotationTextRows(annotation: SerialisedAnnotation): PropertyRow[] {
  return [
    ...(annotation.contents ? [{ label: 'Contents', value: annotation.contents }] : []),
    ...(annotation.author ? [{ label: 'Author', value: annotation.author }] : []),
    ...(annotation.subject ? [{ label: 'Subject', value: annotation.subject }] : []),
  ];
}

function buildAnnotationBorderRows(annotation: SerialisedAnnotation): PropertyRow[] {
  if (annotation.border === null) return [];
  return [
    { label: 'H Radius', value: annotation.border.horizontalRadius.toFixed(2) },
    { label: 'V Radius', value: annotation.border.verticalRadius.toFixed(2) },
    { label: 'Width', value: annotation.border.borderWidth.toFixed(2) },
  ];
}

function buildAnnotationLineRows(annotation: SerialisedAnnotation): PropertyRow[] {
  if (!annotation.line) return [];
  return [
    { label: 'Start', value: `(${annotation.line.start.x.toFixed(1)}, ${annotation.line.start.y.toFixed(1)})` },
    { label: 'End', value: `(${annotation.line.end.x.toFixed(1)}, ${annotation.line.end.y.toFixed(1)})` },
  ];
}

function buildAnnotationWidgetRows(widget: SerialisedWidgetData): PropertyRow[] {
  return [
    { label: 'Field Type', value: widget.fieldType },
    { label: 'Name', value: widget.fieldName },
    { label: 'Value', value: widget.fieldValue },
    { label: 'Alt Name', value: widget.alternateName },
    { label: 'Export Value', value: widget.exportValue },
  ];
}

function buildAnnotationLinkRows(annotation: SerialisedAnnotation): PropertyRow[] {
  if (!annotation.link) return [];
  return [
    { label: 'Has Action', value: !!annotation.link.action },
    ...(annotation.link.action?.type ? [{ label: 'Action Type', value: annotation.link.action.type }] : []),
    ...(annotation.link.action?.uri ? [{ label: 'URI', value: annotation.link.action.uri }] : []),
    ...(annotation.link.action?.filePath ? [{ label: 'File Path', value: annotation.link.action.filePath }] : []),
    ...(annotation.link.destination?.pageIndex !== undefined
      ? [{ label: 'Dest Page', value: annotation.link.destination.pageIndex }]
      : []),
  ];
}

export {
  buildAnnotationBorderRows,
  buildAnnotationCommonRows,
  buildAnnotationLineRows,
  buildAnnotationLinkRows,
  buildAnnotationTextRows,
  buildAnnotationWidgetRows,
};
