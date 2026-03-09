import { useCallback } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { usePDFiumDocument } from '../../context.js';
import type { EditorCommand, PageAccessor } from '../command.js';
import { useEditor } from '../context.js';

export interface AnnotationCommandBridge {
  readonly getPage: PageAccessor;
  readonly pushCommand: (command: EditorCommand) => Promise<void>;
}

export function useAnnotationCommandBridge(
  document: WorkerPDFiumDocument | null,
  pageIndex: number,
): AnnotationCommandBridge {
  const { bumpPageRevision } = usePDFiumDocument();
  const { commandStack } = useEditor();

  const getPage: PageAccessor = useCallback(async () => {
    if (!document) throw new Error('No document available');
    return document.getPage(pageIndex);
  }, [document, pageIndex]);

  const pushCommand = useCallback(
    async (command: EditorCommand): Promise<void> => {
      await commandStack.push(command);
      bumpPageRevision(pageIndex);
    },
    [bumpPageRevision, commandStack, pageIndex],
  );

  return {
    getPage,
    pushCommand,
  };
}
