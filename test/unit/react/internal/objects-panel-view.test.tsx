import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ImageColourSpace,
  ImageMarkedContentType,
  LineCapStyle,
  LineJoinStyle,
  PageObjectType,
  PathFillMode,
  PathSegmentType,
} from '../../../../src/core/types.js';
import type { IndexedPageObject } from '../../../../src/react/internal/objects-panel-helpers.js';
import {
  ObjectDetailPanel,
  ObjectListItem,
  ObjectsTruncationNotice,
} from '../../../../src/react/internal/objects-panel-view.js';

function makeObject(overrides?: Partial<IndexedPageObject>): IndexedPageObject {
  return {
    index: 0,
    type: PageObjectType.Text,
    bounds: { left: 10, top: 100, right: 60, bottom: 20 },
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    marks: [],
    text: {
      text: 'Hello PDF',
      fontSize: 12,
      fontName: 'Helvetica',
      familyName: 'Helvetica',
      weight: 400,
      isEmbedded: false,
      italicAngle: 0,
      fontFlags: 0,
      metrics: { ascent: 10, descent: -3 },
    },
    image: undefined,
    path: undefined,
    ...overrides,
  };
}

describe('objects-panel-view', () => {
  it('renders object list item and calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const obj = makeObject({ index: 7, type: PageObjectType.Image, text: undefined });

    render(<ObjectListItem obj={obj} isSelected={false} onSelect={onSelect} />);

    expect(screen.getByText(PageObjectType.Image)).toBeDefined();
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('renders truncation notice and triggers show-all action', () => {
    const onShowAll = vi.fn();
    render(<ObjectsTruncationNotice maxVisible={200} totalObjects={250} onShowAll={onShowAll} />);

    expect(screen.getByText(/Showing 200 of 250 objects/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('renders detail panel and close action', () => {
    const onClose = vi.fn();
    const obj = makeObject({ index: 3 });

    render(<ObjectDetailPanel obj={obj} onClose={onClose} />);

    expect(screen.getByText(/Object #3/)).toBeDefined();
    expect(screen.getByText('Text Details')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close detail' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders image and path-specific sections when present', () => {
    const obj = makeObject({
      type: PageObjectType.Path,
      text: undefined,
      image: {
        width: 640,
        height: 480,
        metadata: {
          width: 640,
          height: 480,
          horizontalDpi: 72,
          verticalDpi: 72,
          bitsPerPixel: 24,
          colourSpace: ImageColourSpace.DeviceRGB,
          markedContent: ImageMarkedContentType.None,
        },
      },
      path: {
        segmentCount: 2,
        segments: [
          { type: PathSegmentType.MoveTo, x: 0, y: 0, close: false },
          { type: PathSegmentType.LineTo, x: 10, y: 10, close: true },
        ],
        drawMode: { fill: PathFillMode.Winding, stroke: true },
        strokeWidth: 1,
        lineCap: LineCapStyle.Butt,
        lineJoin: LineJoinStyle.Miter,
      },
    });

    render(<ObjectDetailPanel obj={obj} onClose={() => {}} />);

    expect(screen.getByText('Image Details')).toBeDefined();
    expect(screen.getByText('Path Details')).toBeDefined();
    expect(screen.getByText('close')).toBeDefined();
  });
});
