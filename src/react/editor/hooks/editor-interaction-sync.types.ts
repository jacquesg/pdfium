import type { MutableRefObject } from 'react';
import type { EditorMode } from '../types.js';
import type {
  EditorInteractionBridgeOptions,
  EditorInteractionBridgeViewerState,
} from './editor-interaction-bridge.types.js';

export interface UseEditorInteractionSyncOptions {
  readonly activeTool: EditorMode;
  readonly clearPendingMarkupAction: (requestId?: number) => void;
  readonly options: EditorInteractionBridgeOptions;
  readonly previousInteractionMode: MutableRefObject<EditorInteractionBridgeViewerState['mode']>;
  readonly setActiveTool: (tool: EditorMode) => void;
  readonly suppressNextPointerToIdleSync: MutableRefObject<boolean>;
  readonly viewerInteraction: EditorInteractionBridgeViewerState;
}
