'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';

interface UsePanelSelectionOverlayOptions<TSelection> {
  selectedItem: TSelection | null | undefined;
  pageIndex: number;
  setPanelOverlay: (renderer: ((info: PageOverlayInfo) => ReactNode) | null) => void;
  createOverlayRenderer: (selectedItem: TSelection, pageIndex: number) => (info: PageOverlayInfo) => ReactNode;
}

function usePanelSelectionOverlay<TSelection>({
  selectedItem,
  pageIndex,
  setPanelOverlay,
  createOverlayRenderer,
}: UsePanelSelectionOverlayOptions<TSelection>): void {
  useEffect(() => {
    if (selectedItem === null || selectedItem === undefined) {
      setPanelOverlay(null);
      return;
    }
    setPanelOverlay(createOverlayRenderer(selectedItem, pageIndex));
  }, [createOverlayRenderer, pageIndex, selectedItem, setPanelOverlay]);

  useEffect(() => () => setPanelOverlay(null), [setPanelOverlay]);
}

export { usePanelSelectionOverlay };
export type { UsePanelSelectionOverlayOptions };
