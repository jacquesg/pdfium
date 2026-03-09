import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { EditorOverlayActionsResult } from '../hooks/use-editor-overlay-actions.js';
import type { OptimisticAnnotationPatch } from '../internal/annotation-mutation-store.js';
import type { AnnotationSelection } from '../types.js';
import { EditorOverlayPassiveBackgroundLayers } from './editor-overlay-passive-background-layers.js';
import { EditorOverlayPassiveSelectionLayer } from './editor-overlay-passive-selection-layer.js';

interface EditorOverlayPassiveLayersProps {
  readonly actions: EditorOverlayActionsResult;
  readonly document: WorkerPDFiumDocument | null;
  readonly effectiveSelectionEnabled: boolean;
  readonly height: number;
  readonly isNeutralMode: boolean;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly scale: number;
  readonly selectedAnnotation: SerialisedAnnotation | null;
  readonly selectedCommittedAnnotation: SerialisedAnnotation | null;
  readonly selectedPreviewPatch?: OptimisticAnnotationPatch | undefined;
  readonly selection: AnnotationSelection | null;
  readonly width: number;
}

export function EditorOverlayPassiveLayers({
  actions,
  document,
  effectiveSelectionEnabled,
  height,
  isNeutralMode,
  originalHeight,
  pageIndex,
  resolvedAnnotations,
  scale,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selectedPreviewPatch,
  selection,
  width,
}: EditorOverlayPassiveLayersProps): ReactNode {
  return (
    <>
      <EditorOverlayPassiveBackgroundLayers
        actions={actions}
        effectiveSelectionEnabled={effectiveSelectionEnabled}
        height={height}
        isNeutralMode={isNeutralMode}
        originalHeight={originalHeight}
        pageIndex={pageIndex}
        resolvedAnnotations={resolvedAnnotations}
        scale={scale}
        selection={selection}
        width={width}
      />
      <EditorOverlayPassiveSelectionLayer
        actions={actions}
        document={document}
        effectiveSelectionEnabled={effectiveSelectionEnabled}
        height={height}
        isNeutralMode={isNeutralMode}
        originalHeight={originalHeight}
        pageIndex={pageIndex}
        scale={scale}
        selectedAnnotation={selectedAnnotation}
        selectedCommittedAnnotation={selectedCommittedAnnotation}
        selectedPreviewPatch={selectedPreviewPatch}
        width={width}
      />
    </>
  );
}
