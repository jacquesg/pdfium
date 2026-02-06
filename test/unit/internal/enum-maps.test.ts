import { describe, expect, it } from 'vitest';
import {
  AnnotationType,
  DocumentAvailability,
  FlattenFlags,
  PageObjectMarkValueType,
  SaveFlags,
  TextRenderMode,
} from '../../../src/core/types.js';
import {
  annotationTypeMap,
  documentAvailabilityMap,
  flattenFlagsMap,
  fromNative,
  pageObjectMarkValueTypeMap,
  saveFlagsMap,
  textRenderModeMap,
  toNative,
} from '../../../src/internal/enum-maps.js';

describe('flattenFlagsMap', () => {
  it('should round-trip NormalDisplay', () => {
    const native = toNative(flattenFlagsMap.toNative, FlattenFlags.NormalDisplay);
    expect(native).toBe(0);
    expect(fromNative(flattenFlagsMap.fromNative, native, FlattenFlags.NormalDisplay)).toBe(FlattenFlags.NormalDisplay);
  });

  it('should round-trip Print', () => {
    const native = toNative(flattenFlagsMap.toNative, FlattenFlags.Print);
    expect(native).toBe(1);
    expect(fromNative(flattenFlagsMap.fromNative, native, FlattenFlags.NormalDisplay)).toBe(FlattenFlags.Print);
  });

  it('should use fallback for unknown native value', () => {
    expect(fromNative(flattenFlagsMap.fromNative, 999, FlattenFlags.NormalDisplay)).toBe(FlattenFlags.NormalDisplay);
  });

  it('should throw for unmapped enum value', () => {
    // @ts-expect-error - Testing unmapped value
    expect(() => toNative(flattenFlagsMap.toNative, 'Invalid')).toThrow();
  });
});

describe('saveFlagsMap', () => {
  it('should round-trip None', () => {
    const native = toNative(saveFlagsMap.toNative, SaveFlags.None);
    expect(native).toBe(0);
    expect(fromNative(saveFlagsMap.fromNative, native, SaveFlags.None)).toBe(SaveFlags.None);
  });

  it('should round-trip Incremental', () => {
    const native = toNative(saveFlagsMap.toNative, SaveFlags.Incremental);
    expect(native).toBe(1);
    expect(fromNative(saveFlagsMap.fromNative, native, SaveFlags.None)).toBe(SaveFlags.Incremental);
  });

  it('should round-trip NoIncremental', () => {
    const native = toNative(saveFlagsMap.toNative, SaveFlags.NoIncremental);
    expect(native).toBe(2);
    expect(fromNative(saveFlagsMap.fromNative, native, SaveFlags.None)).toBe(SaveFlags.NoIncremental);
  });

  it('should round-trip RemoveSecurity', () => {
    const native = toNative(saveFlagsMap.toNative, SaveFlags.RemoveSecurity);
    expect(native).toBe(3);
    expect(fromNative(saveFlagsMap.fromNative, native, SaveFlags.None)).toBe(SaveFlags.RemoveSecurity);
  });

  it('should use fallback for unknown native value', () => {
    expect(fromNative(saveFlagsMap.fromNative, 999, SaveFlags.None)).toBe(SaveFlags.None);
  });

  it('should throw for unmapped enum value', () => {
    // @ts-expect-error - Testing unmapped value
    expect(() => toNative(saveFlagsMap.toNative, 'Invalid')).toThrow();
  });
});

describe('annotationTypeMap', () => {
  it('should round-trip Text (native 1)', () => {
    const native = toNative(annotationTypeMap.toNative, AnnotationType.Text);
    expect(native).toBe(1);
    expect(fromNative(annotationTypeMap.fromNative, native, AnnotationType.Unknown)).toBe(AnnotationType.Text);
  });

  it('should round-trip Stamp (native 13, gap at 12)', () => {
    const native = toNative(annotationTypeMap.toNative, AnnotationType.Stamp);
    expect(native).toBe(13);
    expect(fromNative(annotationTypeMap.fromNative, native, AnnotationType.Unknown)).toBe(AnnotationType.Stamp);
  });

  it('should round-trip Widget (native 20, gap at 19)', () => {
    const native = toNative(annotationTypeMap.toNative, AnnotationType.Widget);
    expect(native).toBe(20);
    expect(fromNative(annotationTypeMap.fromNative, native, AnnotationType.Unknown)).toBe(AnnotationType.Widget);
  });

  it('should fall back for gap values 12 and 19', () => {
    expect(fromNative(annotationTypeMap.fromNative, 12, AnnotationType.Unknown)).toBe(AnnotationType.Unknown);
    expect(fromNative(annotationTypeMap.fromNative, 19, AnnotationType.Unknown)).toBe(AnnotationType.Unknown);
  });
});

