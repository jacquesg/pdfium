'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';

export interface FullscreenState {
  isFullscreen: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ??
    null
  );
}

export function useFullscreen(containerRef: RefObject<HTMLElement | null>): FullscreenState {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const syncState = useCallback(() => {
    setIsFullscreen(getFullscreenElement() === containerRef.current);
  }, [containerRef]);

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen();
    } else if (
      typeof (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ===
      'function'
    ) {
      await (el as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
    }
  }, [containerRef]);

  const exitFullscreen = useCallback(async () => {
    if (typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen();
    } else if (
      typeof (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen === 'function'
    ) {
      await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (getFullscreenElement() === container) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [containerRef, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', syncState);
    document.addEventListener('webkitfullscreenchange', syncState);

    return () => {
      document.removeEventListener('fullscreenchange', syncState);
      document.removeEventListener('webkitfullscreenchange', syncState);
    };
  }, [syncState]);

  // Ref retargets do not necessarily emit fullscreenchange. Re-sync on render
  // so a swapped container cannot keep stale fullscreen state.
  useEffect(() => {
    syncState();
  });

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
