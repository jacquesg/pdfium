import type { InteractionMode } from '../../hooks/use-interaction-mode.js';

/**
 * Minimal interaction state contract required by the bridge.
 */
export interface EditorInteractionBridgeViewerState {
  readonly mode: InteractionMode;
  setMode(mode: InteractionMode): void;
}

/**
 * Bridge configuration options.
 */
export interface EditorInteractionBridgeOptions {
  /**
   * Selector for the viewer's "select text" button.
   * When clicked, the editor returns to neutral mode.
   */
  readonly selectTextButtonSelector?: string;
  /**
   * Pointer shortcut key used by the viewer.
   * Defaults to `v`.
   */
  readonly pointerShortcutKey?: string;
  /**
   * Enables select-text button click bridging.
   * Defaults to `true`.
   */
  readonly enableSelectTextButtonSync?: boolean;
  /**
   * Enables pointer shortcut key bridging.
   * Defaults to `true`.
   */
  readonly enablePointerShortcutSync?: boolean;
  /**
   * Enables Escape to return to neutral mode.
   * Defaults to `true`.
   */
  readonly enableEscapeToIdle?: boolean;
}

/**
 * Bridge actions exposed to the editor toolbar/UI.
 */
export interface EditorInteractionBridgeActions {
  /**
   * Activate an editor tool or trigger a one-shot markup action.
   *
   * If viewer interaction is not already in pointer mode, this will request
   * pointer mode first to keep text selection semantics canonical.
   */
  activate(tool: import('../types.js').EditorTool | import('../types.js').TextMarkupActionTool): void;
  /** Explicitly return to neutral editor mode and clear pending markup action. */
  setIdle(): void;
}
