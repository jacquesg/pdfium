'use client';

import { useCallback, useRef } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { Colour, FormFieldType } from '../../core/types.js';
import { usePDFiumDocument } from '../context.js';
import { useMountedRef } from '../internal/async-guards.js';

function useDocumentFormActions(document: WorkerPDFiumDocument | null) {
  const { bumpDocumentRevision } = usePDFiumDocument();
  const documentRef = useRef(document);
  documentRef.current = document;
  const mountedRef = useMountedRef();

  const killFocus = useCallback(async () => {
    if (!mountedRef.current || !document) return false;
    const result = await document.killFormFocus();
    if (mountedRef.current && documentRef.current === document) {
      bumpDocumentRevision();
    }
    return result;
  }, [document, bumpDocumentRevision, mountedRef]);

  const setHighlight = useCallback(
    async (fieldType: FormFieldType, colour: Colour, alpha: number) => {
      if (!mountedRef.current || !document) return;
      await document.setFormHighlight(fieldType, colour, alpha);
      if (mountedRef.current && documentRef.current === document) {
        bumpDocumentRevision();
      }
    },
    [document, bumpDocumentRevision, mountedRef],
  );

  return { killFocus, setHighlight };
}

export { useDocumentFormActions };
