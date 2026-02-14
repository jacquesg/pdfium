import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextLayer } from '../TextLayer';

// Mock the library's TextOverlay (re-exported by our TextOverlay wrapper)
vi.mock('@scaryterry/pdfium/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@scaryterry/pdfium/react');
  return {
    ...actual,
    TextLayer: ({ document, pageIndex, scale, width, height, originalHeight }: {
      document: unknown;
      pageIndex: number;
      scale: number;
      width: number;
      height: number;
      originalHeight: number;
    }) => (
      <div data-testid="text-layer">
        <span data-testid="has-document">{String(document !== null)}</span>
        <span data-testid="page-index">{pageIndex}</span>
        <span data-testid="scale">{scale}</span>
        <span data-testid="width">{width}</span>
        <span data-testid="height">{height}</span>
        <span data-testid="original-height">{originalHeight}</span>
      </div>
    ),
  };
});

describe('TextLayer', () => {
  it('passes document and pageIndex to the library component', () => {
    const mockDoc = { id: 'test-doc' };

    // @ts-expect-error — minimal mock
    const { getByTestId } = render(<TextLayer document={mockDoc} pageIndex={2} scale={1.5} width={595} height={842} originalHeight={842} />);

    expect(getByTestId('has-document').textContent).toBe('true');
    expect(getByTestId('page-index').textContent).toBe('2');
    expect(getByTestId('scale').textContent).toBe('1.5');
    expect(getByTestId('width').textContent).toBe('595');
    expect(getByTestId('height').textContent).toBe('842');
    expect(getByTestId('original-height').textContent).toBe('842');
  });

  it('renders with null document', () => {
    const { getByTestId } = render(<TextLayer document={null} pageIndex={0} scale={1} width={595} height={842} originalHeight={842} />);

    expect(getByTestId('has-document').textContent).toBe('false');
  });
});
