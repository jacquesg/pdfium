import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SerialisedAnnotation } from '../../../../../src/context/protocol.js';
import { AnnotationType } from '../../../../../src/core/types.js';
import { RedactionOverlay } from '../../../../../src/react/editor/components/redaction-overlay.js';
import { REDACTION_FALLBACK_CONTENTS_MARKER } from '../../../../../src/react/editor/redaction-utils.js';

const baseAnnotation: SerialisedAnnotation = {
  index: 0,
  type: AnnotationType.Square,
  bounds: { left: 10, top: 100, right: 200, bottom: 50 },
  colour: {
    stroke: { r: 0, g: 0, b: 0, a: 255 },
    interior: undefined,
  },
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
} as unknown as SerialisedAnnotation;

function makeRedactAnnotation(index: number): SerialisedAnnotation {
  return {
    ...baseAnnotation,
    index,
    type: AnnotationType.Redact,
    bounds: { left: 10 + index * 5, top: 100 + index * 5, right: 200 + index * 5, bottom: 50 + index * 5 },
  } as unknown as SerialisedAnnotation;
}

function makeFallbackRedactAnnotation(index: number): SerialisedAnnotation {
  return {
    ...baseAnnotation,
    index,
    type: AnnotationType.Square,
    contents: REDACTION_FALLBACK_CONTENTS_MARKER,
    bounds: { left: 10 + index * 5, top: 100 + index * 5, right: 200 + index * 5, bottom: 50 + index * 5 },
  } as unknown as SerialisedAnnotation;
}

const defaultProps = {
  scale: 1,
  originalHeight: 792,
  width: 600,
  height: 800,
};

describe('RedactionOverlay', () => {
  describe('when no Redact annotations', () => {
    it('returns null when annotations array is empty', () => {
      const { container } = render(<RedactionOverlay {...defaultProps} annotations={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when no annotation has Redact type', () => {
      const { container } = render(<RedactionOverlay {...defaultProps} annotations={[baseAnnotation]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null with mixed annotations where none are Redact', () => {
      const textAnnotation = {
        ...baseAnnotation,
        index: 1,
        type: AnnotationType.Text,
      } as unknown as SerialisedAnnotation;
      const { container } = render(
        <RedactionOverlay {...defaultProps} annotations={[baseAnnotation, textAnnotation]} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when Redact annotations exist', () => {
    it('renders SVG with data-testid="redaction-overlay"', () => {
      const annotations = [makeRedactAnnotation(0)];
      render(<RedactionOverlay {...defaultProps} annotations={annotations} />);
      expect(screen.getByTestId('redaction-overlay')).toBeDefined();
    });

    it('rendered element is an SVG', () => {
      const annotations = [makeRedactAnnotation(0)];
      render(<RedactionOverlay {...defaultProps} annotations={annotations} />);
      const el = screen.getByTestId('redaction-overlay');
      expect(el.tagName.toLowerCase()).toBe('svg');
    });

    it('renders pseudo-redaction fallback squares', () => {
      const annotations = [makeFallbackRedactAnnotation(3)];
      render(<RedactionOverlay {...defaultProps} annotations={annotations} />);
      expect(screen.getByTestId('redaction-rect-3')).toBeDefined();
    });

    it('renders one rect per Redact annotation', () => {
      const annotations = [makeRedactAnnotation(0), makeRedactAnnotation(1), makeRedactAnnotation(2)];
      render(<RedactionOverlay {...defaultProps} annotations={annotations} />);
      for (let i = 0; i < 3; i++) {
        expect(screen.getByTestId(`redaction-rect-${i}`)).toBeDefined();
      }
    });

    it('uses annotation index for rect testid', () => {
      // annotation with index 5
      const annotation = makeRedactAnnotation(5);
      render(<RedactionOverlay {...defaultProps} annotations={[annotation]} />);
      expect(screen.getByTestId('redaction-rect-5')).toBeDefined();
    });

    it('ignores non-Redact annotations when rendering rects', () => {
      const nonRedact = {
        ...baseAnnotation,
        index: 99,
        type: AnnotationType.Highlight,
      } as unknown as SerialisedAnnotation;
      const redact = makeRedactAnnotation(0);
      render(<RedactionOverlay {...defaultProps} annotations={[nonRedact, redact]} />);
      expect(screen.getByTestId('redaction-rect-0')).toBeDefined();
      expect(screen.queryByTestId('redaction-rect-99')).toBeNull();
    });
  });

  describe('coordinate conversion', () => {
    it('positions rect using pdfRectToScreen (x = left * scale)', () => {
      // bounds: left=10, top=100, right=200, bottom=50, scale=1, originalHeight=792
      // pdfRectToScreen: x=10*1=10, y=(792-100)*1=692, w=(200-10)*1=190, h=(100-50)*1=50
      const annotation = makeRedactAnnotation(0);
      render(<RedactionOverlay {...defaultProps} annotations={[annotation]} />);
      const rect = screen.getByTestId('redaction-rect-0');
      expect(rect.getAttribute('x')).toBe('10');
    });

    it('positions rect y using originalHeight - top', () => {
      const annotation = makeRedactAnnotation(0);
      render(<RedactionOverlay {...defaultProps} annotations={[annotation]} />);
      const rect = screen.getByTestId('redaction-rect-0');
      expect(rect.getAttribute('y')).toBe('692');
    });

    it('applies scale factor to dimensions', () => {
      // scale=2: x=10*2=20, y=(792-100)*2=1384, w=190*2=380, h=50*2=100
      const annotation = makeRedactAnnotation(0);
      render(<RedactionOverlay {...defaultProps} scale={2} annotations={[annotation]} />);
      const rect = screen.getByTestId('redaction-rect-0');
      expect(rect.getAttribute('x')).toBe('20');
      expect(rect.getAttribute('width')).toBe('380');
    });
  });

  describe('SVG dimensions', () => {
    it('sets SVG width and height from props', () => {
      const annotations = [makeRedactAnnotation(0)];
      render(<RedactionOverlay {...defaultProps} width={400} height={600} annotations={annotations} />);
      const svg = screen.getByTestId('redaction-overlay');
      expect(svg.getAttribute('width')).toBe('400');
      expect(svg.getAttribute('height')).toBe('600');
    });
  });
});
