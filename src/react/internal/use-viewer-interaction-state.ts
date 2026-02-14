'use client';

import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { InteractionMode, InteractionModeState } from '../hooks/use-interaction-mode.js';
import { useInteractionMode } from '../hooks/use-interaction-mode.js';
import type { ScrollMode, ZoomAnchor } from '../hooks/use-visible-pages.js';

interface UseViewerInteractionStateArgs {
  containerRef: RefObject<HTMLDivElement | null>;
  scale: number;
  setScale: (value: number) => void;
  scrollMode: ScrollMode;
  zoomAnchorRef: RefObject<ZoomAnchor | null>;
  initialInteractionMode?: InteractionMode | undefined;
}

function useViewerInteractionState({
  containerRef,
  scale,
  setScale,
  scrollMode,
  zoomAnchorRef,
  initialInteractionMode,
}: UseViewerInteractionStateArgs): InteractionModeState {
  const interaction = useInteractionMode(containerRef, { scale, setScale, scrollMode, zoomAnchorRef });

  const initialInteractionModeRef = useRef(initialInteractionMode);
  const setInteractionMode = interaction.setMode;

  useEffect(() => {
    if (initialInteractionModeRef.current) {
      setInteractionMode(initialInteractionModeRef.current);
    }
  }, [setInteractionMode]);

  return interaction;
}

export { useViewerInteractionState };
export type { UseViewerInteractionStateArgs };