describe('documentAvailabilityMap', () => {
  it('should round-trip DataAvailable', () => {
    const native = toNative(documentAvailabilityMap.toNative, DocumentAvailability.DataAvailable);
    expect(native).toBe(1);
    expect(fromNative(documentAvailabilityMap.fromNative, native, DocumentAvailability.DataNotAvailable)).toBe(
      DocumentAvailability.DataAvailable,
    );
  });

  it('should round-trip DataNotAvailable', () => {
    const native = toNative(documentAvailabilityMap.toNative, DocumentAvailability.DataNotAvailable);
    expect(native).toBe(0);
    expect(fromNative(documentAvailabilityMap.fromNative, native, DocumentAvailability.DataNotAvailable)).toBe(
      DocumentAvailability.DataNotAvailable,
    );
  });

  it('should round-trip DataError (negative native value)', () => {
    const native = toNative(documentAvailabilityMap.toNative, DocumentAvailability.DataError);
    expect(native).toBe(-1);
    expect(fromNative(documentAvailabilityMap.fromNative, native, DocumentAvailability.DataNotAvailable)).toBe(
      DocumentAvailability.DataError,
    );
  });

  it('should fall back for unknown negative values', () => {
    expect(fromNative(documentAvailabilityMap.fromNative, -2, DocumentAvailability.DataNotAvailable)).toBe(
      DocumentAvailability.DataNotAvailable,
    );
  });
});

describe('pageObjectMarkValueTypeMap', () => {
  it('should round-trip Int (native 0)', () => {
    const native = toNative(pageObjectMarkValueTypeMap.toNative, PageObjectMarkValueType.Int);
    expect(native).toBe(0);
    expect(fromNative(pageObjectMarkValueTypeMap.fromNative, native, PageObjectMarkValueType.Int)).toBe(
      PageObjectMarkValueType.Int,
    );
  });

  it('should round-trip String (native 2)', () => {
    const native = toNative(pageObjectMarkValueTypeMap.toNative, PageObjectMarkValueType.String);
    expect(native).toBe(2);
    expect(fromNative(pageObjectMarkValueTypeMap.fromNative, native, PageObjectMarkValueType.Int)).toBe(
      PageObjectMarkValueType.String,
    );
  });

  it('should round-trip Blob (native 3)', () => {
    const native = toNative(pageObjectMarkValueTypeMap.toNative, PageObjectMarkValueType.Blob);
    expect(native).toBe(3);
    expect(fromNative(pageObjectMarkValueTypeMap.fromNative, native, PageObjectMarkValueType.Int)).toBe(
      PageObjectMarkValueType.Blob,
    );
  });

  it('should round-trip Name (native 4)', () => {
    const native = toNative(pageObjectMarkValueTypeMap.toNative, PageObjectMarkValueType.Name);
    expect(native).toBe(4);
    expect(fromNative(pageObjectMarkValueTypeMap.fromNative, native, PageObjectMarkValueType.Int)).toBe(
      PageObjectMarkValueType.Name,
    );
  });

  it('should fall back for gap value 1', () => {
    expect(fromNative(pageObjectMarkValueTypeMap.fromNative, 1, PageObjectMarkValueType.Int)).toBe(
      PageObjectMarkValueType.Int,
    );
  });
});

describe('textRenderModeMap', () => {
  it('should round-trip Fill (native 0)', () => {
    const native = toNative(textRenderModeMap.toNative, TextRenderMode.Fill);
    expect(native).toBe(0);
    expect(fromNative(textRenderModeMap.fromNative, native, TextRenderMode.Fill)).toBe(TextRenderMode.Fill);
  });

  it('should round-trip Clip (native 7)', () => {
    const native = toNative(textRenderModeMap.toNative, TextRenderMode.Clip);
    expect(native).toBe(7);
    expect(fromNative(textRenderModeMap.fromNative, native, TextRenderMode.Fill)).toBe(TextRenderMode.Clip);
  });

  it('should round-trip FillStrokeClip (native 6)', () => {
    const native = toNative(textRenderModeMap.toNative, TextRenderMode.FillStrokeClip);
    expect(native).toBe(6);
    expect(fromNative(textRenderModeMap.fromNative, native, TextRenderMode.Fill)).toBe(TextRenderMode.FillStrokeClip);
  });

  it('should fall back for unknown value 99', () => {
    expect(fromNative(textRenderModeMap.fromNative, 99, TextRenderMode.Fill)).toBe(TextRenderMode.Fill);
  });
});
