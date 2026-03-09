import type { ReactNode } from 'react';
import { EditorOverlayContainerLayer } from './editor-overlay-container-layer.js';
import type { EditorOverlayVisibleLayersProps } from './editor-overlay-layers.types.js';
import { EditorOverlayPassiveLayers } from './editor-overlay-passive-layers.js';
import { EditorOverlayResolvedToolLayers } from './editor-overlay-resolved-tool-layers.js';

export function EditorOverlayVisibleLayers({
  actions,
  activeTool,
  containerRef,
  document,
  effectiveSelectionEnabled,
  freetextInput,
  height,
  inkDrawing,
  isNeutralMode,
  originalHeight,
  pageIndex,
  pendingMarkupAction,
  resolvedAnnotations,
  scale,
  selectedAnnotation,
  selectedCommittedAnnotation,
  selectedPreviewPatch,
  selection,
  showToolLayers,
  toolConfigs,
  width,
}: EditorOverlayVisibleLayersProps): ReactNode {
  return (
    <>
      <EditorOverlayContainerLayer containerRef={containerRef} />
      <EditorOverlayPassiveLayers
        actions={actions}
        document={document}
        effectiveSelectionEnabled={effectiveSelectionEnabled}
        height={height}
        isNeutralMode={isNeutralMode}
        originalHeight={originalHeight}
        pageIndex={pageIndex}
        resolvedAnnotations={resolvedAnnotations}
        scale={scale}
        selectedAnnotation={selectedAnnotation}
        selectedCommittedAnnotation={selectedCommittedAnnotation}
        selectedPreviewPatch={selectedPreviewPatch}
        selection={selection}
        width={width}
      />
      {showToolLayers && (
        <EditorOverlayResolvedToolLayers
          actions={actions}
          activeTool={activeTool}
          effectiveSelectionEnabled={effectiveSelectionEnabled}
          freetextInput={freetextInput}
          height={height}
          inkDrawing={inkDrawing}
          originalHeight={originalHeight}
          pendingMarkupAction={pendingMarkupAction}
          scale={scale}
          toolConfigs={toolConfigs}
          width={width}
        />
      )}
    </>
  );
}
