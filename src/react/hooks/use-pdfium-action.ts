'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PDFiumError } from '../../core/errors.js';
import { useLatestRef, useMountedRef, useRequestCounter } from '../internal/async-guards.js';

function extractErrorMessage(err: unknown): string {
  if (err instanceof PDFiumError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

interface PDFiumActionState<A extends ReadonlyArray<unknown>, R> {
  execute: (...args: A) => Promise<R | undefined>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

function usePDFiumAction<A extends ReadonlyArray<unknown>, R>(
  action: (...args: A) => Promise<R>,
): PDFiumActionState<A, R> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef(false);
  const requestCounter = useRequestCounter();
  const previousActionRef = useRef(action);
  const mountedRef = useMountedRef();
  const actionRef = useLatestRef(action);

  useEffect(() => {
    if (previousActionRef.current !== action) {
      previousActionRef.current = action;
      // Invalidate pending executions from previous action instance.
      requestCounter.invalidate();
      inflightRef.current = false;
      setIsLoading(false);
      setError(null);
    }
  }, [action, requestCounter]);

  useEffect(() => {
    return () => {
      requestCounter.invalidate();
      inflightRef.current = false;
    };
  }, [requestCounter]);

  const execute = useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (inflightRef.current) return undefined;
      const requestId = requestCounter.next();
      inflightRef.current = true;
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await actionRef.current(...args);
        if (!requestCounter.isCurrent(requestId)) return undefined;
        return result;
      } catch (err: unknown) {
        if (!requestCounter.isCurrent(requestId)) return undefined;
        if (mountedRef.current) setError(extractErrorMessage(err));
        return undefined;
      } finally {
        if (requestCounter.isCurrent(requestId)) {
          inflightRef.current = false;
          if (mountedRef.current) setIsLoading(false);
        }
      }
    },
    [actionRef, mountedRef, requestCounter],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { execute, isLoading, error, reset };
}

export type { PDFiumActionState };
export { usePDFiumAction };
