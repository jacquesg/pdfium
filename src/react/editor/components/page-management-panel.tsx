/**
 * Page management panel.
 *
 * Provides action buttons for page operations: delete, insert blank,
 * and rotate. Designed to work alongside the thumbnail strip.
 *
 * @module react/editor/components/page-management-panel
 */

import { type ReactNode, useCallback } from 'react';
import type { PageManagementActions } from '../hooks/use-page-management.js';

/**
 * Props for the `PageManagementPanel` component.
 */
export interface PageManagementPanelProps {
  /** The currently selected page index. */
  readonly pageIndex: number;
  /** Total number of pages in the document. */
  readonly pageCount: number;
  /** Page width in PDF points (for delete undo). */
  readonly pageWidth: number;
  /** Page height in PDF points (for delete undo). */
  readonly pageHeight: number;
  /** Page management actions from `usePageManagement`. */
  readonly actions: PageManagementActions;
}

/**
 * Panel with action buttons for page management.
 *
 * Provides delete, insert before, insert after, and move operations.
 * Respects page bounds (cannot delete last page, etc.).
 */
export function PageManagementPanel({
  pageIndex,
  pageCount,
  pageWidth,
  pageHeight,
  actions,
}: PageManagementPanelProps): ReactNode {
  const handleDelete = useCallback(() => {
    if (pageCount <= 1) return;
    void actions.deletePage(pageIndex, pageWidth, pageHeight);
  }, [pageIndex, pageCount, pageWidth, pageHeight, actions]);

  const handleInsertBefore = useCallback(() => {
    void actions.insertBlankPage(pageIndex);
  }, [pageIndex, actions]);

  const handleInsertAfter = useCallback(() => {
    void actions.insertBlankPage(pageIndex + 1);
  }, [pageIndex, actions]);

  const handleMoveUp = useCallback(() => {
    if (pageIndex <= 0) return;
    void actions.movePage(pageIndex, pageIndex - 1);
  }, [pageIndex, actions]);

  const handleMoveDown = useCallback(() => {
    if (pageIndex >= pageCount - 1) return;
    void actions.movePage(pageIndex, pageIndex + 2);
  }, [pageIndex, pageCount, actions]);

  const buttonStyle = {
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: 3,
    background: '#fff',
  };

  return (
    <div data-testid="page-management-panel" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>
        Page {pageIndex + 1} of {pageCount}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="delete-page-button"
          onClick={handleDelete}
          disabled={pageCount <= 1}
          style={{ ...buttonStyle, opacity: pageCount <= 1 ? 0.5 : 1 }}
        >
          Delete
        </button>

        <button type="button" data-testid="insert-before-button" onClick={handleInsertBefore} style={buttonStyle}>
          Insert Before
        </button>

        <button type="button" data-testid="insert-after-button" onClick={handleInsertAfter} style={buttonStyle}>
          Insert After
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          data-testid="move-up-button"
          onClick={handleMoveUp}
          disabled={pageIndex <= 0}
          style={{ ...buttonStyle, opacity: pageIndex <= 0 ? 0.5 : 1 }}
        >
          Move Up
        </button>

        <button
          type="button"
          data-testid="move-down-button"
          onClick={handleMoveDown}
          disabled={pageIndex >= pageCount - 1}
          style={{ ...buttonStyle, opacity: pageIndex >= pageCount - 1 ? 0.5 : 1 }}
        >
          Move Down
        </button>
      </div>
    </div>
  );
}
