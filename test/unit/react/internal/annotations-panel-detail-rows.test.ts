import { describe, expect, it } from 'vitest';
import type { SerialisedAnnotation } from '../../../../src/context/protocol.js';
import { ActionType, AnnotationType, DestinationFitType, FormFieldType } from '../../../../src/core/types.js';
import {
  buildAnnotationBorderRows,
  buildAnnotationCommonRows,
  buildAnnotationLineRows,
  buildAnnotationLinkRows,
  buildAnnotationTextRows,
  buildAnnotationWidgetRows,
} from '../../../../src/react/internal/annotations-panel-detail-rows.js';

function createAnnotation(overrides?: Partial<SerialisedAnnotation>): SerialisedAnnotation {
  return {
    index: 1,
    type: AnnotationType.Text,
    bounds: { left: 1, top: 10, right: 5, bottom: 2 },
    colour: { stroke: undefined, interior: undefined },
    flags: 0,
    contents: '',
    author: '',
    subject: '',
    border: null,
    appearance: null,
    fontSize: 0,
    line: undefined,
    vertices: undefined,
    inkPaths: undefined,
    attachmentPoints: undefined,
    widget: undefined,
    link: undefined,
    ...overrides,
  };
}

describe('annotations-panel-detail-rows', () => {
  it('builds common rows for annotation metadata', () => {
    const rows = buildAnnotationCommonRows(createAnnotation());
    expect(rows.map((row) => row.label)).toEqual(['Type', 'Index', 'Bounds', 'Has Appearance']);
  });

  it('builds text rows only for non-empty values', () => {
    const rows = buildAnnotationTextRows(createAnnotation({ contents: 'Note', subject: 'Subject' }));
    expect(rows).toEqual([
      { label: 'Contents', value: 'Note' },
      { label: 'Subject', value: 'Subject' },
    ]);
  });

  it('builds border and line rows when detail data exists', () => {
    const ann = createAnnotation({
      border: { horizontalRadius: 1.2, verticalRadius: 2.3, borderWidth: 3.4 },
      line: { start: { x: 1, y: 2 }, end: { x: 3, y: 4 } },
    });

    expect(buildAnnotationBorderRows(ann)).toEqual([
      { label: 'H Radius', value: '1.20' },
      { label: 'V Radius', value: '2.30' },
      { label: 'Width', value: '3.40' },
    ]);
    expect(buildAnnotationLineRows(ann)).toEqual([
      { label: 'Start', value: '(1.0, 2.0)' },
      { label: 'End', value: '(3.0, 4.0)' },
    ]);
  });

  it('builds widget and link rows', () => {
    const widgetRows = buildAnnotationWidgetRows({
      fieldType: FormFieldType.TextField,
      fieldName: 'name',
      fieldValue: 'value',
      alternateName: 'alt',
      exportValue: 'exp',
      fieldFlags: 0,
      options: [],
    });
    expect(widgetRows.map((row) => row.label)).toEqual(['Field Type', 'Name', 'Value', 'Alt Name', 'Export Value']);

    const linkRows = buildAnnotationLinkRows(
      createAnnotation({
        link: {
          action: { type: ActionType.URI, uri: 'https://example.com', filePath: undefined },
          destination: { pageIndex: 2, fitType: DestinationFitType.XYZ, x: undefined, y: undefined, zoom: undefined },
        },
      }),
    );
    expect(linkRows.some((row) => row.label === 'URI')).toBe(true);
    expect(linkRows.some((row) => row.label === 'Dest Page')).toBe(true);
  });
});
