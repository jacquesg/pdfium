import type { MutableRefObject, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import { useRequestCounter } from './async-guards.js';

type PanelOverlayRenderer = ((info: PageOverlayInfo) => ReactNode) | null;

interface UseViewerPanelsOptions {
  initialPanel?: string | undefined;
}

interface UseViewerPanelsResult {
  activePanel: string | null;
  togglePanel: (id: string) => void;
  setPanelOverlay: (renderer: PanelOverlayRenderer, ownerPanel?: string | null) => void;
  panelOverlayRef: MutableRefObject<PanelOverlayRenderer>;
  overlayVersion: number;
  lastFocusedButtonRef: MutableRefObject<HTMLButtonElement | null>;
  panelContainerRef: MutableRefObject<HTMLDivElement | null>;
}

function useViewerPanels({ initialPanel }: UseViewerPanelsOptions): UseViewerPanelsResult {
  const [activePanel, setActivePanel] = useState<string | null>(initialPanel ?? null);
  const panelOverlayRef = useRef<PanelOverlayRenderer>(null);
  const [overlayVersion, setOverlayVersion] = useState(0);
  const lastFocusedButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const prevActivePanelRef = useRef<string | null>(activePanel);
  const activePanelRef = useRef<string | null>(activePanel);
  activePanelRef.current = activePanel;
  const focusRequests = useRequestCounter();

  const setPanelOverlay = useCallback((renderer: PanelOverlayRenderer, ownerPanel?: string | null) => {
    const currentPanel = activePanelRef.current;
    // Ignore stale overlay writers from unmounted/closed panels.
    if (currentPanel === null) {
      return;
    }
    // Ignore stale writers from panels that are no longer active.
    if (ownerPanel !== undefined && ownerPanel !== currentPanel) {
      return;
    }
    panelOverlayRef.current = renderer;
    setOverlayVersion((v) => v + 1);
  }, []);

  const togglePanel = useCallback((id: string) => {
    setActivePanel((current) => {
      // Clear stale panel-specific overlays before switching/closing panels.
      panelOverlayRef.current = null;
      setOverlayVersion((v) => v + 1);
      return current === id ? null : id;
    });
  }, []);

  useEffect(() => {
    const prev = prevActivePanelRef.current;
    prevActivePanelRef.current = activePanel;
    let rafId: number | null = null;

    if (activePanel !== null && prev !== activePanel) {
      const requestId = focusRequests.next();
      const expectedPanel = activePanel;
      rafId = requestAnimationFrame(() => {
        if (!focusRequests.isCurrent(requestId)) return;
        if (activePanelRef.current !== expectedPanel) return;
        const container = panelContainerRef.current;
        if (!container) return;
        const heading = container.querySelector<HTMLElement>('h2, h3, [tabindex="0"], button');
        heading?.focus();
      });
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }

    if (activePanel === null && prev !== null) {
      const requestId = focusRequests.next();
      rafId = requestAnimationFrame(() => {
        if (!focusRequests.isCurrent(requestId)) return;
        if (activePanelRef.current !== null) return;
        lastFocusedButtonRef.current?.focus();
      });
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [activePanel, focusRequests]);

  return {
    activePanel,
    togglePanel,
    setPanelOverlay,
    panelOverlayRef,
    overlayVersion,
    lastFocusedButtonRef,
    panelContainerRef,
  };
}

export { useViewerPanels };
export type { PanelOverlayRenderer, UseViewerPanelsOptions, UseViewerPanelsResult };
