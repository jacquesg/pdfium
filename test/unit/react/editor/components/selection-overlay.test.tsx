import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectionOverlay } from '../../../../../src/react/editor/components/selection-overlay.js';

const defaultProps = {
  rect: { left: 50, top: 200, right: 200, bottom: 100 },
  scale: 1,
  originalHeight: 792,
};

function dragBoxHandle(
  handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
  delta: { x: number; y: number },
  options?: { shiftKey?: boolean },
): void {
  const handleElement = screen.getByTestId(`handle-${handle}`);
  const root = screen.getByTestId('selection-overlay');
  const startPoints: Record<typeof handle, { x: number; y: number }> = {
    nw: { x: 50, y: 592 },
    n: { x: 125, y: 592 },
    ne: { x: 200, y: 592 },
    e: { x: 200, y: 642 },
    se: { x: 200, y: 692 },
    s: { x: 125, y: 692 },
    sw: { x: 50, y: 692 },
    w: { x: 50, y: 642 },
  };
  const start = startPoints[handle];

  fireEvent.pointerDown(handleElement, {
    clientX: start.x,
    clientY: start.y,
    pointerId: 1,
    shiftKey: options?.shiftKey,
  });
  fireEvent.pointerMove(root, {
    clientX: start.x + delta.x,
    clientY: start.y + delta.y,
    pointerId: 1,
    shiftKey: options?.shiftKey,
  });
  fireEvent.pointerUp(root, { pointerId: 1, shiftKey: options?.shiftKey });
}

beforeEach(() => {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  } else {
    vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(vi.fn());
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  } else {
    vi.spyOn(Element.prototype, 'releasePointerCapture').mockImplementation(vi.fn());
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  } else {
    vi.spyOn(Element.prototype, 'hasPointerCapture').mockImplementation(() => true);
  }
});

