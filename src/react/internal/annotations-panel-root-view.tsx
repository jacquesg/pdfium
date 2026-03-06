import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AnnotationType } from '../../core/types.js';
import { AnnotationOverlay } from '../components/annotation-overlay.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';
import { usePDFPanel, usePDFViewer } from '../components/pdf-viewer.js';
import { useAnnotations } from '../hooks/use-annotations.js';
import { useAnnotationSelectionBridgeOptional } from './annotation-selection-bridge-context.js';
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
  const selectionBridge = useAnnotationSelectionBridgeOptional();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { data: rawAnnotations = [] } = useAnnotations(doc, pageIndex);
  const annotations = rawAnnotations.slice(0, MAX_SIDEBAR_ANNOTATIONS);

  const grouped = useMemo(() => groupAnnotationsByType(annotations), [annotations]);
  const selectedAnnotation = useMemo(
    () => findAnnotationByIndex(annotations, selectedIndex),
    [annotations, selectedIndex],
  );
  const panelOverlaySelection = useMemo(() => {
    if (selectedAnnotation === undefined || selectedAnnotation === null) {
      return null;
    }
    if (selectionBridge !== null && selectedAnnotation.type !== AnnotationType.Link) {
      return null;
    }
    return selectedAnnotation;
  }, [selectedAnnotation, selectionBridge]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs when page/document changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [doc, pageIndex]);

  useEffect(() => {
    if (selectionBridge === null) {
      return;
    }

    const selection = selectionBridge.selection;
    if (selection !== null && selection.pageIndex === pageIndex) {
      setSelectedIndex(selection.annotationIndex);
      return;
    }

    if (selection !== null) {
      setSelectedIndex(null);
      return;
    }

    setSelectedIndex((previous) => {
      if (previous === null) {
        return null;
      }
      const previousAnnotation = findAnnotationByIndex(annotations, previous);
      return previousAnnotation?.type === AnnotationType.Link ? previous : null;
    });
  }, [selectionBridge, annotations, pageIndex]);

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
    selectedItem: panelOverlaySelection,
    pageIndex,
    setPanelOverlay,
    createOverlayRenderer,
  });

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex((previous) => {
        const nextIndex = previous === index ? null : index;
        if (selectionBridge !== null) {
          const nextAnnotation = nextIndex === null ? null : findAnnotationByIndex(annotations, nextIndex);
          if (nextAnnotation !== null && nextAnnotation !== undefined && nextAnnotation.type !== AnnotationType.Link) {
            selectionBridge.setSelection({ pageIndex, annotationIndex: nextAnnotation.index });
          } else {
            selectionBridge.setSelection(null);
          }
        }
        return nextIndex;
      });
    },
    [annotations, pageIndex, selectionBridge],
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedIndex(null);
    if (selectionBridge === null) {
      return;
    }
    if (selectedAnnotation?.type !== AnnotationType.Link) {
      selectionBridge.setSelection(null);
    }
  }, [selectedAnnotation, selectionBridge]);

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
          <AnnotationDetail annotation={selectedAnnotation} onClose={handleCloseDetail} />
        </div>
      )}
    </div>
  );
}

export { AnnotationsPanelRootView };
