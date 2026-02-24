import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { computeSpans, TextOverlay } from '../../../../src/react/components/text-overlay.js';

// ── computeSpans unit tests ─────────────────────────────────────

describe('computeSpans', () => {
  it('merges adjacent characters on the same line into a single span', () => {
    const text = 'AB';
    // Each character: [left, right, bottom, top] — 4 floats per char
    const rects = new Float32Array([
      10,
      20,
      0,
      12, // 'A': left=10, right=20, bottom=0, top=12
      20,
      30,
      0,
      12, // 'B': left=20, right=30, bottom=0, top=12
    ]);

    const spans = computeSpans(text, rects, 1, 100);

    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('AB');
  });

  it('creates separate spans for characters on different lines', () => {
    const text = 'AB';
    const rects = new Float32Array([
      10,
      20,
      80,
      92, // 'A': top line
      10,
      20,
      10,
      22, // 'B': far below, different line
    ]);

    const spans = computeSpans(text, rects, 1, 100);

    expect(spans).toHaveLength(2);
    expect(spans[0]!.text).toBe('A');
    expect(spans[1]!.text).toBe('B');
  });

  it('injects synthetic space for gaps > 0.2 * fontSize', () => {
    // Characters on the same line with a moderate gap between them.
    // fontSize is derived from charHeight = (top - bottom) * scale.
    // 'A': height = 20 - 0 = 20, fontSize = 20
    // Gap must be > 0.2 * 20 = 4 AND < 0.8 * 20 = 16 to be adjacent but spaced.
    const text = 'AB';
    const rects = new Float32Array([
      10,
      30,
      0,
      20, // 'A': left=10, right=30, bottom=0, top=20
      40,
      60,
      0,
      20, // 'B': left=40, gap from A = 40 - 30 = 10
    ]);

    const spans = computeSpans(text, rects, 1, 100);

    // gap = 10, fontSize = 20: 10 > 0.2 * 20 (4) and 10 < 0.8 * 20 (16)
    // Should be merged into one span with a synthetic space
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('A B');
  });

  it('returns an empty array for empty input', () => {
    const spans = computeSpans('', new Float32Array(0), 1, 100);
    expect(spans).toHaveLength(0);
  });

  it('skips null characters (\\u0000)', () => {
    const text = 'A\u0000B';
    const rects = new Float32Array([
      10,
      20,
      0,
      12,
      20,
      30,
      0,
      12, // null char rect
      30,
      40,
      0,
      12,
    ]);

    const spans = computeSpans(text, rects, 1, 100);

    // null char skipped, A and B should merge (adjacent)
    const combinedText = spans.map((s) => s.text).join('');
    expect(combinedText).not.toContain('\u0000');
  });

  it('skips zero-size character rects', () => {
    const text = 'AB';
    const rects = new Float32Array([
      10,
      10,
      0,
      12, // zero-width rect (left === right)
      20,
      30,
      0,
      12,
    ]);

    const spans = computeSpans(text, rects, 1, 100);

    // First char skipped due to zero width
    expect(spans).toHaveLength(1);
    expect(spans[0]!.text).toBe('B');
  });

  it('applies coordinate transform from PDF bottom-left to CSS top-left', () => {
    const text = 'A';
    const originalHeight = 792;
    const rects = new Float32Array([
      10,
      20,
      700,
      712, // bottom=700, top=712
    ]);

    const spans = computeSpans(text, rects, 1, originalHeight);

    // CSS top = (originalHeight - pdfTop) * scale = (792 - 712) * 1 = 80
    expect(spans[0]!.top).toBe(80);
    // CSS left = pdfLeft * scale = 10
    expect(spans[0]!.left).toBe(10);
  });

  it('applies scale factor to coordinates', () => {
    const text = 'A';
    const rects = new Float32Array([10, 20, 0, 12]);
    const scale = 2;

    const spans = computeSpans(text, rects, scale, 100);

    expect(spans[0]!.left).toBe(20); // 10 * 2
    expect(spans[0]!.width).toBe(20); // (20 - 10) * 2
    expect(spans[0]!.height).toBe(24); // (12 - 0) * 2
  });
});

// ── TextOverlay component tests ─────────────────────────────────

describe('TextOverlay', () => {
  it('renders nothing when text is null', () => {
    const { container } = render(
      <TextOverlay text={null} rects={null} scale={1} width={100} height={100} originalHeight={792} />,
    );

    const spans = container.querySelectorAll('.pdfium-text-overlay span');
    expect(spans).toHaveLength(0);
  });

  it('renders nothing when text is empty', () => {
    const { container } = render(
      <TextOverlay text="" rects={new Float32Array(0)} scale={1} width={100} height={100} originalHeight={792} />,
    );

    const spans = container.querySelectorAll('.pdfium-text-overlay span');
    expect(spans).toHaveLength(0);
  });

  it('renders spans for valid text content', () => {
    const text = 'AB';
    const rects = new Float32Array([10, 20, 0, 12, 20, 30, 0, 12]);

    const { container } = render(
      <TextOverlay text={text} rects={rects} scale={1} width={200} height={200} originalHeight={100} />,
    );

    const spans = container.querySelectorAll('.pdfium-text-overlay span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('sets selection colour via CSS custom property', () => {
    const text = 'A';
    const rects = new Float32Array([10, 20, 0, 12]);

    const { container } = render(
      <TextOverlay
        text={text}
        rects={rects}
        scale={1}
        width={200}
        height={200}
        originalHeight={100}
        selectionColour="rgba(255, 0, 0, 0.5)"
      />,
    );

    const overlay = container.querySelector('.pdfium-text-overlay') as HTMLElement;
    expect(overlay.style.getPropertyValue('--pdfium-selection-colour')).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('applies nonce to the style tag', () => {
    const text = 'A';
    const rects = new Float32Array([10, 20, 0, 12]);

    const { container } = render(
      <TextOverlay
        text={text}
        rects={rects}
        scale={1}
        width={200}
        height={200}
        originalHeight={100}
        nonce="test-nonce-123"
      />,
    );

    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.getAttribute('nonce')).toBe('test-nonce-123');
  });

  it('has tabIndex={0} on the outer div for keyboard text selection', () => {
    const { container } = render(
      <TextOverlay text={null} rects={null} scale={1} width={100} height={100} originalHeight={792} />,
    );

    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.getAttribute('tabindex')).toBe('0');
  });

  it('applies className and style props', () => {
    const { container } = render(
      <TextOverlay
        text={null}
        rects={null}
        scale={1}
        width={100}
        height={100}
        originalHeight={792}
        className="custom-overlay"
        style={{ opacity: 0.5 }}
      />,
    );

    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toBe('pdfium-text-layer custom-overlay');
    expect(outerDiv.style.opacity).toBe('0.5');
  });

  it('keeps base class stable when className is omitted', () => {
    const { container } = render(
      <TextOverlay text={null} rects={null} scale={1} width={100} height={100} originalHeight={792} />,
    );

    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toBe('pdfium-text-layer');
  });
});
