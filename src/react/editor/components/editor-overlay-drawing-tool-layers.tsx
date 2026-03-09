import type { ReactNode } from 'react';
import { EditorOverlayFreeTextToolLayer } from './editor-overlay-freetext-tool-layer.js';
import { EditorOverlayInkToolLayer } from './editor-overlay-ink-tool-layer.js';
import { EditorOverlayShapeToolLayer } from './editor-overlay-shape-tool-layer.js';
import { type EditorOverlayToolLayerSectionProps, isShapeTool } from './editor-overlay-tool-layer.types.js';

export function EditorOverlayDrawingToolLayers({
  activeTool,
  freetextInput,
  freetextIsActive,
  height,
  inkDrawing,
  onFreeTextClick,
  onInkComplete,
  onShapeCreate,
  originalHeight,
  scale,
  toolConfigs,
  width,
}: EditorOverlayToolLayerSectionProps): ReactNode {
  return (
    <>
      {activeTool === 'ink' && (
        <EditorOverlayInkToolLayer
          drawing={inkDrawing}
          width={width}
          height={height}
          inkConfig={toolConfigs.ink}
          onInkComplete={onInkComplete}
        />
      )}
      {activeTool === 'freetext' && (
        <EditorOverlayFreeTextToolLayer
          freetextConfig={toolConfigs.freetext}
          freetextInput={freetextInput}
          freetextIsActive={freetextIsActive}
          width={width}
          height={height}
          scale={scale}
          originalHeight={originalHeight}
          onFreeTextClick={onFreeTextClick}
        />
      )}
      {isShapeTool(activeTool) && (
        <EditorOverlayShapeToolLayer
          tool={activeTool}
          width={width}
          height={height}
          scale={scale}
          originalHeight={originalHeight}
          shapeConfig={toolConfigs[activeTool]}
          onShapeCreate={onShapeCreate}
        />
      )}
    </>
  );
}
