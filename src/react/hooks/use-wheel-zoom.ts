'use client';

import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ZoomAnchor } from './use-visible-pages.js';

interface UseWheelZoomOptions {
  /** Current scale value (used to compute proportional zoom). */
  scale: number;
  /** Setter for the new scale (should clamp to min/max). */
  setScale: (scale: number) => void;
  /** Enable/disable the wheel zoom handler. Default: true. */
  enabled?: boolean;
  /** Zoom factor per wheel tick. Default: 1.1 (10% per tick). */
  factor?: number;
  /**
   * Ref shared with useVisiblePages for cursor-anchored zoom.
   * When provided, the handler writes anchor data so the layout effect in
   * useVisiblePages can keep the point under the cursor stationary.
   */
  zoomAnchorRef?: RefObject<ZoomAnchor | null>;
  /** Called when the user zooms via wheel (e.g. to clear active fit mode). */
  onManualZoom?: () => void;
}

/**
 * Adds Ctrl/Cmd + mouse-wheel zoom to a container element.
 *
 * Calls `preventDefault()` on matching wheel events to suppress the browser's
 * native page zoom. The zoom is proportional: each wheel tick multiplies or
 * divides the current scale by `factor`.
 *
 * When `zoomAnchorRef` is provided, writes cursor position data so that
 * `useVisiblePages` can keep the content under the cursor stationary during zoom.
 *
 * Handles late-mounting containers: if the ref target is null on first render
 * (e.g. conditionally rendered), the listener attaches once it mounts.
 */
function useWheelZoom(containerRef: RefObject<HTMLElement | null>, options: UseWheelZoomOptions): void {
  const { scale, setScale, enabled = true, factor = 1.1, zoomAnchorRef, onManualZoom } = options;
  const [trackedContainer, setTrackedContainer] = useState<HTMLElement | null>(null);

  // Scale value acknowledged by React props.
  const committedScaleRef = useRef(scale);
  // Latest scale requested via wheel events; allows burst events to compound
  // before parent state has re-rendered with the updated `scale` prop.
  const requestedScaleRef = useRef(scale);
  if (scale !== committedScaleRef.current) {
    committedScaleRef.current = scale;
    requestedScaleRef.current = scale;
  }

  const setScaleRef = useRef(setScale);
  setScaleRef.current = setScale;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const factorRef = useRef(factor);
  factorRef.current = factor;

  const zoomAnchorRefRef = useRef(zoomAnchorRef);
  zoomAnchorRefRef.current = zoomAnchorRef;

  const onManualZoomRef = useRef(onManualZoom);
  onManualZoomRef.current = onManualZoom;

  // Sync containerRef.current → state so the effect re-runs when the
  // container element mounts or unmounts after initial render.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el !== trackedContainer) setTrackedContainer(el);
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: containerRef.current is intentionally read to reject stale wheel callbacks on retargeted containers
  useEffect(() => {
    if (!enabled || !trackedContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (!enabledRef.current) return;
      if (containerRef.current !== trackedContainer) return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const baseScale = requestedScaleRef.current;
      const zoomFactor = factorRef.current;
      const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      const newScale = baseScale * zoom;
      const ratio = newScale / baseScale;
      requestedScaleRef.current = newScale;

      // Write anchor data for cursor-anchored zoom in useVisiblePages
      const anchorRef = zoomAnchorRefRef.current;
      if (anchorRef) {
        const rect = trackedContainer.getBoundingClientRect();
        anchorRef.current = {
          cursorX: e.clientX - rect.left,
          cursorY: e.clientY - rect.top,
          scrollTop: trackedContainer.scrollTop,
          scrollLeft: trackedContainer.scrollLeft,
          ratio,
        };
      }

      onManualZoomRef.current?.();
      setScaleRef.current(newScale);
    };

    trackedContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => trackedContainer.removeEventListener('wheel', handleWheel);
  }, [trackedContainer, enabled]);
}

export { useWheelZoom };
export type { UseWheelZoomOptions };
