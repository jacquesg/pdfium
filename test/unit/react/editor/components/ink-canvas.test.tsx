import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InkCanvas } from '../../../../../src/react/editor/components/ink-canvas.js';
import type { InkDrawingActions } from '../../../../../src/react/editor/hooks/use-ink-drawing.js';

function createMockDrawing(): InkDrawingActions {
  return createMockDrawingWithPoints([]);
}

function createMockDrawingWithPoints(points: readonly { x: number; y: number }[]): InkDrawingActions {
  return {
    isDrawing: false,
    points,
    startStroke: vi.fn(),
    addPoint: vi.fn(),
    finishStroke: vi.fn().mockReturnValue([]),
    cancelStroke: vi.fn(),
  };
}

function mockCanvasRect(canvas: Element): void {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 600,
    height: 800,
    top: 0,
    right: 600,
    bottom: 800,
    left: 0,
    toJSON: () => ({}),
  });
}

describe('InkCanvas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders SVG element', () => {
    const drawing = createMockDrawing();
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    expect(screen.getByTestId('ink-canvas')).toBeDefined();
  });

  it('ignores secondary mouse button pointer down', () => {
    const drawing = createMockDrawing();
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 2, clientX: 10, clientY: 20 });

    expect(drawing.startStroke).not.toHaveBeenCalled();
  });

  it('resets active pointer on pointer up even when drawing already stopped', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    drawing.isDrawing = false;
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 30, clientY: 40 });

    expect(drawing.finishStroke).not.toHaveBeenCalled();
    expect(drawing.startStroke).toHaveBeenCalledTimes(2);
  });

  it('cancels stroke on pointercancel and allows subsequent stroke', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    drawing.isDrawing = true;
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerCancel(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 30, clientY: 40 });

    expect(drawing.cancelStroke).toHaveBeenCalledOnce();
    expect(drawing.startStroke).toHaveBeenCalledTimes(2);
  });

  it('ignores move/up events from non-active pointer id', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    drawing.isDrawing = true;
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 11, clientY: 21 });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 12, clientY: 22 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 12, clientY: 22 });

    expect(drawing.addPoint).not.toHaveBeenCalled();
    expect(drawing.finishStroke).toHaveBeenCalledTimes(1);
  });

  it('ignores a second pointer-down while a stroke is already active', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 30, clientY: 40 });

    expect(drawing.startStroke).toHaveBeenCalledTimes(1);
  });

  it('ignores pointer moves while the drawing session is inactive', () => {
    const drawing = createMockDrawing();
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 20, clientY: 30 });

    expect(drawing.addPoint).not.toHaveBeenCalled();
  });

  it('ignores pointer cancel from a different pointer id', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    drawing.isDrawing = true;
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerCancel(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });

    expect(drawing.cancelStroke).not.toHaveBeenCalled();
  });

  it('cancels the active stroke when pointer capture is lost', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    drawing.isDrawing = true;
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.lostPointerCapture(canvas);
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 30, clientY: 40 });

    expect(drawing.cancelStroke).toHaveBeenCalledOnce();
    expect(drawing.startStroke).toHaveBeenCalledTimes(2);
  });

  it('does not release pointer capture when the element reports that it does not hold capture', () => {
    const drawing = createMockDrawing() as InkDrawingActions & { isDrawing: boolean };
    drawing.isDrawing = true;
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);
    const releasePointerCapture = vi.fn();
    const hasPointerCapture = vi.fn().mockReturnValue(false);
    Object.defineProperty(canvas, 'releasePointerCapture', { value: releasePointerCapture, configurable: true });
    Object.defineProperty(canvas, 'hasPointerCapture', { value: hasPointerCapture, configurable: true });

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });

    expect(hasPointerCapture).toHaveBeenCalledWith(1);
    expect(releasePointerCapture).not.toHaveBeenCalled();
  });

  it('continues drawing when setPointerCapture is unavailable on the target element', () => {
    const drawing = createMockDrawing();
    render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const canvas = screen.getByTestId('ink-canvas');
    mockCanvasRect(canvas);
    Object.defineProperty(canvas, 'setPointerCapture', { value: undefined, configurable: true });

    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 20 });

    expect(drawing.startStroke).toHaveBeenCalledWith({ x: 10, y: 20 });
  });

  it('renders the in-progress stroke path from drawing points', () => {
    const drawing = createMockDrawingWithPoints([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]);

    const { container } = render(<InkCanvas width={600} height={800} drawing={drawing} />);

    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toBe('M 10,20 L 30,40 L 50,60');
  });
});
