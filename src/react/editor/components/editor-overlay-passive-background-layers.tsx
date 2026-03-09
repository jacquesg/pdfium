import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';
import type { EditorOverlayActionsResult } from '../hooks/use-editor-overlay-actions.js';
import type { AnnotationSelection } from '../types.js';
import { AnnotationHitTargetLayer } from './annotation-hit-target-layer.js';
import {
  hasRedactionLayer,
  hasSelectionHitTargetLayer,
  selectedAnnotationIndexForPage,
} from './editor-overlay-layer-support.js';
import { RedactionOverlay } from './redaction-overlay.js';

interface EditorOverlayPassiveBackgroundLayersProps {
  readonly actions: EditorOverlayActionsResult;
  readonly effectiveSelectionEnabled: boolean;
  readonly height: number;
  readonly isNeutralMode: boolean;
  readonly originalHeight: number;
  readonly pageIndex: number;
  readonly resolvedAnnotations: readonly SerialisedAnnotation[];
  readonly scale: number;
  readonly selection: AnnotationSelection | null;
  readonly width: number;
}

export function EditorOverlayPassiveBackgroundLayers({
  actions,
  effectiveSelectionEnabled,
  height,
  isNeutralMode,
  originalHeight,
  pageIndex,
  resolvedAnnotations,
  scale,
  selection,
  width,
}: EditorOverlayPassiveBackgroundLayersProps): ReactNode {
  return (
    <>
      {hasRedactionLayer(resolvedAnnotations) && (
        <RedactionOverlay
          annotations={resolvedAnnotations}
          scale={scale}
          originalHeight={originalHeight}
          width={width}
          height={height}
        />
      )}
      {hasSelectionHitTargetLayer(resolvedAnnotations, effectiveSelectionEnabled, isNeutralMode) && (
        <AnnotationHitTargetLayer
          annotations={resolvedAnnotations}
          height={height}
          originalHeight={originalHeight}
          scale={scale}
          selectedAnnotationIndex={selectedAnnotationIndexForPage(selection, pageIndex)}
          width={width}
          onSelect={actions.handleAnnotationClick}
        />
      )}
    </>
  );
}
