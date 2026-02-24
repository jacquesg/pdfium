import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  createMarqueeRect,
  injectInteractionCss,
  type MarqueeRect,
  resolveMarqueeZoom,
  resolvePanScrollPosition,
} from '../internal/interaction-mode-model.js';
import type { ZoomAnchor } from './use-visible-pages.js';

export type InteractionMode = 'pointer' | 'pan' | 'marquee-zoom';

export interface InteractionModeState {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  isDragging: boolean;
  marqueeRect: MarqueeRect | null;
}

export type { MarqueeRect } from '../internal/interaction-mode-model.js';

export function useInteractionMode(
  containerRef: RefObject<HTMLElement | null>,
  options: {
    scale: number;
    setScale: (scale: number) => void;
    scrollMode: 'continuous' | 'single' | 'horizontal';
    zoomAnchorRef?: RefObject<ZoomAnchor | null> | undefined;
  },
): InteractionModeState {
  const [mode, setMode] = useState<InteractionMode>('pointer');
  const [isDragging, setIsDragging] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const marqueeOrigin = useRef({ x: 0, y: 0 });
  const marqueeRectRef = useRef<MarqueeRect | null>(null);
  const fallbackOuterRafRef = useRef<number | null>(null);
  const fallbackInnerRafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const container = containerRef.current;

  const cancelFallbackScroll = useCallback(() => {
    if (fallbackOuterRafRef.current !== null) {
      cancelAnimationFrame(fallbackOuterRafRef.current);
      fallbackOuterRafRef.current = null;
    }
    if (fallbackInnerRafRef.current !== null) {
      cancelAnimationFrame(fallbackInnerRafRef.current);
      fallbackInnerRafRef.current = null;
    }
  }, []);

  const setModeStable = useCallback((next: InteractionMode) => {
    setMode(next);
    setIsDragging(false);
    setMarqueeRect(null);
  }, []);

  // Inject interaction mode CSS rules on mount (independent of theme system)
  useEffect(injectInteractionCss, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: containerRef.current is intentionally read in event guards to ignore stale-container callbacks
  useEffect(() => {
    const el = container;
    // Rebinding listeners (mode/container changes) invalidates any in-flight drag UI state.
    setIsDragging(false);
    marqueeRectRef.current = null;
    setMarqueeRect(null);
    cancelFallbackScroll();

    if (!el) return;
    const isCurrentContainer = () => containerRef.current === el;

    if (mode === 'pointer') {
      el.removeAttribute('data-pdfium-interaction');
      el.style.removeProperty('cursor');
      return;
    }

    if (mode === 'pan') {
      el.setAttribute('data-pdfium-interaction', 'pan');
      el.style.cursor = 'grab';

      const onPointerDown = (startX: number, startY: number) => {
        if (!isCurrentContainer()) return;
        dragStart.current = { x: startX, y: startY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
        setIsDragging(true);
        el.style.cursor = 'grabbing';
      };

      const onPointerMove = (clientX: number, clientY: number) => {
        if (!isCurrentContainer()) return;
        const next = resolvePanScrollPosition(dragStart.current, clientX, clientY);
        el.scrollLeft = next.scrollLeft;
        el.scrollTop = next.scrollTop;
      };

      const onPointerUp = () => {
        if (!isCurrentContainer()) return;
        setIsDragging(false);
        el.style.cursor = 'grab';
      };

      let dragging = false;

      const onMouseDown = (e: MouseEvent) => {
        if (!isCurrentContainer()) return;
        dragging = true;
        onPointerDown(e.clientX, e.clientY);
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isCurrentContainer()) return;
        if (!dragging) return;
        onPointerMove(e.clientX, e.clientY);
      };
      const onMouseUp = () => {
        if (!isCurrentContainer()) return;
        if (!dragging) return;
        dragging = false;
        onPointerUp();
      };

      const onTouchStart = (e: TouchEvent) => {
        if (!isCurrentContainer()) return;
        const touch = e.touches[0];
        if (e.touches.length !== 1 || !touch) return;
        dragging = true;
        onPointerDown(touch.clientX, touch.clientY);
      };
      const onTouchMove = (e: TouchEvent) => {
        if (!isCurrentContainer()) return;
        const touch = e.touches[0];
        if (!dragging || e.touches.length !== 1 || !touch) return;
        e.preventDefault();
        onPointerMove(touch.clientX, touch.clientY);
      };
      const onTouchEnd = () => {
        if (!isCurrentContainer()) return;
        if (!dragging) return;
        dragging = false;
        onPointerUp();
      };

      el.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      el.addEventListener('touchstart', onTouchStart, { passive: false });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: false });

      return () => {
        el.style.cursor = 'grab';
        el.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeAttribute('data-pdfium-interaction');
        el.style.removeProperty('cursor');
      };
    }

    // mode === 'marquee-zoom'
    el.setAttribute('data-pdfium-interaction', 'marquee');
    el.style.cursor = 'crosshair';

    let active = false;

    const onMouseDown = (e: MouseEvent) => {
      if (!isCurrentContainer()) return;
      const rect = el.getBoundingClientRect();
      marqueeOrigin.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      active = true;
      setIsDragging(true);
      setMarqueeRect(null);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isCurrentContainer()) return;
      if (!active) return;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ox = marqueeOrigin.current.x;
      const oy = marqueeOrigin.current.y;
      const next = createMarqueeRect(ox, oy, cx, cy);
      marqueeRectRef.current = next;
      setMarqueeRect(next);
    };

    const onMouseUp = () => {
      if (!isCurrentContainer()) return;
      if (!active) return;
      active = false;
      setIsDragging(false);

      // Read from ref (synchronous, no closure stale data), then clear
      const finalRect = marqueeRectRef.current;
      marqueeRectRef.current = null;
      setMarqueeRect(null);

      if (finalRect) {
        const { scale, setScale, zoomAnchorRef } = optionsRef.current;
        const zoomResolution = resolveMarqueeZoom({
          rect: finalRect,
          scale,
          containerWidth: el.clientWidth,
          containerHeight: el.clientHeight,
          containerScrollLeft: el.scrollLeft,
          containerScrollTop: el.scrollTop,
        });
        if (!zoomResolution) return;

        if (zoomAnchorRef) {
          zoomAnchorRef.current = zoomResolution.anchor;
        }

        setScale(zoomResolution.newScale);

        cancelFallbackScroll();
        fallbackOuterRafRef.current = requestAnimationFrame(() => {
          fallbackOuterRafRef.current = null;
          if (!isCurrentContainer()) return;
          fallbackInnerRafRef.current = requestAnimationFrame(() => {
            fallbackInnerRafRef.current = null;
            if (!isCurrentContainer()) return;
            el.scrollLeft = Math.max(0, zoomResolution.targetScrollLeft);
            el.scrollTop = Math.max(0, zoomResolution.targetScrollTop);
          });
        });
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelFallbackScroll();
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeAttribute('data-pdfium-interaction');
      el.style.removeProperty('cursor');
    };
  }, [mode, container, cancelFallbackScroll]);

  return { mode, setMode: setModeStable, isDragging, marqueeRect };
}
