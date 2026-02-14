import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

const { useInteractionMode } = await import('../../../../src/react/hooks/use-interaction-mode.js');

// Uses a real DOM element so addEventListener/dispatchEvent work end-to-end.
function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    clientWidth: { value: 800, configurable: true },
    clientHeight: { value: 600, configurable: true },
    scrollLeft: { value: 0, writable: true, configurable: true },
    scrollTop: { value: 0, writable: true, configurable: true },
  });
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function makeRef(el: HTMLElement): RefObject<HTMLElement | null> {
  return { current: el };
}

function fireMouseDown(target: EventTarget, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX, clientY }));
}

function fireMouseMove(clientX: number, clientY: number): void {
  window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX, clientY }));
}

function fireMouseUp(): void {
  window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
}

function fireTouchStart(target: HTMLElement, clientX: number, clientY: number): void {
  const touch = new Touch({ identifier: 1, target, clientX, clientY });
  target.dispatchEvent(
    new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch], changedTouches: [touch] }),
  );
}

function fireTouchStartMulti(target: HTMLElement): void {
  const first = new Touch({ identifier: 1, target, clientX: 100, clientY: 100 });
  const second = new Touch({ identifier: 2, target, clientX: 120, clientY: 120 });
  target.dispatchEvent(
    new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [first, second],
      changedTouches: [first, second],
    }),
  );
}

function fireTouchMoveMulti(target: HTMLElement): void {
  const first = new Touch({ identifier: 1, target, clientX: 60, clientY: 60 });
  const second = new Touch({ identifier: 2, target, clientX: 80, clientY: 80 });
  target.dispatchEvent(
    new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [first, second],
      changedTouches: [first, second],
    }),
  );
}

function fireTouchMove(target: HTMLElement, clientX: number, clientY: number): void {
  const touch = new Touch({ identifier: 1, target, clientX, clientY });
  target.dispatchEvent(
    new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch], changedTouches: [touch] }),
  );
}

function fireTouchEnd(target: HTMLElement): void {
  target.dispatchEvent(
    new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [] }),
  );
}

