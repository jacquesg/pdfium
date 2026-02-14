'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import { useLatestRef, useMountedRef, useRequestCounter } from '../internal/async-guards.js';

interface UseDocumentBytesResult {
  /** Serialise the current document state to bytes. Returns `undefined` if no document or if already saving. */
  save: () => Promise<Uint8Array | undefined>;
  isSaving: boolean;
  error: Error | null;
}

/**
 * Hook for saving the current document to a `Uint8Array`.
 *
 * Wraps `WorkerPDFiumDocument.save()` with loading/error state and a
 * concurrent-execution guard.
 */
function useDocumentBytes(document: WorkerPDFiumDocument | null): UseDocumentBytesResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inflightRef = useRef(false);
  const inflightDocumentRef = useRef<WorkerPDFiumDocument | null>(null);
  const requestCounter = useRequestCounter();
  const docRef = useLatestRef(document);
  const previousDocumentRef = useRef(document);
  const mountedRef = useMountedRef();

  useEffect(() => {
    return () => {
      requestCounter.invalidate();
      inflightRef.current = false;
      inflightDocumentRef.current = null;
    };
  }, [requestCounter]);

  useEffect(() => {
    const previousDocument = previousDocumentRef.current;
    previousDocumentRef.current = document;
    if (previousDocument === document) return;

    // Invalidate pending saves from prior document instances.
    requestCounter.invalidate();
    inflightRef.current = false;
    inflightDocumentRef.current = null;
    setIsSaving(false);
    setError(null);
  }, [document, requestCounter]);

  const save = useCallback(async (): Promise<Uint8Array | undefined> => {
    const doc = docRef.current;
    if (!doc) return undefined;
    if (inflightRef.current && inflightDocumentRef.current === doc) return undefined;
    const requestId = requestCounter.next();

    inflightRef.current = true;
    inflightDocumentRef.current = doc;
    if (mountedRef.current) {
      setIsSaving(true);
      setError(null);
    }

    try {
      const bytes = await doc.save();
      if (!mountedRef.current || !requestCounter.isCurrent(requestId)) return undefined;
      return bytes;
    } catch (err: unknown) {
      if (!mountedRef.current || !requestCounter.isCurrent(requestId)) return undefined;
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      return undefined;
    } finally {
      if (requestCounter.isCurrent(requestId)) {
        inflightRef.current = false;
        inflightDocumentRef.current = null;
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    }
  }, [docRef, mountedRef, requestCounter]);

  return { save, isSaving, error };
}

export { useDocumentBytes };
export type { UseDocumentBytesResult };
