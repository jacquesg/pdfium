import type { ReactNode } from 'react';
import type { EditorContextValue } from '../context.js';
import type { EditorOverlayActionsResult } from '../hooks/use-editor-overlay-actions.js';
import type { FreeTextInputActions } from '../hooks/use-freetext-input.js';
import type { InkDrawingActions } from '../hooks/use-ink-drawing.js';
import type { ToolConfigMap } from '../types.js';
import { EditorOverlayToolLayers } from './editor-overlay-tool-layers.js';

interface EditorOverlayResolvedToolLayersProps {
  readonly actions: EditorOverlayActionsResult;
  readonly activeTool: EditorContextValue['activeTool'];
  readonly effectiveSelectionEnabled: boolean;
  readonly freetextInput: FreeTextInputActions;
  readonly height: number;
  readonly inkDrawing: InkDrawingActions;
  readonly originalHeight: number;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly scale: number;
  readonly toolConfigs: ToolConfigMap;
  readonly width: number;
}

export function EditorOverlayResolvedToolLayers({
  actions,
  activeTool,
  effectiveSelectionEnabled,
  freetextInput,
  height,
  inkDrawing,
  originalHeight,
  pendingMarkupAction,
  scale,
  toolConfigs,
  width,
}: EditorOverlayResolvedToolLayersProps): ReactNode {
  return (
    <EditorOverlayToolLayers
      activeTool={activeTool}
      effectiveSelectionEnabled={effectiveSelectionEnabled}
      freetextInput={freetextInput}
      freetextIsActive={actions.freetextIsActive}
      height={height}
      inkDrawing={inkDrawing}
      originalHeight={originalHeight}
      pendingMarkupAction={pendingMarkupAction}
      scale={scale}
      toolConfigs={toolConfigs}
      width={width}
      onFreeTextClick={actions.handleFreeTextClick}
      onInkComplete={actions.handleInkComplete}
      onMarkupCreate={actions.handleTextMarkupCreate}
      onMarkupProcessResult={actions.handleMarkupProcessResult}
      onRedactCreate={actions.handleRedactCreate}
      onShapeCreate={actions.handleShapeCreate}
      onStampClick={actions.handleStampClick}
    />
  );
}
