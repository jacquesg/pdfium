/**
 * Editor toolbar component.
 *
 * Provides tool picker buttons grouped by category, plus undo/redo buttons.
 *
 * @module react/editor/components/editor-toolbar
 */

import type { ReactNode } from 'react';
import { useEditorToolbarController } from '../hooks/use-editor-toolbar-controller.js';
import { EDITOR_TOOLBAR_TOOLS } from '../toolbar-config.js';
import { EditorToolbarHistoryButtons } from './editor-toolbar-history-buttons.js';
import { EditorToolbarToolButton } from './editor-toolbar-tool-button.js';

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
  const { activeTool, canRedo, canUndo, handleRedo, handleToolClick, handleUndo, preventSelectionClear } =
    useEditorToolbarController();

  return (
    <div className={className} role="toolbar" aria-label="Editor tools" data-testid="editor-toolbar">
      {EDITOR_TOOLBAR_TOOLS.map((entry) => {
        const isActive = !entry.action && activeTool === entry.tool;
        return (
          <EditorToolbarToolButton
            key={entry.tool}
            active={isActive}
            entry={entry}
            onMouseDown={preventSelectionClear}
            onClick={handleToolClick}
          />
        );
      })}
      <EditorToolbarHistoryButtons
        canRedo={canRedo}
        canUndo={canUndo}
        onMouseDown={preventSelectionClear}
        onRedo={handleRedo}
        onUndo={handleUndo}
      />
    </div>
  );
}
