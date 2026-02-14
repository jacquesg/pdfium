import { describe, expect, it } from 'vitest';
import type { SerialisedPageObject } from '../../../../src/context/protocol.js';
import { PageObjectType } from '../../../../src/core/types.js';
import {
  decodeFontFlags,
  formatObjectListBounds,
  getObjectTypeBadgeColours,
  getVisiblePageObjects,
  indexPageObjects,
} from '../../../../src/react/internal/objects-panel-helpers.js';

function createObject(type: PageObjectType): SerialisedPageObject {
  return {
    type,
    bounds: { left: 1, top: 10, right: 5, bottom: 3 },
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    marks: [],
    text: undefined,
    image: undefined,
    path: undefined,
  };
}

describe('objects-panel-helpers', () => {
  it('indexes page objects with stable index field', () => {
    const indexed = indexPageObjects([createObject(PageObjectType.Text), createObject(PageObjectType.Image)]);
    expect(indexed).toHaveLength(2);
    expect(indexed[0]?.index).toBe(0);
    expect(indexed[1]?.index).toBe(1);
  });

  it('returns visible subset and truncation state', () => {
    const indexed = indexPageObjects([
      createObject(PageObjectType.Text),
      createObject(PageObjectType.Text),
      createObject(PageObjectType.Text),
    ]);

    const truncated = getVisiblePageObjects(indexed, false, 2);
    expect(truncated.isTruncated).toBe(true);
    expect(truncated.visibleObjects).toHaveLength(2);

    const expanded = getVisiblePageObjects(indexed, true, 2);
    expect(expanded.isTruncated).toBe(false);
    expect(expanded.visibleObjects).toHaveLength(3);
  });

  it('formats object bounds in list format', () => {
    expect(formatObjectListBounds({ left: 1.2, bottom: 3.4, right: 5.6, top: 7.8 })).toBe('[1, 3, 6, 8]');
  });

  it('decodes font flags and resolves badge colours', () => {
    expect(decodeFontFlags((1 << 0) | (1 << 6))).toEqual(['FixedPitch', 'Italic']);
    const textBadge = getObjectTypeBadgeColours(PageObjectType.Text);
    expect(textBadge.bg).toContain('--pdfium-badge-text-bg');
    expect(textBadge.colour).toContain('--pdfium-badge-text-colour');
  });

  it('decodes every supported font flag and falls back to unknown badge colours', () => {
    const allFlags =
      (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 5) | (1 << 6) | (1 << 16) | (1 << 17) | (1 << 18);
    expect(decodeFontFlags(allFlags)).toEqual([
      'FixedPitch',
      'Serif',
      'Symbolic',
      'Script',
      'NonSymbolic',
      'Italic',
      'AllCap',
      'SmallCap',
      'ForceBold',
    ]);

    const unknownBadge = getObjectTypeBadgeColours(999 as unknown as PageObjectType);
    expect(unknownBadge.bg).toContain('--pdfium-panel-badge-bg');
    expect(unknownBadge.colour).toContain('--pdfium-panel-badge-colour');
  });
});