describe('SelectionOverlay', () => {
  it('renders 8 resize handles', () => {
    render(<SelectionOverlay {...defaultProps} />);

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const handle of handles) {
      expect(screen.getByTestId(`handle-${handle}`)).toBeDefined();
    }
  });

  it('renders selection body', () => {
    render(<SelectionOverlay {...defaultProps} />);

    expect(screen.getByTestId('selection-body')).toBeDefined();
  });

  it('commits move once on pointer up', () => {
    const onMove = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 150, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });

    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('ignores non-primary pointer drag starts', () => {
    const onMove = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, button: 2, pointerType: 'mouse' });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 120, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(root, { pointerId: 1, pointerType: 'mouse' });

    expect(onMove).not.toHaveBeenCalled();
  });

  it('allows touch pointer drags even when button is non-zero', () => {
    const onMove = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, button: 2, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 140, clientY: 130, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(root, { pointerId: 1, pointerType: 'touch' });

    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('clamps moved overlay to non-negative coordinates', () => {
    render(<SelectionOverlay {...defaultProps} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay') as HTMLDivElement;

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, button: 0, isPrimary: true });
    fireEvent.pointerMove(root, { clientX: -100, clientY: -100, pointerId: 1, isPrimary: true });

    expect(Number.parseFloat(root.style.left)).toBeGreaterThanOrEqual(0);
    expect(Number.parseFloat(root.style.top)).toBeGreaterThanOrEqual(0);
  });

  it('clamps moved overlay to provided max bounds', () => {
    render(<SelectionOverlay {...defaultProps} maxWidth={220} maxHeight={700} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay') as HTMLDivElement;

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, button: 0, isPrimary: true });
    fireEvent.pointerMove(root, { clientX: 2_000, clientY: 2_000, pointerId: 1, isPrimary: true });

    expect(Number.parseFloat(root.style.left)).toBeLessThanOrEqual(70);
    expect(Number.parseFloat(root.style.top)).toBeLessThanOrEqual(600);
  });

  it('clamps resize previews to provided max bounds', () => {
    render(<SelectionOverlay {...defaultProps} maxWidth={220} maxHeight={700} />);

    const handle = screen.getByTestId('handle-se');
    const root = screen.getByTestId('selection-overlay') as HTMLDivElement;

    fireEvent.pointerDown(handle, { clientX: 200, clientY: 200, pointerId: 1, button: 0, isPrimary: true });
    fireEvent.pointerMove(root, { clientX: 2_000, clientY: 2_000, pointerId: 1, isPrimary: true });

    expect(Number.parseFloat(root.style.width)).toBeLessThanOrEqual(170);
    expect(Number.parseFloat(root.style.height)).toBeLessThanOrEqual(108);
  });

  it('cancels drag and avoids commit on pointer cancel', () => {
    const onMove = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, button: 0, isPrimary: true });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 120, pointerId: 1, isPrimary: true });
    fireEvent.pointerCancel(root, { pointerId: 1, isPrimary: true, pointerType: 'touch' });
    fireEvent.pointerUp(root, { pointerId: 1, isPrimary: true });

    expect(onMove).not.toHaveBeenCalled();
  });

  it('keeps mouse pointer drags alive across pointer cancel until pointer up', () => {
    const onMove = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} />);

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 120, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerCancel(root, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(root, { pointerId: 1, pointerType: 'mouse' });

    expect(onMove).toHaveBeenCalledTimes(1);
  });

  for (const resizeCase of [
    { handle: 'e', delta: { x: 30, y: 0 }, expected: { left: 50, top: 200, right: 230, bottom: 100 } },
    { handle: 'w', delta: { x: -20, y: 0 }, expected: { left: 30, top: 200, right: 200, bottom: 100 } },
    { handle: 'n', delta: { x: 0, y: -20 }, expected: { left: 50, top: 220, right: 200, bottom: 100 } },
    { handle: 's', delta: { x: 0, y: 40 }, expected: { left: 50, top: 200, right: 200, bottom: 60 } },
    { handle: 'ne', delta: { x: 30, y: -20 }, expected: { left: 50, top: 220, right: 230, bottom: 100 } },
    { handle: 'nw', delta: { x: -20, y: -20 }, expected: { left: 30, top: 220, right: 200, bottom: 100 } },
    { handle: 'se', delta: { x: 30, y: 40 }, expected: { left: 50, top: 200, right: 230, bottom: 60 } },
    { handle: 'sw', delta: { x: -20, y: 40 }, expected: { left: 30, top: 200, right: 200, bottom: 60 } },
  ] as const) {
    it(`commits ${resizeCase.handle} resize while preserving the opposite edges`, () => {
      const onResize = vi.fn();
      render(<SelectionOverlay {...defaultProps} onResize={onResize} />);

      dragBoxHandle(resizeCase.handle, resizeCase.delta);

      expect(onResize).toHaveBeenCalledTimes(1);
      expect(onResize).toHaveBeenCalledWith(resizeCase.expected);
    });
  }

  it('disables move/resize interactions when interactive=false', () => {
    render(<SelectionOverlay {...defaultProps} interactive={false} />);

    const root = screen.getByTestId('selection-overlay');
    const body = screen.getByTestId('selection-body');

    expect((root as HTMLElement).style.pointerEvents).toBe('none');
    expect((body as HTMLElement).style.cursor).toBe('default');
    expect((body as HTMLElement).style.border).toContain('dashed');
    expect(screen.queryByTestId('handle-nw')).toBeNull();
  });

  it('locks non-interactive visual styling contract', () => {
    const { rerender } = render(<SelectionOverlay {...defaultProps} interactive={false} />);

    const readVisualContract = () => {
      const root = screen.getByTestId('selection-overlay') as HTMLDivElement;
      const body = screen.getByTestId('selection-body') as HTMLDivElement;
      return {
        rootPointerEvents: root.style.pointerEvents,
        rootTouchAction: root.style.touchAction,
        bodyBorder: body.style.border,
        bodyBackground: body.style.backgroundColor,
        bodyCursor: body.style.cursor,
      };
    };

    expect(readVisualContract()).toMatchInlineSnapshot(`
      {
        "bodyBackground": "rgba(15, 23, 42, 0.03)",
        "bodyBorder": "1px dashed rgba(15, 23, 42, 0.28)",
        "bodyCursor": "default",
        "rootPointerEvents": "none",
        "rootTouchAction": "auto",
      }
    `);

    rerender(
      <SelectionOverlay {...defaultProps} interactive={false} rect={{ left: 30, top: 230, right: 240, bottom: 120 }} />,
    );

    expect(readVisualContract()).toMatchInlineSnapshot(`
      {
        "bodyBackground": "rgba(15, 23, 42, 0.03)",
        "bodyBorder": "1px dashed rgba(15, 23, 42, 0.28)",
        "bodyCursor": "default",
        "rootPointerEvents": "none",
        "rootTouchAction": "auto",
      }
    `);
  });

  it('constrains rectangle resize to a square when Shift is held on a side handle', () => {
    const onResize = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'rectangle',
          strokeWidth: 1,
        }}
        onResize={onResize}
      />,
    );

    dragBoxHandle('e', { x: 30, y: 0 }, { shiftKey: true });

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({
      left: 50,
      top: 240,
      right: 230,
      bottom: 60,
    });
  });

  it('constrains ellipse resize to a circle when Shift is held on a corner handle', () => {
    const onResize = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'ellipse',
          strokeWidth: 1,
        }}
        onResize={onResize}
      />,
    );

    dragBoxHandle('se', { x: 30, y: 10 }, { shiftKey: true });

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({
      left: 50,
      top: 200,
      right: 230,
      bottom: 20,
    });
  });

  it('renders highlight selections using markup quads instead of generic box chrome', () => {
    render(
      <SelectionOverlay
        {...defaultProps}
        interactive={false}
        appearance={{
          kind: 'text-markup',
          markupType: 'highlight',
          quads: [{ x1: 50, y1: 100, x2: 200, y2: 100, x3: 50, y3: 200, x4: 200, y4: 200 }],
        }}
      />,
    );

    const body = screen.getByTestId('selection-body');
    expect(body.dataset.selectionKind).toBe('text-markup');
    expect(body.tagName.toLowerCase()).toBe('svg');
    expect(screen.getByTestId('selection-markup-overlay')).toBeDefined();
    expect(screen.getAllByTestId('selection-markup-segment')).toHaveLength(1);
    expect(screen.queryByTestId('handle-nw')).toBeNull();
    expect(body.style.border).toBe('');
  });

  it('renders strikeout selections as line markup without bounds styling', () => {
    render(
      <SelectionOverlay
        {...defaultProps}
        interactive={false}
        appearance={{
          kind: 'text-markup',
          markupType: 'strikeout',
          quads: [{ x1: 50, y1: 100, x2: 200, y2: 100, x3: 50, y3: 200, x4: 200, y4: 200 }],
        }}
      />,
    );

    expect(screen.getAllByTestId('selection-markup-segment')).toHaveLength(1);
    expect(screen.queryByTestId('handle-se')).toBeNull();
  });

  it('renders squiggly selections as SVG paths', () => {
    render(
      <SelectionOverlay
        {...defaultProps}
        interactive={false}
        appearance={{
          kind: 'text-markup',
          markupType: 'squiggly',
          quads: [{ x1: 50, y1: 100, x2: 200, y2: 100, x3: 50, y3: 200, x4: 200, y4: 200 }],
        }}
      />,
    );

    const segment = screen.getByTestId('selection-markup-segment');
    expect(segment.tagName.toLowerCase()).toBe('path');
    expect(segment.getAttribute('d')).toContain('L');
  });

  it('renders degenerate squiggly selections as straight line paths', () => {
    render(
      <SelectionOverlay
        {...defaultProps}
        interactive={false}
        appearance={{
          kind: 'text-markup',
          markupType: 'squiggly',
          quads: [{ x1: 100, y1: 150, x2: 100, y2: 150, x3: 100, y3: 160, x4: 100, y4: 160 }],
        }}
      />,
    );

    const segment = screen.getByTestId('selection-markup-segment');
    expect(segment.getAttribute('d')).toContain('L');
  });

  it('renders line selections with endpoint handles only', () => {
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
      />,
    );

    expect(screen.getByTestId('handle-start')).toBeDefined();
    expect(screen.getByTestId('handle-end')).toBeDefined();
    expect(screen.queryByTestId('handle-se')).toBeNull();
    expect(screen.queryByTestId('handle-nw')).toBeNull();
  });

  it('commits line move with endpoint semantics', () => {
    const onMoveLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onMoveLine={onMoveLine}
      />,
    );

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });

    expect(onMoveLine).toHaveBeenCalledTimes(1);
    expect(onMoveLine).toHaveBeenCalledWith({
      start: { x: 80, y: 170 },
      end: { x: 230, y: 70 },
    });
  });

  it('commits line endpoint resize without box handles', () => {
    const onResizeLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onResizeLine={onResizeLine}
      />,
    );

    const handle = screen.getByTestId('handle-end');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(handle, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 230, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });

    expect(onResizeLine).toHaveBeenCalledTimes(1);
    expect(onResizeLine).toHaveBeenCalledWith({
      start: { x: 50, y: 200 },
      end: { x: 230, y: 60 },
    });
  });

  it('falls back to rect move commits when line move callback is not provided', () => {
    const onMove = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onMove={onMove}
      />,
    );

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 130, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({
      left: 80,
      top: 170,
      right: 230,
      bottom: 70,
    });
  });

  it('falls back to rect resize commits when line resize callback is not provided', () => {
    const onResize = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onResize={onResize}
      />,
    );

    const handle = screen.getByTestId('handle-end');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(handle, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 230, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({
      left: 50,
      top: 200,
      right: 230,
      bottom: 60,
    });
  });

  it('snaps line endpoint resize to 45-degree increments when Shift is held', () => {
    const onResizeLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onResizeLine={onResizeLine}
      />,
    );

    const handle = screen.getByTestId('handle-end');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(handle, { clientX: 200, clientY: 100, pointerId: 1, shiftKey: true });
    fireEvent.pointerMove(root, { clientX: 240, clientY: 130, pointerId: 1, shiftKey: true });
    fireEvent.pointerUp(root, { pointerId: 1, shiftKey: true });

    expect(onResizeLine).toHaveBeenCalledTimes(1);
    const resizedLine = onResizeLine.mock.calls[0]?.[0];
    expect(resizedLine).toBeDefined();
    const dx = (resizedLine?.end.x ?? 0) - (resizedLine?.start.x ?? 0);
    const dy = (resizedLine?.end.y ?? 0) - (resizedLine?.start.y ?? 0);
    expect(Math.abs(Math.abs(dx) - Math.abs(dy))).toBeLessThan(0.01);
  });

  it('ignores secondary pointer starts for line move and resize handles', () => {
    const onMoveLine = vi.fn();
    const onResizeLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onMoveLine={onMoveLine}
        onResizeLine={onResizeLine}
      />,
    );

    const body = screen.getByTestId('selection-body');
    const handle = screen.getByTestId('handle-end');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1, button: 2, pointerType: 'mouse' });
    fireEvent.pointerDown(handle, { clientX: 200, clientY: 100, pointerId: 2, button: 2, pointerType: 'mouse' });
    fireEvent.pointerMove(root, { clientX: 240, clientY: 140, pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(root, { pointerId: 1, pointerType: 'mouse' });

    expect(onMoveLine).not.toHaveBeenCalled();
    expect(onResizeLine).not.toHaveBeenCalled();
  });

  it('ignores secondary mouse starts for box move and resize fallbacks', () => {
    const onMove = vi.fn();
    const onResize = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} onResize={onResize} />);

    fireEvent.mouseDown(screen.getByTestId('selection-body'), { clientX: 100, clientY: 100, button: 1 });
    fireEvent.mouseDown(screen.getByTestId('handle-e'), { clientX: 200, clientY: 150, button: 1 });
    fireEvent.mouseMove(document, { clientX: 140, clientY: 120 });
    fireEvent.mouseUp(document);

    expect(onMove).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('supports mouse-only line move fallback through document events', () => {
    const onMoveLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onMoveLine={onMoveLine}
      />,
    );

    fireEvent.mouseDown(screen.getByTestId('selection-body'), { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(document, { clientX: 120, clientY: 130 });
    fireEvent.mouseUp(document);

    expect(onMoveLine).toHaveBeenCalledWith({
      start: { x: 70, y: 170 },
      end: { x: 220, y: 70 },
    });
  });

  it('supports mouse-only line resize fallback through document events', () => {
    const onResizeLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onResizeLine={onResizeLine}
      />,
    );

    fireEvent.mouseDown(screen.getByTestId('handle-end'), { clientX: 200, clientY: 100, button: 0 });
    fireEvent.mouseMove(document, { clientX: 230, clientY: 140 });
    fireEvent.mouseUp(document);

    expect(onResizeLine).toHaveBeenCalledWith({
      start: { x: 50, y: 200 },
      end: { x: 230, y: 60 },
    });
  });

  it('ignores mismatched pointer ids during active line drags until the owning pointer finishes', () => {
    const onMoveLine = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'line',
          endpoints: {
            start: { x: 50, y: 200 },
            end: { x: 200, y: 100 },
          },
          strokeWidth: 2,
        }}
        onMoveLine={onMoveLine}
      />,
    );

    const body = screen.getByTestId('selection-body');
    const root = screen.getByTestId('selection-overlay');

    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 120, clientY: 120, pointerId: 2 });
    fireEvent.pointerCancel(root, { pointerId: 2, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 120, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(root, { pointerId: 1 });

    expect(onMoveLine).toHaveBeenCalledTimes(1);
  });

  it('supports mouse-only drag fallback through document mousemove and mouseup', () => {
    const onMove = vi.fn();
    render(<SelectionOverlay {...defaultProps} onMove={onMove} />);

    const body = screen.getByTestId('selection-body');

    fireEvent.mouseDown(body, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(document, { clientX: 130, clientY: 120 });
    fireEvent.mouseUp(document);

    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('uses keyboard shift state during mouse-only resize drags', () => {
    const onResize = vi.fn();
    render(
      <SelectionOverlay
        {...defaultProps}
        appearance={{
          kind: 'rectangle',
          strokeWidth: 1,
        }}
        onResize={onResize}
      />,
    );

    const handle = screen.getByTestId('handle-e');

    fireEvent.mouseDown(handle, { clientX: 200, clientY: 150, button: 0 });
    fireEvent.keyDown(document, { key: 'Shift' });
    fireEvent.mouseMove(document, { clientX: 230, clientY: 150, shiftKey: false });
    fireEvent.keyUp(document, { key: 'Shift' });
    fireEvent.mouseUp(document);

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith({
      left: 50,
      top: 240,
      right: 230,
      bottom: 60,
    });
  });
});
