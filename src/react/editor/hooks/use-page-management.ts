/**
 * Page management hook for the editor.
 *
 * Wraps page-level document operations (delete, insert, move)
 * with commands pushed to the undo stack.
 *
 * @module react/editor/hooks/use-page-management
 */

import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import type { PageManagementActions } from './page-management.types.js';
import { usePageDeleteAction } from './use-page-delete-action.js';
import { usePageInsertAction } from './use-page-insert-action.js';
import { usePageManagementCommandRunner } from './use-page-management-command-runner.js';
import { usePageMoveAction } from './use-page-move-action.js';

export type { PageManagementActions } from './page-management.types.js';

/**
 * Provides page management operations integrated with the editor's undo/redo stack.
 *
 * Must be called within an `EditorProvider` and `PDFiumProvider`.
 */
export function usePageManagement(document: WorkerPDFiumDocument | null): PageManagementActions {
  const runCommand = usePageManagementCommandRunner();
  const deletePage = usePageDeleteAction(document, runCommand);
  const insertBlankPage = usePageInsertAction(document, runCommand);
  const movePage = usePageMoveAction(document, runCommand);

  return { deletePage, insertBlankPage, movePage };
}