describe('useInteractionMode', () => {
  let container: HTMLElement;
  let containerRef: RefObject<HTMLElement | null>;
  let setScale: Mock<(scale: number) => void>;

  beforeEach(() => {
    container = makeContainer();
    containerRef = makeRef(container);
    setScale = vi.fn<(scale: number) => void>();
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('defaults to pointer mode', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      expect(result.current.mode).toBe('pointer');
    });

    it('defaults isDragging to false', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      expect(result.current.isDragging).toBe(false);
    });

    it('defaults marqueeRect to null', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      expect(result.current.marqueeRect).toBeNull();
    });

    it('does not set data-pdfium-interaction in pointer mode', () => {
      renderHook(() => useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }));
      expect(container.hasAttribute('data-pdfium-interaction')).toBe(false);
    });
  });

  describe('setMode transitions', () => {
    it('transitions from pointer to pan', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      expect(result.current.mode).toBe('pan');
    });

    it('transitions from pointer to marquee-zoom', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      expect(result.current.mode).toBe('marquee-zoom');
    });

    it('transitions back to pointer from pan', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => result.current.setMode('pointer'));
      expect(result.current.mode).toBe('pointer');
    });

    it('transitions from pan to marquee-zoom', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => result.current.setMode('marquee-zoom'));
      expect(result.current.mode).toBe('marquee-zoom');
    });

    it('resets isDragging when mode changes', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireMouseDown(container, 0, 0));
      expect(result.current.isDragging).toBe(true);
      act(() => result.current.setMode('pointer'));
      expect(result.current.isDragging).toBe(false);
    });

    it('resets marqueeRect when mode changes', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      act(() => fireMouseMove(50, 50));
      expect(result.current.marqueeRect).not.toBeNull();
      act(() => result.current.setMode('pointer'));
      expect(result.current.marqueeRect).toBeNull();
    });
  });

  describe('pan mode', () => {
    it('sets data-pdfium-interaction="pan" on container', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      expect(container.getAttribute('data-pdfium-interaction')).toBe('pan');
    });

    it('sets cursor to grab', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      expect(container.style.cursor).toBe('grab');
    });

    it('sets isDragging true on mousedown', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireMouseDown(container, 100, 100));
      expect(result.current.isDragging).toBe(true);
    });

    it('changes cursor to grabbing on mousedown', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireMouseDown(container, 100, 100));
      expect(container.style.cursor).toBe('grabbing');
    });

    it('updates scroll position on mousemove after mousedown', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      container.scrollLeft = 200;
      container.scrollTop = 300;
      act(() => result.current.setMode('pan'));
      act(() => fireMouseDown(container, 100, 100));
      // dx = 80-100 = -20 → scrollLeft = 200 - (-20) = 220
      // dy = 70-100 = -30 → scrollTop  = 300 - (-30) = 330
      act(() => fireMouseMove(80, 70));
      expect(container.scrollLeft).toBe(220);
      expect(container.scrollTop).toBe(330);
    });

    it('does not scroll on mousemove without prior mousedown', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      container.scrollLeft = 100;
      container.scrollTop = 100;
      act(() => result.current.setMode('pan'));
      act(() => fireMouseMove(50, 50));
      expect(container.scrollLeft).toBe(100);
      expect(container.scrollTop).toBe(100);
    });

    it('sets isDragging false on mouseup', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireMouseDown(container, 100, 100));
      act(() => fireMouseUp());
      expect(result.current.isDragging).toBe(false);
    });

    it('restores cursor to grab on mouseup', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireMouseDown(container, 100, 100));
      act(() => fireMouseUp());
      expect(container.style.cursor).toBe('grab');
    });

    it('sets isDragging true on single-finger touchstart', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireTouchStart(container, 100, 100));
      expect(result.current.isDragging).toBe(true);
    });

    it('updates scroll position on touchmove after touchstart', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      container.scrollLeft = 0;
      container.scrollTop = 0;
      act(() => result.current.setMode('pan'));
      act(() => fireTouchStart(container, 100, 100));
      // dx = 60-100 = -40 → scrollLeft = 0-(-40) = 40
      // dy = 60-100 = -40 → scrollTop  = 0-(-40) = 40
      act(() => fireTouchMove(container, 60, 60));
      expect(container.scrollLeft).toBe(40);
      expect(container.scrollTop).toBe(40);
    });

    it('sets isDragging false on touchend', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireTouchStart(container, 100, 100));
      act(() => fireTouchEnd(container));
      expect(result.current.isDragging).toBe(false);
    });

    it('restores cursor to grab on touchend', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => fireTouchStart(container, 100, 100));
      act(() => fireTouchEnd(container));
      expect(container.style.cursor).toBe('grab');
    });

    it('ignores multi-touch pan start and move events', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      container.scrollLeft = 100;
      container.scrollTop = 100;
      act(() => result.current.setMode('pan'));

      act(() => fireTouchStartMulti(container));
      expect(result.current.isDragging).toBe(false);

      act(() => fireTouchMoveMulti(container));
      expect(container.scrollLeft).toBe(100);
      expect(container.scrollTop).toBe(100);
    });
  });

  describe('pointer mode cleanup', () => {
    it('removes data-pdfium-interaction when switching back to pointer', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => result.current.setMode('pointer'));
      expect(container.hasAttribute('data-pdfium-interaction')).toBe(false);
    });

    it('removes cursor style when switching back to pointer', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      act(() => result.current.setMode('pointer'));
      expect(container.style.cursor).toBe('');
    });
  });

  describe('marquee-zoom mode', () => {
    it('sets data-pdfium-interaction="marquee" on container', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      expect(container.getAttribute('data-pdfium-interaction')).toBe('marquee');
    });

    it('sets cursor to crosshair', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      expect(container.style.cursor).toBe('crosshair');
    });

    it('sets isDragging true on mousedown', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      expect(result.current.isDragging).toBe(true);
    });

    it('produces marqueeRect with correct x, y, width, height on mousemove', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      // origin = clientX - rect.left = 50 - 0 = 50
      act(() => fireMouseDown(container, 50, 50));
      // cx = 150 - 0 = 150, cy = 200 - 0 = 200
      act(() => fireMouseMove(150, 200));
      const rect = result.current.marqueeRect;
      expect(rect).not.toBeNull();
      expect(rect?.x).toBe(50);
      expect(rect?.y).toBe(50);
      expect(rect?.width).toBe(100);
      expect(rect?.height).toBe(150);
    });

    it('handles reverse direction drag (right-to-left, bottom-to-top)', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 200, 200));
      act(() => fireMouseMove(100, 100));
      const rect = result.current.marqueeRect;
      expect(rect).not.toBeNull();
      expect(rect?.x).toBe(100);
      expect(rect?.y).toBe(100);
      expect(rect?.width).toBe(100);
      expect(rect?.height).toBe(100);
    });

    it('sets isDragging false on mouseup', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      act(() => fireMouseMove(100, 100));
      act(() => fireMouseUp());
      expect(result.current.isDragging).toBe(false);
    });

    it('clears marqueeRect on mouseup', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      act(() => fireMouseMove(100, 100));
      act(() => fireMouseUp());
      expect(result.current.marqueeRect).toBeNull();
    });

    it('ignores drags smaller than 5px in both dimensions', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      // 3px × 3px — below 5px threshold in both axes
      act(() => fireMouseMove(13, 13));
      act(() => fireMouseUp());
      expect(setScale).not.toHaveBeenCalled();
    });

    it('ignores drag when only width exceeds threshold but height does not', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      // 20px wide, 3px tall — height below threshold
      act(() => fireMouseMove(30, 13));
      act(() => fireMouseUp());
      expect(setScale).not.toHaveBeenCalled();
    });

    it('ignores drag when only height exceeds threshold but width does not', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 10, 10));
      // 3px wide, 20px tall — width below threshold
      act(() => fireMouseMove(13, 30));
      act(() => fireMouseUp());
      expect(setScale).not.toHaveBeenCalled();
    });

    it('calls setScale with correct zoom when drag exceeds threshold', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      // container: clientWidth=800, clientHeight=600, scale=1
      // marquee: x=100, y=100, width=200, height=150
      // newScale = min(800/200, 600/150) * 1 = min(4, 4) * 1 = 4
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 100, 100));
      act(() => fireMouseMove(300, 250));
      act(() => fireMouseUp());
      expect(setScale).toHaveBeenCalledOnce();
      expect(setScale).toHaveBeenCalledWith(4);
    });

    it('selects the limiting axis for zoom (height-constrained)', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      // marquee: width=400, height=400
      // min(800/400, 600/400) = min(2, 1.5) = 1.5
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 0, 0));
      act(() => fireMouseMove(400, 400));
      act(() => fireMouseUp());
      expect(setScale).toHaveBeenCalledWith(1.5);
    });

    it('sets zoomAnchorRef to centre marquee in viewport after zoom', () => {
      const zoomAnchorRef: RefObject<import('../../../../src/react/hooks/use-visible-pages.js').ZoomAnchor | null> = {
        current: null,
      };
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous', zoomAnchorRef }),
      );
      // marquee: viewport-relative x=100, y=100, width=200, height=150 → newScale=4
      // marqueeCentreX = 100 + 100 = 200, marqueeCentreY = 100 + 75 = 175
      // ratio = 4
      // cursorX = containerW/2 = 400, cursorY = containerH/2 = 300
      // scrollLeft = 200 + 0 - 400 = -200, scrollTop = 175 + 0 - 300 = -125
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 100, 100));
      act(() => fireMouseMove(300, 250));
      act(() => fireMouseUp());

      // Anchor should centre the marquee selection in the viewport
      expect(zoomAnchorRef.current).not.toBeNull();
      expect(zoomAnchorRef.current?.cursorX).toBe(400); // viewport centre X
      expect(zoomAnchorRef.current?.cursorY).toBe(300); // viewport centre Y
      expect(zoomAnchorRef.current?.ratio).toBe(4);
      expect(zoomAnchorRef.current?.scrollLeft).toBe(-200);
      expect(zoomAnchorRef.current?.scrollTop).toBe(-125);
    });

    it('does not call setScale when no mousemove occurs before mouseup', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseDown(container, 50, 50));
      act(() => fireMouseUp());
      expect(setScale).not.toHaveBeenCalled();
    });

    it('does not update scroll without a prior mousedown', () => {
      const { result } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      act(() => fireMouseMove(100, 100));
      expect(result.current.marqueeRect).toBeNull();
    });
  });

  describe('interaction CSS injection', () => {
    afterEach(() => {
      // Clean up injected style element between tests
      document.getElementById('pdfium-interaction-css')?.remove();
    });

    it('injects a <style> element with interaction mode CSS on mount', () => {
      renderHook(() => useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }));
      const style = document.getElementById('pdfium-interaction-css');
      expect(style).not.toBeNull();
      expect(style?.tagName).toBe('STYLE');
    });

    it('CSS disables pointer-events on text layer in pan mode with !important', () => {
      renderHook(() => useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }));
      const style = document.getElementById('pdfium-interaction-css');
      expect(style?.textContent).toContain('[data-pdfium-interaction="pan"] .pdfium-text-layer');
      expect(style?.textContent).toContain('pointer-events: none !important');
      expect(style?.textContent).toContain('cursor: inherit !important');
    });

    it('CSS disables pointer-events on text layer in marquee mode with !important', () => {
      renderHook(() => useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }));
      const style = document.getElementById('pdfium-interaction-css');
      expect(style?.textContent).toContain('[data-pdfium-interaction="marquee"] .pdfium-text-layer');
    });

    it('CSS disables pointer-events on links in pan and marquee modes with !important', () => {
      renderHook(() => useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }));
      const style = document.getElementById('pdfium-interaction-css');
      expect(style?.textContent).toContain('[data-pdfium-interaction="pan"] a { pointer-events: none !important');
      expect(style?.textContent).toContain('[data-pdfium-interaction="marquee"] a { pointer-events: none !important');
    });

    it('does not duplicate the style element on multiple mounts', () => {
      const { unmount } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      unmount();
      renderHook(() => useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }));
      const styles = document.querySelectorAll('#pdfium-interaction-css');
      expect(styles.length).toBe(1);
    });
  });

  describe('cleanup on unmount', () => {
    it('removes data-pdfium-interaction on unmount in pan mode', () => {
      const { result, unmount } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      unmount();
      expect(container.hasAttribute('data-pdfium-interaction')).toBe(false);
    });

    it('removes cursor style on unmount in pan mode', () => {
      const { result, unmount } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('pan'));
      unmount();
      expect(container.style.cursor).toBe('');
    });

    it('removes data-pdfium-interaction on unmount in marquee-zoom mode', () => {
      const { result, unmount } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      unmount();
      expect(container.hasAttribute('data-pdfium-interaction')).toBe(false);
    });

    it('removes cursor style on unmount in marquee-zoom mode', () => {
      const { result, unmount } = renderHook(() =>
        useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
      );
      act(() => result.current.setMode('marquee-zoom'));
      unmount();
      expect(container.style.cursor).toBe('');
    });
  });

  it('rebinds interaction listeners when containerRef.current changes', () => {
    const secondContainer = makeContainer();
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('pan'));
    act(() => fireMouseDown(container, 100, 100));
    act(() => fireMouseMove(80, 70));
    expect(container.scrollLeft).toBe(20);
    expect(container.scrollTop).toBe(30);

    act(() => fireMouseUp());
    containerRef.current = secondContainer;
    rerender();

    act(() => fireMouseDown(secondContainer, 100, 100));
    act(() => fireMouseMove(80, 70));
    expect(secondContainer.scrollLeft).toBe(20);
    expect(secondContainer.scrollTop).toBe(30);

    secondContainer.remove();
  });

  it('ignores stale pan mousemove handler after container ref switches', () => {
    const secondContainer = makeContainer();
    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('pan'));
    const staleMouseMoveHandler = addWindowListenerSpy.mock.calls.find(
      ([event]) => event === 'mousemove',
    )?.[1] as EventListener;
    expect(staleMouseMoveHandler).toBeTypeOf('function');

    act(() => fireMouseDown(container, 100, 100));
    containerRef.current = secondContainer;
    rerender();

    act(() => {
      staleMouseMoveHandler(new MouseEvent('mousemove', { clientX: 80, clientY: 70 }));
    });

    expect(container.scrollLeft).toBe(0);
    expect(container.scrollTop).toBe(0);

    addWindowListenerSpy.mockRestore();
    secondContainer.remove();
  });

  it('resets pan drag state when container ref switches mid-drag', () => {
    const secondContainer = makeContainer();
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('pan'));
    act(() => fireMouseDown(container, 100, 100));
    expect(result.current.isDragging).toBe(true);

    containerRef.current = secondContainer;
    rerender();

    expect(result.current.isDragging).toBe(false);
    secondContainer.remove();
  });

  it('ignores stale marquee fallback callbacks after container ref switches', () => {
    let rafId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    });
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });

    const secondContainer = makeContainer();
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('marquee-zoom'));
    act(() => fireMouseDown(container, 100, 100));
    act(() => fireMouseMove(300, 250));
    act(() => fireMouseUp());

    const staleOuterRaf = Array.from(rafCallbacks.values())[0];
    expect(staleOuterRaf).toBeTypeOf('function');

    containerRef.current = secondContainer;
    rerender();

    act(() => {
      staleOuterRaf?.(0);
    });

    const staleInnerRaf = Array.from(rafCallbacks.values())[0];
    act(() => {
      staleInnerRaf?.(0);
    });

    expect(container.scrollLeft).toBe(0);
    expect(container.scrollTop).toBe(0);

    cancelSpy.mockRestore();
    rafSpy.mockRestore();
    secondContainer.remove();
  });

  it('resets marquee drag state when container ref switches mid-drag', () => {
    const secondContainer = makeContainer();
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('marquee-zoom'));
    act(() => fireMouseDown(container, 100, 100));
    act(() => fireMouseMove(300, 250));
    expect(result.current.isDragging).toBe(true);
    expect(result.current.marqueeRect).not.toBeNull();

    containerRef.current = secondContainer;
    rerender();

    expect(result.current.isDragging).toBe(false);
    expect(result.current.marqueeRect).toBeNull();
    secondContainer.remove();
  });

  it('cancels marquee fallback scroll callbacks on unmount', () => {
    let rafId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    });
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });

    const { result, unmount } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('marquee-zoom'));
    act(() => fireMouseDown(container, 100, 100));
    act(() => fireMouseMove(300, 250));
    act(() => fireMouseUp());

    unmount();

    for (const cb of rafCallbacks.values()) cb(0);

    expect(container.scrollLeft).toBe(0);
    expect(container.scrollTop).toBe(0);
    expect(cancelSpy).toHaveBeenCalled();

    cancelSpy.mockRestore();
    rafSpy.mockRestore();
  });

  it('ignores stale marquee mouse handlers after container ref switches', () => {
    const secondContainer = makeContainer();
    const addContainerListenerSpy = vi.spyOn(container, 'addEventListener');
    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('marquee-zoom'));
    const staleMouseDown = addContainerListenerSpy.mock.calls.find(
      ([event]) => event === 'mousedown',
    )?.[1] as EventListener;
    const staleMouseMove = addWindowListenerSpy.mock.calls.find(
      ([event]) => event === 'mousemove',
    )?.[1] as EventListener;
    const staleMouseUp = addWindowListenerSpy.mock.calls.find(([event]) => event === 'mouseup')?.[1] as EventListener;
    expect(staleMouseDown).toBeTypeOf('function');
    expect(staleMouseMove).toBeTypeOf('function');
    expect(staleMouseUp).toBeTypeOf('function');

    containerRef.current = secondContainer;
    rerender();

    act(() => {
      staleMouseDown(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
      staleMouseMove(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }));
      staleMouseUp(new MouseEvent('mouseup'));
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.marqueeRect).toBeNull();
    expect(setScale).not.toHaveBeenCalled();

    addContainerListenerSpy.mockRestore();
    addWindowListenerSpy.mockRestore();
    secondContainer.remove();
  });

  it('does not change pan state on mouseup/touchend when dragging never started', () => {
    const { result } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );
    act(() => result.current.setMode('pan'));

    act(() => fireMouseUp());
    expect(result.current.isDragging).toBe(false);

    act(() => fireTouchEnd(container));
    expect(result.current.isDragging).toBe(false);
  });

  it('ignores stale pan mouseup/touch handlers after container ref switches', () => {
    const secondContainer = makeContainer();
    const addWindowListenerSpy = vi.spyOn(window, 'addEventListener');
    const addContainerListenerSpy = vi.spyOn(container, 'addEventListener');
    const { result, rerender } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );

    act(() => result.current.setMode('pan'));
    const staleMouseUp = addWindowListenerSpy.mock.calls.find(([event]) => event === 'mouseup')?.[1] as EventListener;
    const staleTouchStart = addContainerListenerSpy.mock.calls.find(
      ([event]) => event === 'touchstart',
    )?.[1] as EventListener;
    const staleTouchMove = addContainerListenerSpy.mock.calls.find(
      ([event]) => event === 'touchmove',
    )?.[1] as EventListener;
    const staleTouchEnd = addContainerListenerSpy.mock.calls.find(
      ([event]) => event === 'touchend',
    )?.[1] as EventListener;

    containerRef.current = secondContainer;
    rerender();

    act(() => {
      staleMouseUp(new MouseEvent('mouseup', { bubbles: true }));
      staleTouchStart(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 1, target: container, clientX: 10, clientY: 10 })],
        }),
      );
      staleTouchMove(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 1, target: container, clientX: 20, clientY: 20 })],
          cancelable: true,
        }),
      );
      staleTouchEnd(new TouchEvent('touchend'));
    });

    expect(container.scrollLeft).toBe(0);
    expect(container.scrollTop).toBe(0);
    expect(result.current.isDragging).toBe(false);
    addWindowListenerSpy.mockRestore();
    addContainerListenerSpy.mockRestore();
    secondContainer.remove();
  });

  it('does not zoom on marquee mouseup when no active drag exists', () => {
    const { result } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );
    act(() => result.current.setMode('marquee-zoom'));
    act(() => fireMouseUp());
    expect(setScale).not.toHaveBeenCalled();
  });

  it('cancels inner marquee fallback callback when mode changes after outer callback schedules it', () => {
    let rafId = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = ++rafId;
      callbacks.set(id, cb);
      return id;
    });
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id: number) => {
      callbacks.delete(id);
    });

    const { result } = renderHook(() =>
      useInteractionMode(containerRef, { scale: 1, setScale, scrollMode: 'continuous' }),
    );
    act(() => result.current.setMode('marquee-zoom'));
    act(() => fireMouseDown(container, 100, 100));
    act(() => fireMouseMove(300, 250));
    act(() => fireMouseUp());

    const outer = Array.from(callbacks.values())[0];
    act(() => {
      outer?.(0);
    });

    act(() => result.current.setMode('pointer'));
    expect(cancelSpy).toHaveBeenCalled();
    callbacks.forEach((cb) => {
      cb(0);
    });

    cancelSpy.mockRestore();
    rafSpy.mockRestore();
  });
});
