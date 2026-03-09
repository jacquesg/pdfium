import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShapeCreationOverlay } from '../../../../../src/react/editor/components/shape-creation-overlay.js';

const defaultProps = {
  tool: 'rectangle' as const,
  width: 600,
  height: 800,
  scale: 1,
  originalHeight: 792,
};

// happy-dom does not implement setPointerCapture — stub it globally
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

/** Fire a minimal pointer event sequence on an element. */
function pointerSequence(
  el: Element,
  start: { x: number; y: number },
  end: { x: number; y: number },
  options?: { shiftKey?: boolean },
): void {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: start.x, clientY: start.y, shiftKey: options?.shiftKey });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: end.x, clientY: end.y, shiftKey: options?.shiftKey });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: end.x, clientY: end.y, shiftKey: options?.shiftKey });
}

describe('ShapeCreationOverlay', () => {
  describe('container rendering', () => {
    it('renders a div with data-testid="shape-creation-overlay"', () => {
      render(<ShapeCreationOverlay {...defaultProps} />);
      expect(screen.getByTestId('shape-creation-overlay')).toBeDefined();
    });

    it('applies cursor: crosshair style', () => {
      render(<ShapeCreationOverlay {...defaultProps} />);
      const el = screen.getByTestId('shape-creation-overlay') as HTMLDivElement;
      expect(el.style.cursor).toBe('crosshair');
    });
  });

  describe('drag sequence with > 5px movement', () => {
    it('calls onCreate with a Rect on pointer up', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      // getBoundingClientRect returns zeros in happy-dom, so clientX/Y are the screen coords
      pointerSequence(overlay, { x: 10, y: 10 }, { x: 60, y: 80 });

      expect(onCreate).toHaveBeenCalledOnce();
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          left: expect.any(Number),
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
        }),
      );
    });

    it('passes the correct PDF rect to onCreate', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      // container.getBoundingClientRect() = {left:0, top:0} in happy-dom
      // drag from (10,10) to (60,80): minX=10, minY=10, maxX=60, maxY=80
      // screenToPdf({x:10,y:10},{scale:1,originalHeight:792}) = {x:10, y:782}
      // screenToPdf({x:60,y:80},{scale:1,originalHeight:792}) = {x:60, y:712}
      pointerSequence(overlay, { x: 10, y: 10 }, { x: 60, y: 80 });

      expect(onCreate).toHaveBeenCalledWith({
        left: 10,
        top: 782,
        right: 60,
        bottom: 712,
      });
    });
  });

  describe('drag with < 5px movement', () => {
    it('does NOT call onCreate when movement is too small', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');
      pointerSequence(overlay, { x: 10, y: 10 }, { x: 14, y: 14 });
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('does NOT call onCreate when only one axis exceeds 5px', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');
      // x diff = 50 > 5, y diff = 3 <= 5
      pointerSequence(overlay, { x: 10, y: 10 }, { x: 60, y: 13 });
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('preview element during drag', () => {
    it('shows data-testid="shape-preview" after pointer down + move', () => {
      render(<ShapeCreationOverlay {...defaultProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 50, clientY: 70 });

      expect(screen.getByTestId('shape-preview')).toBeDefined();
    });

    it('removes preview after pointer up', () => {
      render(<ShapeCreationOverlay {...defaultProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 50, clientY: 70 });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 50, clientY: 70 });

      expect(screen.queryByTestId('shape-preview')).toBeNull();
    });

    it('removes preview on pointer cancel', () => {
      render(<ShapeCreationOverlay {...defaultProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 50, clientY: 70 });
      expect(screen.getByTestId('shape-preview')).toBeDefined();

      fireEvent.pointerCancel(overlay, { pointerId: 1, pointerType: 'touch' });
      expect(screen.queryByTestId('shape-preview')).toBeNull();
    });

    it('ignores non-primary pointer-down events', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, {
        pointerId: 1,
        clientX: 10,
        clientY: 10,
        button: 2,
        isPrimary: true,
        pointerType: 'mouse',
      });
      fireEvent.pointerMove(overlay, {
        pointerId: 1,
        clientX: 90,
        clientY: 100,
        isPrimary: true,
        pointerType: 'mouse',
      });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 90, clientY: 100, isPrimary: true, pointerType: 'mouse' });

      expect(screen.queryByTestId('shape-preview')).toBeNull();
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('accepts touch pointer-down events even when button is non-zero', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10, button: 2, pointerType: 'touch' });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 100, clientY: 120, pointerType: 'touch' });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 100, clientY: 120, pointerType: 'touch' });

      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('keeps a mouse pointer drag alive across pointercancel until pointerup', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10, pointerType: 'mouse' });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 90, clientY: 100, pointerType: 'mouse' });
      fireEvent.pointerCancel(overlay, { pointerId: 1, pointerType: 'mouse' });
      fireEvent.pointerUp(overlay, { pointerId: 1, clientX: 90, clientY: 100, pointerType: 'mouse' });

      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('circle tool', () => {
    it('renders preview with borderRadius 50% for circle tool', () => {
      render(<ShapeCreationOverlay {...defaultProps} tool="circle" />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 80, clientY: 80 });

      const preview = screen.getByTestId('shape-preview') as HTMLDivElement;
      expect(preview.style.borderRadius).toBe('50%');
    });
  });

  describe('line tool', () => {
    it('renders an SVG with a line element for line tool', () => {
      render(<ShapeCreationOverlay {...defaultProps} tool="line" />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 80, clientY: 80 });

      const preview = screen.getByTestId('shape-preview');
      expect(preview.tagName.toLowerCase()).toBe('svg');
      const lineEl = preview.querySelector('line');
      expect(lineEl).not.toBeNull();
    });

    it('creates a line when one axis is near-zero but drag length is sufficient', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} tool="line" onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      // Mostly horizontal drag (large X delta, tiny Y delta)
      pointerSequence(overlay, { x: 10, y: 10 }, { x: 110, y: 11 });
      expect(onCreate).toHaveBeenCalledOnce();
    });

    it('provides line start/end points in create detail', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} tool="line" onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      pointerSequence(overlay, { x: 10, y: 10 }, { x: 110, y: 11 });
      expect(onCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          start: expect.objectContaining({ x: 10, y: 782 }),
          end: expect.objectContaining({ x: 110, y: 781 }),
        }),
      );
    });

    it('snaps line angle when Shift is held', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} tool="line" onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      pointerSequence(overlay, { x: 10, y: 10 }, { x: 110, y: 30 }, { shiftKey: true });
      const detail = onCreate.mock.calls[0]?.[1];
      expect(detail?.start?.y).toBe(detail?.end?.y);
    });

    it('does not create a line when drag length is too small', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} tool="line" onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      pointerSequence(overlay, { x: 10, y: 10 }, { x: 12, y: 12 });
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('rectangle tool', () => {
    it('renders a plain div preview for rectangle tool', () => {
      render(<ShapeCreationOverlay {...defaultProps} tool="rectangle" />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 80, clientY: 80 });

      const preview = screen.getByTestId('shape-preview');
      expect(preview.tagName.toLowerCase()).toBe('div');
      expect(preview.style.borderRadius).toBeFalsy();
    });

    it('constrains to square when Shift is held', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} tool="rectangle" onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      pointerSequence(overlay, { x: 20, y: 20 }, { x: 100, y: 50 }, { shiftKey: true });
      const rect = onCreate.mock.calls[0]?.[0];
      expect(rect).toBeDefined();
      const width = Math.abs(rect.right - rect.left);
      const height = Math.abs(rect.top - rect.bottom);
      expect(Math.abs(width - height)).toBeLessThan(0.01);
    });
  });

  describe('without onCreate', () => {
    it('does not throw when onCreate is not provided', () => {
      render(<ShapeCreationOverlay {...defaultProps} />);
      const overlay = screen.getByTestId('shape-creation-overlay');
      expect(() => pointerSequence(overlay, { x: 10, y: 10 }, { x: 100, y: 100 })).not.toThrow();
    });
  });

  describe('document and lifecycle fallbacks', () => {
    it('supports pointer drag finalisation through document pointerup', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 20, clientY: 20 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 90, clientY: 110 });
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 90, clientY: 110 });

      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('supports mouse-only drag fallback through document mousemove and mouseup', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.mouseDown(overlay, { clientX: 20, clientY: 20, button: 0 });
      fireEvent.mouseMove(document, { clientX: 90, clientY: 110 });
      fireEvent.mouseUp(document, { clientX: 90, clientY: 110 });

      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('ignores secondary mouse-button fallback drags', () => {
      const onCreate = vi.fn();
      render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.mouseDown(overlay, { clientX: 20, clientY: 20, button: 2 });
      fireEvent.mouseMove(document, { clientX: 90, clientY: 110 });
      fireEvent.mouseUp(document, { clientX: 90, clientY: 110 });

      expect(onCreate).not.toHaveBeenCalled();
    });

    it('finalises an active drag during unmount using the last preview position', () => {
      const onCreate = vi.fn();
      const { unmount } = render(<ShapeCreationOverlay {...defaultProps} onCreate={onCreate} />);
      const overlay = screen.getByTestId('shape-creation-overlay');

      fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 70, clientY: 90 });

      unmount();

      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });
});
