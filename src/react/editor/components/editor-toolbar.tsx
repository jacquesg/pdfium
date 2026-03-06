/**
 * Editor toolbar component.
 *
 * Provides tool picker buttons grouped by category, plus undo/redo buttons.
 *
 * @module react/editor/components/editor-toolbar
 */

import { type MouseEvent as ReactMouseEvent, type ReactNode, useCallback } from 'react';
import { usePDFViewerOptional } from '../../components/pdf-viewer-context.js';
import { useEditor } from '../context.js';
import { useEditorInteractionBridge } from '../hooks/use-editor-interaction-bridge.js';
import type { EditorTool, TextMarkupActionTool } from '../types.js';

/**
 * Tool metadata for rendering toolbar buttons.
 */
interface ToolEntry {
  readonly tool: EditorTool | TextMarkupActionTool;
  readonly label: string;
  readonly group: 'markup' | 'shapes' | 'advanced';
  readonly action?: boolean;
}

const TOOLS: readonly ToolEntry[] = [
  { tool: 'freetext', label: 'Text', group: 'markup' },
  { tool: 'highlight', label: 'Highlight', group: 'markup', action: true },
  { tool: 'underline', label: 'Underline', group: 'markup', action: true },
  { tool: 'strikeout', label: 'Strikeout', group: 'markup', action: true },
  { tool: 'ink', label: 'Draw', group: 'shapes' },
  { tool: 'rectangle', label: 'Rectangle', group: 'shapes' },
  { tool: 'circle', label: 'Circle', group: 'shapes' },
  { tool: 'line', label: 'Line', group: 'shapes' },
  { tool: 'stamp', label: 'Stamp', group: 'advanced' },
  { tool: 'redact', label: 'Redact', group: 'advanced' },
];
const VIEWER_SELECT_TEXT_BUTTON_SELECTOR = 'button[aria-label="Select text (V)"], button[aria-label="Pointer tool"]';
const NOOP_INTERACTION = {
  mode: 'pointer' as const,
  setMode: () => {},
};

/**
 * Props for the `EditorToolbar` component.
 */
export interface EditorToolbarProps {
  /** Additional CSS class name. */
  readonly className?: string;
}

/**
 * Renders a toolbar with tool picker and undo/redo buttons.
 *
 * Must be called within an `EditorProvider`.
 */
export function EditorToolbar({ className }: EditorToolbarProps): ReactNode {
  const { activeTool, canUndo, canRedo, undo, redo } = useEditor();
  const viewerContext = usePDFViewerOptional();
  const viewerInteraction = viewerContext?.viewer.interaction ?? NOOP_INTERACTION;
  const interactionBridge = useEditorInteractionBridge(viewerInteraction, {
    selectTextButtonSelector: VIEWER_SELECT_TEXT_BUTTON_SELECTOR,
    enableSelectTextButtonSync: viewerContext !== null,
    enablePointerShortcutSync: viewerContext !== null,
    // Keep Escape available for toolbar-only usage where no viewer bridge exists.
    enableEscapeToIdle: true,
  });

  const handleToolClick = useCallback(
    (entry: ToolEntry) => {
      interactionBridge.activate(entry.tool as EditorTool | TextMarkupActionTool);
    },
    [interactionBridge],
  );

  // Prevent mousedown from clearing the browser's text selection.
  // This enables the "select text first, then click markup tool" flow —
  // without it the selection is gone before the click handler fires.
  const preventSelectionClear = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
  }, []);

  const handleUndo = useCallback(() => {
    void undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    void redo();
  }, [redo]);

  return (
    <div className={className} role="toolbar" aria-label="Editor tools" data-testid="editor-toolbar">
      {/* Tool buttons */}
      {TOOLS.map((entry) => {
        const { tool, label } = entry;
        const isActive = !entry.action && activeTool === tool;
        return (
          <button
            key={tool}
            type="button"
            data-testid={`tool-${tool}`}
            data-tool={tool}
            data-active={isActive}
            aria-pressed={isActive}
            onMouseDown={preventSelectionClear}
            onClick={() => handleToolClick(entry)}
          >
            {label}
          </button>
        );
      })}

      {/* Separator */}
      <hr aria-orientation="vertical" />

      {/* Undo/Redo */}
      <button
        type="button"
        data-testid="undo-button"
        disabled={!canUndo}
        onMouseDown={preventSelectionClear}
        onClick={handleUndo}
        aria-label="Undo"
      >
        Undo
      </button>
      <button
        type="button"
        data-testid="redo-button"
        disabled={!canRedo}
        onMouseDown={preventSelectionClear}
        onClick={handleRedo}
        aria-label="Redo"
      >
        Redo
      </button>
    </div>
  );
}
