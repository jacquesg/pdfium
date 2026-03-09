/**
 * Page management panel.
 *
 * Provides action buttons for page operations: delete, insert blank,
 * and rotate. Designed to work alongside the thumbnail strip.
 *
 * @module react/editor/components/page-management-panel
 */

import type { ReactNode } from 'react';
import type { PageManagementActions } from '../hooks/use-page-management.js';
import { usePageManagementPanelActions } from '../hooks/use-page-management-panel-actions.js';
import { PageManagementPanelControls } from './page-management-panel-controls.js';

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
  const panelActions = usePageManagementPanelActions({
    actions,
    pageHeight,
    pageIndex,
    pageCount,
    pageWidth,
  });

  return (
    <div data-testid="page-management-panel" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{panelActions.pageLabel}</div>
      <PageManagementPanelControls
        canDelete={panelActions.canDelete}
        canMoveDown={panelActions.canMoveDown}
        canMoveUp={panelActions.canMoveUp}
        onDelete={panelActions.handleDelete}
        onInsertAfter={panelActions.handleInsertAfter}
        onInsertBefore={panelActions.handleInsertBefore}
        onMoveDown={panelActions.handleMoveDown}
        onMoveUp={panelActions.handleMoveUp}
      />
    </div>
  );
}
