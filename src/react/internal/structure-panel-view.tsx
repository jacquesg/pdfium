'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { NamedDestination } from '../../core/types.js';
import { usePDFViewer } from '../components/pdf-viewer.js';
import { useDocumentInfo } from '../hooks/use-document-info.js';
import { useNamedDestinations } from '../hooks/use-named-destinations.js';
import { useStructureTree } from '../hooks/use-structure-tree.js';
import { useRequestCounter } from './async-guards.js';
import { EmptyPanelState } from './empty-panel-state.js';
import { PanelButton } from './panel-button.js';
import { MONO_STYLE, PAGE_SELECT_STYLE, TABLE_STYLE, TH_STYLE } from './panel-table-styles.js';
import { PanelTabs } from './panel-tabs.js';
import { PropertyTable } from './property-table.js';
import { formatNamedDestinationPage, formatNoDestinationFound, STRUCTURE_PANEL_COPY } from './structure-panel-copy.js';
import {
  isStructurePanelTabId,
  STRUCTURE_PANEL_TABS,
  type StructurePanelTabId,
  toStructureTreeNodes,
} from './structure-panel-model.js';
import { TreeView } from './tree-view.js';

function StructureTreeTab() {
  const { viewer } = usePDFViewer();
  const [structurePage, setStructurePage] = useState(0);
  const pageSelectId = useId();
  const { data: docInfo } = useDocumentInfo(viewer.document);
  const tagged = docInfo?.isTagged ?? false;
  const pageCount = viewer.navigation.pageCount;
  const previousDocumentRef = useRef(viewer.document);

  useEffect(() => {
    const documentChanged = previousDocumentRef.current !== viewer.document;
    previousDocumentRef.current = viewer.document;
    setStructurePage((currentPage) => {
      const maxPage = Math.max(0, pageCount - 1);
      if (documentChanged) {
        return Math.max(0, Math.min(viewer.navigation.pageIndex, maxPage));
      }
      return Math.max(0, Math.min(currentPage, maxPage));
    });
  }, [viewer.document, viewer.navigation.pageIndex, pageCount]);

  const { data: rawTree } = useStructureTree(viewer.document, structurePage);
  const treeNodes = rawTree ? toStructureTreeNodes(rawTree, 'st') : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: tagged
              ? 'var(--pdfium-panel-badge-success-bg, #dcfce7)'
              : 'var(--pdfium-panel-danger-bg, #fef2f2)',
            color: tagged
              ? 'var(--pdfium-panel-badge-success-colour, #166534)'
              : 'var(--pdfium-panel-danger-colour, #991b1b)',
          }}
        >
          {tagged ? STRUCTURE_PANEL_COPY.taggedBadge : STRUCTURE_PANEL_COPY.notTaggedBadge}
        </span>

        {tagged && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label
              htmlFor={pageSelectId}
              style={{ fontSize: '13px', color: 'var(--pdfium-panel-secondary-colour, #6b7280)' }}
            >
              {STRUCTURE_PANEL_COPY.pageLabel}
            </label>
            <select
              id={pageSelectId}
              value={structurePage}
              onChange={(event) => setStructurePage(Number(event.target.value))}
              style={PAGE_SELECT_STYLE}
            >
              {Array.from({ length: pageCount }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static page selector with fixed order
                <option key={`st-page-${index}`} value={index}>
                  {index + 1}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tagged ? (
        treeNodes.length > 0 ? (
          <TreeView items={treeNodes} />
        ) : (
          <EmptyPanelState message={STRUCTURE_PANEL_COPY.noStructureElementsMessage} />
        )
      ) : (
        <EmptyPanelState message={STRUCTURE_PANEL_COPY.notTaggedMessage} />
      )}
    </div>
  );
}

