import { useCallback, useRef } from 'react';
import { releaseInkPointerCaptureIfHeld } from '../components/ink-canvas-support.js';

export function useInkCanvasPointerSession() {
  const activePointerIdRef = useRef<number | null>(null);
  const captureElementRef = useRef<Element | null>(null);

  const beginSession = useCallback((pointerId: number, captureElement: Element | null) => {
    activePointerIdRef.current = pointerId;
    captureElementRef.current = captureElement;
  }, []);

  const resetSession = useCallback((pointerId: number) => {
    releaseInkPointerCaptureIfHeld(captureElementRef.current, pointerId);
    activePointerIdRef.current = null;
    captureElementRef.current = null;
  }, []);

  const clearSession = useCallback(() => {
    activePointerIdRef.current = null;
    captureElementRef.current = null;
  }, []);

  return {
    activePointerIdRef,
    beginSession,
    captureElementRef,
    clearSession,
    resetSession,
  };
}
