import { describe, expect, it } from 'vitest';
import type { SerialisedAnnotation } from '../../../../src/context/protocol.js';
import { AnnotationType } from '../../../../src/core/types.js';
import {
  decodeAnnotationFlags,
  decodeFormFieldFlags,
  findAnnotationByIndex,
  formatAnnotationBounds,
  formatAnnotationListBounds,
  groupAnnotationsByType,
} from '../../../../src/react/internal/annotations-panel-helpers.js';

function makeAnnotation(index: number, type: AnnotationType): SerialisedAnnotation {
  return {
    index,
    type,
    bounds: { left: 10.2 + index, top: 40.6, right: 80.1, bottom: 12.4 },
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
  };
}

describe('annotations-panel helpers', () => {
  it('decodes known annotation flags', () => {
    expect(decodeAnnotationFlags((1 << 2) | (1 << 6))).toEqual(['Print', 'ReadOnly']);
    expect(decodeAnnotationFlags(0)).toEqual([]);
  });

  it('decodes all supported annotation flags', () => {
    const allFlags =
      (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8) | (1 << 9);
    expect(decodeAnnotationFlags(allFlags)).toEqual([
      'Invisible',
      'Hidden',
      'Print',
      'NoZoom',
      'NoRotate',
      'NoView',
      'ReadOnly',
      'Locked',
      'ToggleNoView',
      'LockedContents',
    ]);
  });

  it('decodes known form-field flags', () => {
    expect(decodeFormFieldFlags((1 << 0) | (1 << 17))).toEqual(['ReadOnly', 'Combo']);
    expect(decodeFormFieldFlags(0)).toEqual([]);
  });

  it('decodes all supported form-field flags', () => {
    const allFlags =
      (1 << 0) |
      (1 << 1) |
      (1 << 2) |
      (1 << 12) |
      (1 << 13) |
      (1 << 17) |
      (1 << 18) |
      (1 << 19) |
      (1 << 21) |
      (1 << 25) |
      (1 << 26);
    expect(decodeFormFieldFlags(allFlags)).toEqual([
      'ReadOnly',
      'Required',
      'NoExport',
      'Multiline',
      'Password',
      'Combo',
      'Edit',
      'Sort',
      'MultiSelect',
      'RichText',
      'CommitOnSelChange',
    ]);
  });

  it('formats bounds for detail and list views', () => {
    const bounds = { left: 10.2, top: 40.6, right: 80.1, bottom: 12.4 };
    expect(formatAnnotationBounds(bounds)).toBe('[10.2, 40.6, 80.1, 12.4]');
    expect(formatAnnotationListBounds(bounds)).toBe('[10, 12, 80, 41]');
  });

  it('groups annotations by type and finds selected annotation by index', () => {
    const annotations = [
      makeAnnotation(0, AnnotationType.Text),
      makeAnnotation(1, AnnotationType.Highlight),
      makeAnnotation(2, AnnotationType.Text),
    ];

    const grouped = groupAnnotationsByType(annotations);
    expect(grouped.get(AnnotationType.Text)?.map((item) => item.index)).toEqual([0, 2]);
    expect(grouped.get(AnnotationType.Highlight)?.map((item) => item.index)).toEqual([1]);

    expect(findAnnotationByIndex(annotations, 2)?.index).toBe(2);
    expect(findAnnotationByIndex(annotations, 999)).toBeNull();
    expect(findAnnotationByIndex(annotations, null)).toBeNull();
  });
});
