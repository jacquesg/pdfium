import { describe, expect, it } from 'vitest';
import { AnnotationType } from '../../../../src/core/types.js';
import { getLineLikeEndpoints, isLineLikeAnnotation } from '../../../../src/react/editor/line-utils.js';

describe('line-utils', () => {
  it('treats native Line annotations as line-like', () => {
    expect(
      isLineLikeAnnotation({
        type: AnnotationType.Line,
        inkPaths: undefined,
      }),
    ).toBe(true);
  });

  it('treats marked Ink fallback annotations as line-like', () => {
    expect(
      isLineLikeAnnotation({
        type: AnnotationType.Ink,
        lineFallback: true,
        inkPaths: undefined,
      }),
    ).toBe(true);
  });

  it('does not treat unmarked 2-point Ink paths as line-like', () => {
    expect(
      isLineLikeAnnotation({
        type: AnnotationType.Ink,
        inkPaths: [
          [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
        ],
      }),
    ).toBe(false);
  });

  it('does not treat regular Ink strokes as line-like', () => {
    expect(
      isLineLikeAnnotation({
        type: AnnotationType.Ink,
        inkPaths: [
          [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
          ],
        ],
      }),
    ).toBe(false);
  });

  it('resolves endpoints from native line payload', () => {
    expect(
      getLineLikeEndpoints({
        line: { start: { x: 10, y: 20 }, end: { x: 30, y: 40 } },
        inkPaths: undefined,
      }),
    ).toEqual({
      start: { x: 10, y: 20 },
      end: { x: 30, y: 40 },
    });
  });

  it('resolves endpoints from marked fallback Ink payload', () => {
    expect(
      getLineLikeEndpoints({
        line: undefined,
        lineFallback: true,
        inkPaths: [
          [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        ],
      }),
    ).toEqual({
      start: { x: 10, y: 20 },
      end: { x: 30, y: 40 },
    });
  });

  it('does not resolve endpoints from unmarked 2-point Ink payload', () => {
    expect(
      getLineLikeEndpoints({
        line: undefined,
        lineFallback: false,
        inkPaths: [
          [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        ],
      }),
    ).toBeUndefined();
  });
});
