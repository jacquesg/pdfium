import { useCallback } from 'react';
import { usePDFiumDocument } from '../../context.js';
import type { EditorCommand } from '../command-shared.js';
import { useEditor } from '../context.js';

export type RunPageManagementCommand = (command: EditorCommand) => Promise<void>;

export function usePageManagementCommandRunner(): RunPageManagementCommand {
  const { bumpDocumentRevision } = usePDFiumDocument();
  const { commandStack } = useEditor();

  return useCallback(
    async (command: EditorCommand): Promise<void> => {
      await commandStack.push(command);
      bumpDocumentRevision();
    },
    [commandStack, bumpDocumentRevision],
  );
}
