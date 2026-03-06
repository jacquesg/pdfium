import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextMarkupOverlay } from '../../../../../src/react/editor/components/text-markup-overlay.js';

const defaultProps = {
  width: 600,
  height: 800,
  scale: 1,
  originalHeight: 792,
  tool: 'highlight' as const,
};

describe('TextMarkupOverlay', () => {
  it('renders a container with pointerEvents: none', () => {
    render(<TextMarkupOverlay {...defaultProps} />);
    const overlay = screen.getByTestId('text-markup-overlay');
    expect(overlay).toBeDefined();
    expect(overlay.style.pointerEvents).toBe('none');
  });

  it('renders with correct dimensions', () => {
    render(<TextMarkupOverlay {...defaultProps} width={500} height={700} />);
    const overlay = screen.getByTestId('text-markup-overlay');
    expect(overlay.style.width).toBe('500px');
    expect(overlay.style.height).toBe('700px');
  });

  it('calls onCreate with correctly converted PDF coordinates', () => {
    const onCreate = vi.fn();
    // scale=1, originalHeight=792 → screenToPdf({x,y}) = {x, 792-y}
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(onCreate).toHaveBeenCalledOnce();
    const [rects, boundingRect] = onCreate.mock.calls[0]!;

    // Single rect: screen (50,100)→(200,120) converts to PDF (50,692)→(200,672)
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });
    expect(boundingRect).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });
  });

  it('computes correct bounding rect from multiple selection rects', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    // Two text lines: line 1 at y=100-120, line 2 at y=130-150
    const mockRange = {
      getClientRects: () => [
        { left: 50, top: 100, right: 300, bottom: 120, width: 250, height: 20 },
        { left: 30, top: 130, right: 200, bottom: 150, width: 170, height: 20 },
      ],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(onCreate).toHaveBeenCalledOnce();
    const [rects, boundingRect] = onCreate.mock.calls[0]!;

    expect(rects).toHaveLength(2);
    // Line 1: screen (50,100)→(300,120) → PDF (50,692)→(300,672)
    expect(rects[0]).toEqual({ left: 50, top: 692, right: 300, bottom: 672 });
    // Line 2: screen (30,130)→(200,150) → PDF (30,662)→(200,642)
    expect(rects[1]).toEqual({ left: 30, top: 662, right: 200, bottom: 642 });
    // Bounding rect: left=min(50,30)=30, top=max(692,662)=692, right=max(300,200)=300, bottom=min(672,642)=642
    expect(boundingRect).toEqual({ left: 30, top: 692, right: 300, bottom: 642 });
  });

  it('applies scale factor correctly in coordinate conversion', () => {
    const onCreate = vi.fn();
    // scale=2, originalHeight=792 → screenToPdf({x,y}) = {x/2, 792 - y/2}
    render(<TextMarkupOverlay {...defaultProps} scale={2} width={1200} height={1600} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 1200, bottom: 1600, width: 1200, height: 1600, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 100, top: 200, right: 400, bottom: 240, width: 300, height: 40 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(onCreate).toHaveBeenCalledOnce();
    const [rects, boundingRect] = onCreate.mock.calls[0]!;

    // screen (100,200)→(400,240) at scale=2: PDF (50, 792-100)→(200, 792-120) = (50,692)→(200,672)
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });
    expect(boundingRect).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });
  });

  it('does not call onCreate when selection is collapsed', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: true,
      rangeCount: 0,
    } as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('does not call onCreate when no selection exists', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    vi.spyOn(document, 'getSelection').mockReturnValue(null as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('does not call onCreate when selection rects are outside the page', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    // Selection rects entirely outside the page
    const mockRange = {
      getClientRects: () => [{ left: 700, top: 900, right: 800, bottom: 920, width: 100, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('clears the selection after creating a markup annotation', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const removeAllRanges = vi.fn();
    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges,
    } as unknown as Selection);

    document.dispatchEvent(new Event('pointerup'));

    expect(removeAllRanges).toHaveBeenCalled();
  });

  it('does not call onCreate when pointerup target is a button', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    // Dispatch pointerup from a button element (simulates releasing on a toolbar button)
    const button = document.createElement('button');
    document.body.appendChild(button);
    try {
      button.dispatchEvent(new Event('pointerup', { bubbles: true }));
      expect(onCreate).not.toHaveBeenCalled();
    } finally {
      button.remove();
    }
  });

  it('does not call onCreate when pointerup target is inside a toolbar', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    // Dispatch pointerup from a span inside a [role="toolbar"]
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    const span = document.createElement('span');
    toolbar.appendChild(span);
    document.body.appendChild(toolbar);
    try {
      span.dispatchEvent(new Event('pointerup', { bubbles: true }));
      expect(onCreate).not.toHaveBeenCalled();
    } finally {
      toolbar.remove();
    }
  });

  it('does not call onCreate when pointerup target is an input control', () => {
    const onCreate = vi.fn();
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      input.dispatchEvent(new Event('pointerup', { bubbles: true }));
      expect(onCreate).not.toHaveBeenCalled();
    } finally {
      input.remove();
    }
  });

  it('processes pre-existing text selection on mount (selection-first flow)', () => {
    const onCreate = vi.fn();
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };

    // Mock BEFORE render so the mount layout effect finds both the selection
    // and a valid bounding rect.
    const rectSpy = vi
      .spyOn(HTMLDivElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(containerRect as DOMRect);

    const removeAllRanges = vi.fn();
    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges,
    } as unknown as Selection);

    // Render — the layout effect should process the existing selection immediately
    render(<TextMarkupOverlay {...defaultProps} onCreate={onCreate} />);

    expect(onCreate).toHaveBeenCalledOnce();
    expect(removeAllRanges).toHaveBeenCalled();

    const [rects, boundingRect] = onCreate.mock.calls[0]!;
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });
    expect(boundingRect).toEqual({ left: 50, top: 692, right: 200, bottom: 672 });

    rectSpy.mockRestore();
  });

  it('uses latest onCreate callback via ref', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = render(<TextMarkupOverlay {...defaultProps} onCreate={firstCallback} />);

    // Re-render with a different callback BEFORE setting up the selection mock.
    // The layout effect re-fires (because onCreate changed) but finds no
    // selection yet, so neither callback is invoked.
    rerender(<TextMarkupOverlay {...defaultProps} onCreate={secondCallback} />);

    // Now set up the selection mock and container rect
    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    // The pointerup handler should use the second (latest) callback
    document.dispatchEvent(new Event('pointerup'));

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledOnce();
  });

  it('re-fires selection-first flow on tool switch', () => {
    const onCreate = vi.fn();

    const { rerender } = render(<TextMarkupOverlay {...defaultProps} tool="highlight" onCreate={onCreate} />);

    // Set up a pre-existing text selection
    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    // Clear any calls from the initial mount
    onCreate.mockClear();

    // Switch tool from highlight → underline.
    // The useLayoutEffect re-fires because the `tool` prop changed,
    // processing the pre-existing selection via the ref callback.
    rerender(<TextMarkupOverlay {...defaultProps} tool="underline" onCreate={onCreate} />);

    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('does NOT re-fire selection-first flow on unrelated re-render', () => {
    const onCreate = vi.fn();

    const { rerender } = render(<TextMarkupOverlay {...defaultProps} tool="highlight" onCreate={onCreate} />);

    // Set up a text selection
    const overlay = screen.getByTestId('text-markup-overlay');
    const containerRect = { left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800, x: 0, y: 0 };
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue(containerRect as DOMRect);

    const mockRange = {
      getClientRects: () => [{ left: 50, top: 100, right: 200, bottom: 120, width: 150, height: 20 }],
    };
    vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    // Clear calls from initial mount
    onCreate.mockClear();

    // Re-render with the SAME tool but a new onCreate reference
    // (simulates an unrelated parent re-render). The effect must NOT re-fire.
    const newOnCreate = vi.fn();
    rerender(<TextMarkupOverlay {...defaultProps} tool="highlight" onCreate={newOnCreate} />);

    expect(newOnCreate).not.toHaveBeenCalled();
  });
});