function NamedDestinationsTab() {
  const { viewer } = usePDFViewer();
  const currentDocument = viewer.document;
  const { data: destinations } = useNamedDestinations(currentDocument);
  const items = destinations ?? [];
  const namedDestinationSearchId = useId();

  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState<NamedDestination | null | undefined>(undefined);
  const searchRequestGuard = useRequestCounter();

  useEffect(() => {
    if (!currentDocument) {
      searchRequestGuard.invalidate();
      setSearchResult(undefined);
      return;
    }
    searchRequestGuard.invalidate();
    setSearchResult(undefined);
  }, [currentDocument, searchRequestGuard]);

  const handleSearch = useCallback(async () => {
    const trimmed = searchName.trim();
    const activeDocument = currentDocument;
    if (!trimmed || !activeDocument) return;

    const requestId = searchRequestGuard.next();
    try {
      const result = await activeDocument.getNamedDestinationByName(trimmed);
      if (!searchRequestGuard.isCurrent(requestId)) return;
      if (activeDocument !== currentDocument) return;
      setSearchResult(result ?? null);
    } catch {
      if (!searchRequestGuard.isCurrent(requestId)) return;
      if (activeDocument !== currentDocument) return;
      setSearchResult(null);
    }
  }, [currentDocument, searchName, searchRequestGuard]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor={namedDestinationSearchId}
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--pdfium-panel-muted-colour, #9ca3af)',
              marginBottom: '4px',
            }}
          >
            {STRUCTURE_PANEL_COPY.searchLabel}
          </label>
          <input
            id={namedDestinationSearchId}
            type="text"
            value={searchName}
            onChange={(event) => {
              searchRequestGuard.invalidate();
              setSearchName(event.target.value);
              setSearchResult(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSearch();
            }}
            placeholder={STRUCTURE_PANEL_COPY.searchPlaceholder}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '13px',
              border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
              borderRadius: '4px',
              background: 'var(--pdfium-panel-input-bg, transparent)',
              color: 'var(--pdfium-panel-colour, #374151)',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
        <PanelButton variant="secondary" onClick={handleSearch}>
          {STRUCTURE_PANEL_COPY.searchButtonLabel}
        </PanelButton>
      </div>

      {searchResult !== undefined && (
        <div
          style={{
            fontSize: '12px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: searchResult
              ? 'var(--pdfium-panel-badge-success-bg, #dcfce7)'
              : 'var(--pdfium-panel-danger-bg, #fecaca)',
            backgroundColor: searchResult
              ? 'var(--pdfium-panel-badge-success-bg, #dcfce7)'
              : 'var(--pdfium-panel-danger-bg, #fef2f2)',
            color: searchResult
              ? 'var(--pdfium-panel-badge-success-colour, #166534)'
              : 'var(--pdfium-panel-danger-colour, #dc2626)',
          }}
        >
          {searchResult ? (
            <PropertyTable
              rows={[
                { label: 'Name', value: searchResult.name },
                {
                  label: STRUCTURE_PANEL_COPY.pageValueLabel,
                  value: formatNamedDestinationPage(searchResult.pageIndex),
                },
              ]}
            />
          ) : (
            <span>{formatNoDestinationFound(searchName.trim())}</span>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={TABLE_STYLE}>
            <thead>
              <tr>
                <th style={TH_STYLE}>{STRUCTURE_PANEL_COPY.nameColumnHeader}</th>
                <th style={TH_STYLE}>{STRUCTURE_PANEL_COPY.pageIndexColumnHeader}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((destination) => (
                <tr key={destination.name}>
                  <td style={MONO_STYLE}>{destination.name}</td>
                  <td style={MONO_STYLE}>{destination.pageIndex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyPanelState message={STRUCTURE_PANEL_COPY.noNamedDestinationsMessage} />
      )}
    </div>
  );
}

const TAB_CONTENT: Record<StructurePanelTabId, () => ReactNode> = {
  structure: StructureTreeTab,
  'named-dests': NamedDestinationsTab,
};

function StructurePanelView() {
  const [activeTab, setActiveTab] = useState<StructurePanelTabId>('structure');
  const TabContent = TAB_CONTENT[activeTab];

  return (
    <PanelTabs
      tabs={[...STRUCTURE_PANEL_TABS]}
      activeTab={activeTab}
      onChange={(nextTab) => {
        if (isStructurePanelTabId(nextTab)) {
          setActiveTab(nextTab);
        }
      }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>{TabContent !== undefined && <TabContent />}</div>
    </PanelTabs>
  );
}

export { StructurePanelView };
