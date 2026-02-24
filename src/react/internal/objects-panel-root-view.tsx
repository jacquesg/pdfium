import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import { usePDFPanel, usePDFViewer } from '../components/pdf-viewer.js';
import { usePageObjects } from '../hooks/use-page-objects.js';
import { EmptyPanelState } from './empty-panel-state.js';
import { formatObjectsSummary, OBJECTS_PANEL_COPY } from './objects-panel-copy.js';
import { getVisiblePageObjects, type IndexedPageObject, indexPageObjects } from './objects-panel-helpers.js';
import { ObjectDetailPanel, ObjectListItem, ObjectsTruncationNotice } from './objects-panel-view.js';
import { OBJECT_LIST_CONTAINER_STYLE } from './objects-panel-view-styles.js';
import {
  PANEL_DETAIL_REGION_STYLE,
  PANEL_ROOT_CONTAINER_STYLE,
  PANEL_SCROLL_REGION_STYLE,
  PANEL_SUMMARY_STYLE,
} from './panel-layout-styles.js';
import { usePanelSelectionOverlay } from './use-panel-selection-overlay.js';

const MAX_VISIBLE_OBJECTS = 200;

function ObjectsPanelRootView() {
  const { viewer } = usePDFViewer();
  const { setPanelOverlay } = usePDFPanel();
  const doc = viewer.document;
  const pageIndex = viewer.navigation.pageIndex;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: rawObjects = [] } = usePageObjects(doc, pageIndex);
  const objects: IndexedPageObject[] = useMemo(() => indexPageObjects(rawObjects), [rawObjects]);
  const selectedObj = selectedIndex !== null ? objects[selectedIndex] : undefined;

  useEffect(() => {
    if (!Number.isFinite(pageIndex)) return;
    if (doc === null) {
      setSelectedIndex(null);
      setShowAll(false);
      return;
    }
    setSelectedIndex(null);
    setShowAll(false);
  }, [doc, pageIndex]);

  const { isTruncated, visibleObjects } = useMemo(
    () => getVisiblePageObjects(objects, showAll, MAX_VISIBLE_OBJECTS),
    [objects, showAll],
  );

  const createOverlayRenderer = useCallback(
    (obj: IndexedPageObject, targetPageIndex: number) =>
      (info: PageOverlayInfo): ReactNode => {
        if (info.pageIndex !== targetPageIndex) return null;
        const { x, y, width, height } = info.transformRect(obj.bounds);
        return (
          <svg
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40 }}
            width={info.width}
            height={info.height}
            aria-hidden="true"
          >
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </svg>
        );
      },
    [],
  );

  usePanelSelectionOverlay({
    selectedItem: selectedObj,
    pageIndex,
    setPanelOverlay,
    createOverlayRenderer,
  });

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex((previous) => (previous === index ? null : index));
  }, []);

  if (objects.length === 0) {
    return <EmptyPanelState message={OBJECTS_PANEL_COPY.emptyStateMessage} />;
  }

  return (
    <div style={PANEL_ROOT_CONTAINER_STYLE}>
      <div style={PANEL_SUMMARY_STYLE}>{formatObjectsSummary(objects.length)}</div>

      <div style={PANEL_SCROLL_REGION_STYLE}>
        <div style={OBJECT_LIST_CONTAINER_STYLE}>
          {visibleObjects.map((obj) => (
            <ObjectListItem
              key={obj.index}
              obj={obj}
              isSelected={selectedIndex === obj.index}
              onSelect={handleSelect}
            />
          ))}
        </div>
        {isTruncated && (
          <ObjectsTruncationNotice
            maxVisible={MAX_VISIBLE_OBJECTS}
            totalObjects={objects.length}
            onShowAll={() => setShowAll(true)}
          />
        )}
      </div>

      {selectedObj !== undefined && (
        <div style={PANEL_DETAIL_REGION_STYLE}>
          <ObjectDetailPanel obj={selectedObj} onClose={() => setSelectedIndex(null)} />
        </div>
      )}
    </div>
  );
}

export { ObjectsPanelRootView };
