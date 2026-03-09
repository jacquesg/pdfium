import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { InsertBlankPageCommand } from '../command.js';
import type { RunPageManagementCommand } from './use-page-management-command-runner.js';

export function usePageInsertAction(document: WorkerPDFiumDocument | null, runCommand: RunPageManagementCommand) {
  return useCallback(
    async (pageIndex: number, width = 612, height = 792): Promise<void> => {
      if (!document) return;
      await runCommand(new InsertBlankPageCommand(document, pageIndex, width, height));
    },
    [document, runCommand],
  );
}
