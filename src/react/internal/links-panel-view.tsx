'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { usePDFViewer } from '../components/pdf-viewer.js';
import { useLinks } from '../hooks/use-links.js';
import { useWebLinks } from '../hooks/use-web-links.js';
import { EmptyPanelState } from './empty-panel-state.js';
import {
  formatLinkBounds,
  formatLinksTabEmptyState,
  formatWebLinksSummary,
  formatWebLinkTextRange,
  LINKS_PANEL_COPY,
} from './links-panel-copy.js';
import {
  clampLinksPageIndex,
  formatLinkTarget,
  isLinksPanelTabId,
  type LinksPanelTabId,
} from './links-panel-helpers.js';
import { PANEL_ROOT_CONTAINER_STYLE, PANEL_SCROLL_REGION_STYLE } from './panel-layout-styles.js';
import { MONO_STYLE, PAGE_SELECT_STYLE, TABLE_STYLE, TD_STYLE, TH_STYLE } from './panel-table-styles.js';
import { PanelTabs } from './panel-tabs.js';
import { isSafeUrl } from './safe-url.js';

const TABS = [
  { id: 'links', label: LINKS_PANEL_COPY.linksTabLabel },
  { id: 'weblinks', label: LINKS_PANEL_COPY.webLinksTabLabel },
] as const;

function LinksTab() {
  const { viewer } = usePDFViewer();
  const pageIndex = viewer.navigation.pageIndex;
  const { data: links } = useLinks(viewer.document, pageIndex);
  const items = links ?? [];

  if (items.length === 0) {
    return <EmptyPanelState message={formatLinksTabEmptyState(pageIndex)} />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '8px',
        padding: '4px 0',
      }}
    >
      {items.map((link) => (
        <div
          key={link.index}
          style={{
            border: '1px solid var(--pdfium-panel-section-border, #e5e7eb)',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: 'var(--pdfium-panel-item-active-colour, #1d4ed8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formatLinkTarget(link)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--pdfium-panel-muted-colour, #9ca3af)', marginTop: '4px' }}>
            {formatLinkBounds(link.bounds)}
          </div>
        </div>
      ))}
    </div>
  );
}

function WebLinksTab() {
  const { viewer } = usePDFViewer();
  const document = viewer.document;
  const currentPageIndex = viewer.navigation.pageIndex;
  const pageCount = viewer.navigation.pageCount;
  const webLinksPageSelectId = useId();
  const [webLinksPage, setWebLinksPage] = useState(() => clampLinksPageIndex(viewer.navigation.pageIndex, pageCount));
  const previousDocumentRef = useRef(document);

  useEffect(() => {
    setWebLinksPage((currentPage) => clampLinksPageIndex(currentPage, pageCount));
  }, [pageCount]);

  useEffect(() => {
    const documentChanged = previousDocumentRef.current !== document;
    previousDocumentRef.current = document;
    if (!documentChanged) return;
    if (!document) {
      setWebLinksPage(0);
      return;
    }
    setWebLinksPage(clampLinksPageIndex(currentPageIndex, pageCount));
  }, [currentPageIndex, document, pageCount]);

  const { data: webLinks } = useWebLinks(document, webLinksPage);
  const items = webLinks ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--pdfium-panel-colour, #374151)' }}>
          {formatWebLinksSummary(items.length)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label
            htmlFor={webLinksPageSelectId}
            style={{ fontSize: '13px', color: 'var(--pdfium-panel-secondary-colour, #6b7280)' }}
          >
            {LINKS_PANEL_COPY.pageLabel}
          </label>
          <select
            id={webLinksPageSelectId}
            value={webLinksPage}
            onChange={(event) => setWebLinksPage(clampLinksPageIndex(Number(event.target.value), pageCount))}
            style={PAGE_SELECT_STYLE}
          >
            {Array.from({ length: pageCount }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static page selector with fixed order
              <option key={`wl-page-${index}`} value={index}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyPanelState message={LINKS_PANEL_COPY.noWebLinksMessage} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={TABLE_STYLE}>
            <thead>
              <tr>
                <th style={TH_STYLE}>{LINKS_PANEL_COPY.urlColumnHeader}</th>
                <th style={TH_STYLE}>{LINKS_PANEL_COPY.rectsColumnHeader}</th>
                <th style={TH_STYLE}>{LINKS_PANEL_COPY.textRangeColumnHeader}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((link) => {
                const safe = isSafeUrl(link.url);
                return (
                  <tr key={link.index}>
                    <td style={{ ...TD_STYLE, wordBreak: 'break-all' }}>
                      {safe ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--pdfium-panel-item-active-colour, #1d4ed8)',
                            textDecoration: 'underline',
                          }}
                        >
                          {link.url}
                        </a>
                      ) : (
                        <span
                          style={{ color: 'var(--pdfium-panel-muted-colour, #9ca3af)' }}
                          title={LINKS_PANEL_COPY.blockedUnsafeUrlTitle}
                        >
                          {link.url}
                        </span>
                      )}
                    </td>
                    <td style={MONO_STYLE}>{link.rects.length}</td>
                    <td style={MONO_STYLE}>{formatWebLinkTextRange(link.textRange)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TAB_CONTENT: Record<LinksPanelTabId, () => ReactNode> = {
  links: LinksTab,
  weblinks: WebLinksTab,
};

function LinksPanelView() {
  const [activeTab, setActiveTab] = useState<LinksPanelTabId>('links');
  const TabContent = TAB_CONTENT[activeTab];

  return (
    <PanelTabs
      tabs={[...TABS]}
      activeTab={activeTab}
      onChange={(nextTab) => {
        if (isLinksPanelTabId(nextTab)) {
          setActiveTab(nextTab);
        }
      }}
      style={PANEL_ROOT_CONTAINER_STYLE}
    >
      <div style={{ ...PANEL_SCROLL_REGION_STYLE, padding: '12px', overflow: 'auto' }}>
        {TabContent !== undefined && <TabContent />}
      </div>
    </PanelTabs>
  );
}

export { LinksPanelView };
