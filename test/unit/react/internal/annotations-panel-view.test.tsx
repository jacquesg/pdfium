import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SerialisedAnnotation } from '../../../../src/context/protocol.js';
import { ActionType, AnnotationType, FormFieldType } from '../../../../src/core/types.js';
import { AnnotationDetail, AnnotationGroup } from '../../../../src/react/internal/annotations-panel-view.js';

function makeAnnotation(overrides: Partial<SerialisedAnnotation> & { index: number }): SerialisedAnnotation {
  return {
    type: AnnotationType.Text,
    bounds: { left: 10, top: 100, right: 50, bottom: 20 },
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

describe('annotations-panel-view', () => {
  it('toggles group visibility and calls onSelect with annotation index', () => {
    const onSelect = vi.fn();
    const annotations = [
      makeAnnotation({ index: 1, contents: 'alpha' }),
      makeAnnotation({ index: 2, contents: 'beta' }),
    ];

    render(<AnnotationGroup type="Text" annotations={annotations} selectedIndex={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('#1'));
    expect(onSelect).toHaveBeenCalledWith(1);

    const header = screen.getByRole('button', { name: /Text/ });
    fireEvent.click(header);
    expect(screen.queryByText('#1')).toBeNull();

    fireEvent.click(header);
    expect(screen.getByText('#2')).toBeDefined();
  });

  it('renders detail heading and close action', () => {
    const onClose = vi.fn();
    const ann = makeAnnotation({ index: 7, type: AnnotationType.FreeText, contents: 'Hello world' });

    render(<AnnotationDetail annotation={ann} onClose={onClose} />);

    expect(screen.getByText(/Annotation #7/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close detail panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders selected widget options and attachment truncation summary', () => {
    const ann = makeAnnotation({
      index: 3,
      type: AnnotationType.Highlight,
      attachmentPoints: [
        { x1: 1, y1: 1, x2: 2, y2: 2, x3: 3, y3: 3, x4: 4, y4: 4 },
        { x1: 5, y1: 5, x2: 6, y2: 6, x3: 7, y3: 7, x4: 8, y4: 8 },
        { x1: 9, y1: 9, x2: 10, y2: 10, x3: 11, y3: 11, x4: 12, y4: 12 },
        { x1: 13, y1: 13, x2: 14, y2: 14, x3: 15, y3: 15, x4: 16, y4: 16 },
        { x1: 17, y1: 17, x2: 18, y2: 18, x3: 19, y3: 19, x4: 20, y4: 20 },
        { x1: 21, y1: 21, x2: 22, y2: 22, x3: 23, y3: 23, x4: 24, y4: 24 },
      ],
      widget: {
        fieldType: FormFieldType.CheckBox,
        fieldName: 'consent',
        fieldValue: 'yes',
        alternateName: 'Consent',
        exportValue: 'yes',
        fieldFlags: 0,
        options: [
          { index: 0, label: 'Yes', selected: true },
          { index: 1, label: 'No', selected: false },
        ],
      },
    });

    render(<AnnotationDetail annotation={ann} onClose={() => {}} />);

    expect(screen.getByText('selected')).toBeDefined();
    expect(screen.getByText('... 1 more')).toBeDefined();
  });

  it('supports keyboard collapse/expand on group header and keeps aria-expanded in sync', () => {
    const annotations = [makeAnnotation({ index: 1, contents: 'alpha' })];
    render(<AnnotationGroup type="Text" annotations={annotations} selectedIndex={null} onSelect={vi.fn()} />);

    const header = screen.getByRole('button', { name: /Text/ });
    expect(header.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('#1')).toBeNull();

    fireEvent.keyDown(header, { key: ' ' });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('#1')).toBeDefined();
  });

  it('supports keyboard selection on group items', () => {
    const onSelect = vi.fn();
    const annotations = [makeAnnotation({ index: 9, contents: 'gamma' })];
    render(<AnnotationGroup type="Text" annotations={annotations} selectedIndex={null} onSelect={onSelect} />);

    const item = screen.getByText('#9').closest('button');
    expect(item).not.toBeNull();
    if (!item) return;

    fireEvent.keyDown(item, { key: 'Enter' });
    fireEvent.keyDown(item, { key: ' ' });

    expect(onSelect).toHaveBeenNthCalledWith(1, 9);
    expect(onSelect).toHaveBeenNthCalledWith(2, 9);
  });

  it('supports keyboard close action in annotation detail', () => {
    const onClose = vi.fn();
    const annotation = makeAnnotation({ index: 11, type: AnnotationType.Text });
    render(<AnnotationDetail annotation={annotation} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close detail panel' });
    fireEvent.keyDown(closeButton, { key: 'Enter' });
    fireEvent.keyDown(closeButton, { key: ' ' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders line, vertex, ink path and link detail sections when data is present', () => {
    const annotation = makeAnnotation({
      index: 12,
      type: AnnotationType.Line,
      line: { start: { x: 1, y: 2 }, end: { x: 3, y: 4 } },
      vertices: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      inkPaths: [
        [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      ],
      link: {
        action: { type: ActionType.URI, uri: 'https://example.com', filePath: undefined },
        destination: undefined,
      },
      fontSize: 10,
    });

    render(<AnnotationDetail annotation={annotation} onClose={() => {}} />);

    expect(screen.getByText(/Line Points/)).toBeDefined();
    expect(screen.getByText(/Vertices/)).toBeDefined();
    expect(screen.getByText(/Ink Paths/)).toBeDefined();
    expect(screen.getByText(/Link/)).toBeDefined();
    expect(screen.getByText(/Free Text/)).toBeDefined();
  });

  it('does not render attachment point section for non-markup types', () => {
    const annotation = makeAnnotation({
      index: 13,
      type: AnnotationType.Text,
      attachmentPoints: [{ x1: 1, y1: 1, x2: 2, y2: 2, x3: 3, y3: 3, x4: 4, y4: 4 }],
    });

    render(<AnnotationDetail annotation={annotation} onClose={() => {}} />);
    expect(screen.queryByText(/Attachment points/)).toBeNull();
  });
});
