import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { DeletePageCommand } from '../command.js';
import type { RunPageManagementCommand } from './use-page-management-command-runner.js';

export function usePageDeleteAction(document: WorkerPDFiumDocument | null, runCommand: RunPageManagementCommand) {
  return useCallback(
    async (pageIndex: number, width: number, height: number): Promise<void> => {
      if (!document) return;
      await runCommand(new DeletePageCommand(document, pageIndex, width, height));
    },
    [document, runCommand],
  );
}
