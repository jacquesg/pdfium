import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerPDFiumDocument } from '../context/worker-client.js';
import { useMountedRef, useRequestCounter } from './internal/async-guards.js';
import { clearObjectUrlRevokeTimers, triggerObjectUrlDownload } from './internal/object-url-download.js';

function useDownload(): {
  download: (document: WorkerPDFiumDocument, filename?: string) => Promise<void>;
  isDownloading: boolean;
  error: Error | null;
} {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const revokeTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const isMountedRef = useMountedRef();
  const inFlightCountRef = useRef(0);
  const requestCounter = useRequestCounter();

  useEffect(() => {
    return () => {
      requestCounter.invalidate();
      clearObjectUrlRevokeTimers(revokeTimersRef.current);
    };
  }, [requestCounter]);

  const download = useCallback(
    async (document: WorkerPDFiumDocument, filename?: string) => {
      if (typeof globalThis.document === 'undefined') return;

      const requestId = requestCounter.next();
      inFlightCountRef.current += 1;

      if (isMountedRef.current) {
        setIsDownloading(true);
        setError(null);
      }

      try {
        const bytes = await document.save();
        if (!isMountedRef.current) return;
        // Copy into a standalone ArrayBuffer to satisfy BlobPart typing
        // (Uint8Array.buffer is ArrayBufferLike which may be SharedArrayBuffer)
        const copy = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(copy).set(bytes);
        const blob = new Blob([copy], { type: 'application/pdf' });
        triggerObjectUrlDownload({
          blob,
          filename: filename ?? 'document.pdf',
          revokeTimers: revokeTimersRef.current,
        });
      } catch (err: unknown) {
        if (isMountedRef.current && requestCounter.isCurrent(requestId)) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
        if (isMountedRef.current) {
          setIsDownloading(inFlightCountRef.current > 0);
        }
      }
    },
    [isMountedRef, requestCounter],
  );

  return { download, isDownloading, error };
}

export { useDownload };
