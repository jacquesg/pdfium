import { useCallback, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../../../context/worker-client.js';
import { ApplyRedactionsCommand } from '../command.js';
import { countMarkedRedactions } from './redaction-apply-support.js';

interface UseRedactionApplyActionOptions {
  readonly bumpPageRevision: (pageIndex: number) => void;
  readonly commandStack: { push: (command: ApplyRedactionsCommand) => Promise<void> };
  readonly document: WorkerPDFiumDocument | null;
  readonly instance: { openDocument: (data: Uint8Array | ArrayBuffer) => Promise<WorkerPDFiumDocument> } | null;
}

export function useRedactionApplyAction({
  bumpPageRevision,
  commandStack,
  document,
  instance,
}: UseRedactionApplyActionOptions) {
  const [isApplying, setIsApplying] = useState(false);
  const isApplyingRef = useRef(false);

  const applyRedactions = useCallback(
    async (pageIndex: number): Promise<void> => {
      if (!document || !instance || isApplyingRef.current) return;
      isApplyingRef.current = true;
      setIsApplying(true);
      try {
        if ((await countMarkedRedactions(document, pageIndex)) === 0) {
          return;
        }

        await commandStack.push(new ApplyRedactionsCommand(document, (data) => instance.openDocument(data), pageIndex));
        bumpPageRevision(pageIndex);
      } finally {
        isApplyingRef.current = false;
        setIsApplying(false);
      }
    },
    [document, instance, bumpPageRevision, commandStack],
  );

  return { applyRedactions, isApplying };
}
