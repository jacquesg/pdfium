/**
 * Page management hook for the editor.
 *
 * Wraps page-level document operations (delete, insert, move)
 * with commands pushed to the undo stack.
 *
 * @module react/editor/hooks/use-page-management
 */

import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { usePDFiumDocument } from '../../context.js';
import { DeletePageCommand, InsertBlankPageCommand, MovePageCommand } from '../command.js';
import { useEditor } from '../context.js';

/**
 * Return type of `usePageManagement`.
 */
export interface PageManagementActions {
  /** Delete a page by index. Requires width/height for undo (re-insert blank). */
  deletePage(pageIndex: number, width: number, height: number): Promise<void>;
  /** Insert a blank page at the given index. */
  insertBlankPage(pageIndex: number, width?: number, height?: number): Promise<void>;
  /** Move a page to a new destination index. */
  movePage(pageIndex: number, destPageIndex: number): Promise<void>;
}

/**
 * Provides page management operations integrated with the editor's undo/redo stack.
 *
 * Must be called within an `EditorProvider` and `PDFiumProvider`.
 */
export function usePageManagement(document: WorkerPDFiumDocument | null): PageManagementActions {
  const { bumpDocumentRevision } = usePDFiumDocument();
  const { commandStack } = useEditor();

  const deletePage = useCallback(
    async (pageIndex: number, width: number, height: number): Promise<void> => {
      if (!document) return;
      const cmd = new DeletePageCommand(document, pageIndex, width, height);
      await commandStack.push(cmd);
      bumpDocumentRevision();
    },
    [document, commandStack, bumpDocumentRevision],
  );

  const insertBlankPage = useCallback(
    async (pageIndex: number, width = 612, height = 792): Promise<void> => {
      if (!document) return;
      const cmd = new InsertBlankPageCommand(document, pageIndex, width, height);
      await commandStack.push(cmd);
      bumpDocumentRevision();
    },
    [document, commandStack, bumpDocumentRevision],
  );

  const movePage = useCallback(
    async (pageIndex: number, destPageIndex: number): Promise<void> => {
      if (!document) return;
      const cmd = new MovePageCommand(document, [pageIndex], destPageIndex);
      await commandStack.push(cmd);
      bumpDocumentRevision();
    },
    [document, commandStack, bumpDocumentRevision],
  );

  return { deletePage, insertBlankPage, movePage };
}
