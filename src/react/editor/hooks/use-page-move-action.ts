import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { MovePageCommand } from '../command.js';
import type { RunPageManagementCommand } from './use-page-management-command-runner.js';

export function usePageMoveAction(document: WorkerPDFiumDocument | null, runCommand: RunPageManagementCommand) {
  return useCallback(
    async (pageIndex: number, destPageIndex: number): Promise<void> => {
      if (!document) return;
      await runCommand(new MovePageCommand(document, [pageIndex], destPageIndex));
    },
    [document, runCommand],
  );
}
