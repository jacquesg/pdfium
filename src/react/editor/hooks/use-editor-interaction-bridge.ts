/**
 * Editor/viewer interaction bridge.
 *
 * Keeps editor tool state and viewer interaction mode in sync so there is
 * a single text-selection model (viewer pointer mode) while preserving
 * explicit editor tool activations.
 *
 * @module react/editor/hooks/use-editor-interaction-bridge
 */

import { useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { InteractionMode } from '../../hooks/use-interaction-mode.js';
import { useEditor } from '../context.js';
import type { EditorTool, TextMarkupActionTool } from '../types.js';

const DEFAULT_POINTER_SHORTCUT_KEY = 'v';
const MARKUP_ACTION_TOOLS = new Set<TextMarkupActionTool>(['highlight', 'underline', 'strikeout']);

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || element.closest('[contenteditable]:not([contenteditable="false"])') !== null)
  );
}

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
  activate(tool: EditorTool | TextMarkupActionTool): void;
  /** Explicitly return to neutral editor mode and clear pending markup action. */
  setIdle(): void;
}

/**
 * Synchronises editor tool semantics with viewer interaction mode.
 */
export function useEditorInteractionBridge(
  viewerInteraction: EditorInteractionBridgeViewerState,
  options: EditorInteractionBridgeOptions = {},
): EditorInteractionBridgeActions {
  const { activeTool, setActiveTool, triggerMarkupAction, clearPendingMarkupAction } = useEditor();
  const suppressNextPointerToIdleSync = useRef(false);
  const previousInteractionMode = useRef(viewerInteraction.mode);
  const {
    selectTextButtonSelector,
    pointerShortcutKey = DEFAULT_POINTER_SHORTCUT_KEY,
    enableSelectTextButtonSync = true,
    enablePointerShortcutSync = true,
    enableEscapeToIdle = true,
  } = options;

  useEffect(() => {
    const nextMode = viewerInteraction.mode;
    const previousMode = previousInteractionMode.current;
    previousInteractionMode.current = nextMode;
    if (previousMode === nextMode) return;

    if (nextMode !== 'pointer') {
      suppressNextPointerToIdleSync.current = false;
      clearPendingMarkupAction();
      if (activeTool !== 'idle') {
        setActiveTool('idle');
      }
      return;
    }

    if (activeTool === 'idle') {
      return;
    }

    // If pointer mode transition was requested by an explicit editor tool
    // activation, do not clobber that tool.
    if (suppressNextPointerToIdleSync.current) {
      suppressNextPointerToIdleSync.current = false;
      return;
    }

    setActiveTool('idle');
  }, [viewerInteraction.mode, activeTool, setActiveTool, clearPendingMarkupAction]);

  useEffect(() => {
    if (!enableSelectTextButtonSync || !selectTextButtonSelector) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(selectTextButtonSelector)) return;
      if (activeTool === 'idle') return;
      setActiveTool('idle');
    };

    globalThis.document.addEventListener('click', onDocumentClick);
    return () => {
      globalThis.document.removeEventListener('click', onDocumentClick);
    };
  }, [activeTool, setActiveTool, selectTextButtonSelector, enableSelectTextButtonSync]);

  useEffect(() => {
    if (!enablePointerShortcutSync) return;

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key.toLowerCase() !== pointerShortcutKey.toLowerCase()) return;
      if (isEditableElement(event.target instanceof Element ? event.target : null)) return;
      if (viewerInteraction.mode !== 'pointer') return;
      if (activeTool === 'idle') return;
      setActiveTool('idle');
    };

    globalThis.document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      globalThis.document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [viewerInteraction.mode, activeTool, setActiveTool, pointerShortcutKey, enablePointerShortcutSync]);

  useEffect(() => {
    if (!enableEscapeToIdle) return;

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'Escape') return;
      if (isEditableElement(event.target instanceof Element ? event.target : null)) return;
      if (activeTool === 'idle') return;
      clearPendingMarkupAction();
      setActiveTool('idle');
    };

    globalThis.document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      globalThis.document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [activeTool, setActiveTool, clearPendingMarkupAction, enableEscapeToIdle]);

  const activate = useCallback(
    (tool: EditorTool | TextMarkupActionTool) => {
      if (viewerInteraction.mode !== 'pointer') {
        suppressNextPointerToIdleSync.current = true;
        viewerInteraction.setMode('pointer');
      }

      if (MARKUP_ACTION_TOOLS.has(tool as TextMarkupActionTool)) {
        flushSync(() => {
          setActiveTool('idle');
        });
        triggerMarkupAction(tool as TextMarkupActionTool);
        return;
      }

      flushSync(() => {
        setActiveTool(tool as EditorTool);
      });
    },
    [viewerInteraction, setActiveTool, triggerMarkupAction],
  );

  const setIdle = useCallback(() => {
    clearPendingMarkupAction();
    flushSync(() => {
      setActiveTool('idle');
    });
  }, [clearPendingMarkupAction, setActiveTool]);

  return { activate, setIdle };
}
