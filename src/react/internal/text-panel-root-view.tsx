'use client';

import { type KeyboardEvent, useCallback, useEffect, useState } from 'react';
import type { CharacterInfo, CharBox } from '../../core/types.js';
import { CharacterInspectorOverlay } from '../components/character-inspector-overlay.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import { usePDFPanel, usePDFViewer } from '../components/pdf-viewer.js';
import { useTextContent } from '../hooks/use-text-content.js';
import { useRequestCounter } from './async-guards.js';
import { EmptyPanelState } from './empty-panel-state.js';
import { PanelTabs } from './panel-tabs.js';
import { TEXT_PANEL_COPY } from './text-panel-copy.js';
import { isTextPanelTabId } from './text-panel-helpers.js';
import {
  type CharacterDetail,
  TEXT_PANEL_TABS,
  TextCharactersPane,
  TextExtractionPane,
  type TextTabId,
} from './text-panel-view.js';
import { usePanelSelectionOverlay } from './use-panel-selection-overlay.js';

function TextPanelRootView() {
  const { viewer } = usePDFViewer();
  const { setPanelOverlay } = usePDFPanel();
  const doc = viewer.document;
  const { pageIndex } = viewer.navigation;
  const { scale } = viewer.zoom;
  const { dimensions } = viewer.container;

  const [activeTab, setActiveTab] = useState<TextTabId>('characters');
  const [charDetail, setCharDetail] = useState<CharacterDetail | null>(null);
  const { data: textContent } = useTextContent(doc, pageIndex);
  const fullText = textContent?.text ?? '';

  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [right, setRight] = useState(0);
  const [bottom, setBottom] = useState(0);
  const [extractedRect, setExtractedRect] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const extractionRequests = useRequestCounter();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset state when page/document changes
  useEffect(() => {
    extractionRequests.invalidate();
    setCharDetail(null);
    setExtractedRect(null);
    setExtractError(null);
  }, [doc, pageIndex, extractionRequests]);

  const handleCharacterChange = useCallback(
    (info: { charInfo: CharacterInfo; charBox: CharBox; isPinned: boolean } | null) => {
      setCharDetail(info);
    },
    [],
  );

  const createCharacterOverlayRenderer = useCallback(
    (_enabled: true, overlayPageIndex: number) => (info: PageOverlayInfo) => {
      if (info.pageIndex !== overlayPageIndex || !doc) return null;
      return (
        <CharacterInspectorOverlay
          document={doc}
          pageIndex={overlayPageIndex}
          width={info.width}
          height={info.height}
          originalWidth={info.originalWidth}
          originalHeight={info.originalHeight}
          onCharacterChange={handleCharacterChange}
        />
      );
    },
    [doc, handleCharacterChange],
  );

  usePanelSelectionOverlay({
    selectedItem: activeTab === 'characters' && doc ? true : null,
    pageIndex,
    setPanelOverlay,
    createOverlayRenderer: createCharacterOverlayRenderer,
  });

  const handleTabChange = useCallback((id: string) => {
    if (isTextPanelTabId(id)) setActiveTab(id);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!doc) return;
    const requestId = extractionRequests.next();

    setExtractError(null);
    try {
      await using page = await doc.getPage(pageIndex);
      const text = await page.getTextInRect(left, top, right, bottom);
      if (!extractionRequests.isCurrent(requestId)) return;
      setExtractedRect(text);
    } catch (error) {
      if (!extractionRequests.isCurrent(requestId)) return;
      setExtractError(error instanceof Error ? error.message : 'Extraction failed');
      setExtractedRect(null);
    }
  }, [doc, pageIndex, left, top, right, bottom, extractionRequests]);

  const handleCoordKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') handleExtract();
    },
    [handleExtract],
  );

  if (!doc) {
    return <EmptyPanelState message={TEXT_PANEL_COPY.noDocumentMessage} />;
  }

  return (
    <PanelTabs tabs={TEXT_PANEL_TABS} activeTab={activeTab} onChange={handleTabChange}>
      {activeTab === 'characters' ? (
        <TextCharactersPane charDetail={charDetail} pageIndex={pageIndex} dimensions={dimensions} scale={scale} />
      ) : (
        <TextExtractionPane
          fullText={fullText}
          left={left}
          top={top}
          right={right}
          bottom={bottom}
          setLeft={setLeft}
          setTop={setTop}
          setRight={setRight}
          setBottom={setBottom}
          onExtract={handleExtract}
          onCoordKeyDown={handleCoordKeyDown}
          extractError={extractError}
          extractedRect={extractedRect}
          hasDocument={!!doc}
        />
      )}
    </PanelTabs>
  );
}

export { TextPanelRootView };
