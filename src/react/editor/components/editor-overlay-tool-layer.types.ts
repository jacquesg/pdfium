import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Rect } from '../../../core/types.js';
import type { EditorContextValue } from '../context.js';
import type { FreeTextInputActions } from '../hooks/use-freetext-input.js';
import type { InkDrawingActions } from '../hooks/use-ink-drawing.js';
import type { ToolConfigMap } from '../types.js';
import type { ShapeCreateDetail } from './shape-creation-overlay.js';

export interface EditorOverlayToolLayersProps {
  readonly activeTool: EditorContextValue['activeTool'];
  readonly effectiveSelectionEnabled: boolean;
  readonly freetextInput: FreeTextInputActions;
  readonly freetextIsActive: boolean;
  readonly height: number;
  readonly inkDrawing: InkDrawingActions;
  readonly onFreeTextClick: (event: ReactPointerEvent) => void;
  readonly onInkComplete: (points: ReadonlyArray<{ x: number; y: number }>) => void;
  readonly onMarkupCreate: (rects: readonly Rect[], boundingRect: Rect) => void;
  readonly onMarkupProcessResult: (processed: boolean) => void;
  readonly onRedactCreate: (rect: Rect) => void;
  readonly onShapeCreate: (rect: Rect, detail?: ShapeCreateDetail) => void;
  readonly onStampClick: (event: ReactPointerEvent) => void;
  readonly originalHeight: number;
  readonly pendingMarkupAction: EditorContextValue['pendingMarkupAction'];
  readonly scale: number;
  readonly toolConfigs: ToolConfigMap;
  readonly width: number;
}

export function isShapeTool(tool: EditorContextValue['activeTool']): tool is 'rectangle' | 'circle' | 'line' {
  return tool === 'rectangle' || tool === 'circle' || tool === 'line';
}

export interface EditorOverlayToolLayerSectionProps
  extends Omit<EditorOverlayToolLayersProps, 'effectiveSelectionEnabled'> {}
