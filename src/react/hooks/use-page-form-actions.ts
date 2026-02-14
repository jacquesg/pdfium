'use client';

import { useCallback, useRef } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { FlattenFlags, FlattenResult } from '../../core/types.js';
import { usePDFiumDocument } from '../context.js';
import { useMountedRef } from '../internal/async-guards.js';
import { disposeSafelyAsync } from '../internal/dispose-safely.js';

function usePageFormActions(document: WorkerPDFiumDocument | null, pageIndex: number) {
  const { bumpDocumentRevision } = usePDFiumDocument();
  const documentRef = useRef(document);
  documentRef.current = document;
  const mountedRef = useMountedRef();

  const flatten = useCallback(
    async (flags?: FlattenFlags): Promise<FlattenResult | null> => {
      if (!mountedRef.current || !document) return null;
      const page = await document.getPage(pageIndex);
      try {
        const result = await page.flatten(flags);
        if (mountedRef.current && documentRef.current === document) {
          bumpDocumentRevision();
        }
        return result;
      } finally {
        await disposeSafelyAsync(page);
      }
    },
    [document, pageIndex, bumpDocumentRevision, mountedRef],
  );

  const undo = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current || !document) return false;
    const page = await document.getPage(pageIndex);
    try {
      const result = await page.formUndo();
      if (result && mountedRef.current && documentRef.current === document) bumpDocumentRevision();
      return result;
    } finally {
      await disposeSafelyAsync(page);
    }
  }, [document, pageIndex, bumpDocumentRevision, mountedRef]);

  const canUndo = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current || !document) return false;
    const page = await document.getPage(pageIndex);
    try {
      return await page.canFormUndo();
    } finally {
      await disposeSafelyAsync(page);
    }
  }, [document, pageIndex, mountedRef]);

  const getSelectedText = useCallback(async (): Promise<string | null> => {
    if (!mountedRef.current || !document) return null;
    const page = await document.getPage(pageIndex);
    try {
      return await page.getFormSelectedText();
    } finally {
      await disposeSafelyAsync(page);
    }
  }, [document, pageIndex, mountedRef]);

  return { flatten, undo, canUndo, getSelectedText };
}

export { usePageFormActions };
