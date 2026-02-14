'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AnnotationOverlay } from '../components/annotation-overlay.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import { usePDFPanel, usePDFViewer } from '../components/pdf-viewer.js';
import { useAnnotations } from '../hooks/use-annotations.js';
import { ANNOTATIONS_PANEL_COPY, formatAnnotationsSummary } from './annotations-panel-copy.js';
import { findAnnotationByIndex, groupAnnotationsByType } from './annotations-panel-helpers.js';
import { AnnotationDetail, AnnotationGroup } from './annotations-panel-view.js';
import { EmptyPanelState } from './empty-panel-state.js';
import {
  PANEL_DETAIL_REGION_STYLE,
  PANEL_ROOT_CONTAINER_STYLE,
  PANEL_SCROLL_REGION_STYLE,
  PANEL_SUMMARY_STYLE,
} from './panel-layout-styles.js';
import { usePanelSelectionOverlay } from './use-panel-selection-overlay.js';

const MAX_SIDEBAR_ANNOTATIONS = 200;

function AnnotationsPanelRootView() {
  const { viewer } = usePDFViewer();
  const { setPanelOverlay } = usePDFPanel();
  const { document: doc } = viewer;
  const { pageIndex } = viewer.navigation;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { data: rawAnnotations = [] } = useAnnotations(doc, pageIndex);
  const annotations = rawAnnotations.slice(0, MAX_SIDEBAR_ANNOTATIONS);

  const grouped = useMemo(() => groupAnnotationsByType(annotations), [annotations]);
  const selectedAnnotation = useMemo(
    () => findAnnotationByIndex(annotations, selectedIndex),
    [annotations, selectedIndex],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs when page/document changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [doc, pageIndex]);

  const createOverlayRenderer = useCallback(
    (annotation: NonNullable<typeof selectedAnnotation>, targetPageIndex: number) =>
      (info: PageOverlayInfo): ReactNode => {
        if (info.pageIndex !== targetPageIndex) return null;
        return (
          <AnnotationOverlay
            annotations={[annotation]}
            width={info.width}
            height={info.height}
            originalHeight={info.originalHeight}
            scale={info.scale}
            selectedIndex={0}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 35 }}
          />
        );
      },
    [],
  );

  usePanelSelectionOverlay({
    selectedItem: selectedAnnotation,
    pageIndex,
    setPanelOverlay,
    createOverlayRenderer,
  });

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex((previous) => (previous === index ? null : index));
  }, []);

  if (annotations.length === 0) {
    return <EmptyPanelState message={ANNOTATIONS_PANEL_COPY.emptyStateMessage} />;
  }

  return (
    <div style={PANEL_ROOT_CONTAINER_STYLE}>
      <div style={PANEL_SUMMARY_STYLE}>{formatAnnotationsSummary(annotations.length)}</div>

      <div style={PANEL_SCROLL_REGION_STYLE}>
        {Array.from(grouped.entries()).map(([type, anns]) => (
          <AnnotationGroup
            key={type}
            type={type}
            annotations={anns}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {selectedAnnotation && (
        <div style={PANEL_DETAIL_REGION_STYLE}>
          <AnnotationDetail annotation={selectedAnnotation} onClose={() => setSelectedIndex(null)} />
        </div>
      )}
    </div>
  );
}

export { AnnotationsPanelRootView };
