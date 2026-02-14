'use client';

import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';

interface RequestCounter {
  next: () => number;
  invalidate: () => number;
  isCurrent: (requestId: number) => boolean;
  getCurrent: () => number;
}

function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function useMountedRef(): MutableRefObject<boolean> {
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}

function useRequestCounter(initialValue = 0): RequestCounter {
  const counterRef = useRef(initialValue);
  const apiRef = useRef<RequestCounter | null>(null);

  if (!apiRef.current) {
    apiRef.current = {
      next: () => {
        counterRef.current += 1;
        return counterRef.current;
      },
      invalidate: () => {
        counterRef.current += 1;
        return counterRef.current;
      },
      isCurrent: (requestId: number) => requestId === counterRef.current,
      getCurrent: () => counterRef.current,
    };
  }

  return apiRef.current;
}

export { useLatestRef, useMountedRef, useRequestCounter };
export type { RequestCounter };
