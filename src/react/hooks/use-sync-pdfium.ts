'use client';

import { useContext, useEffect, useState } from 'react';
import type { PDFium } from '../../pdfium.js';
import { PDFiumBinaryContext } from '../context.js';
import { disposeSafely } from '../internal/dispose-safely.js';

// ---------------------------------------------------------------------------
// Module-level ref-counted cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  instance: PDFium;
  refCount: number;
}

const syncCache = new Map<string, CacheEntry>();
const pendingInits = new Map<string, Promise<PDFium>>();
const pendingRefCounts = new Map<string, number>();
const binaryIdentityKeys = new WeakMap<ArrayBuffer, string>();
let binaryIdentityCounter = 0;

function getBinaryIdentityKey(binary: ArrayBuffer): string {
  const existing = binaryIdentityKeys.get(binary);
  if (existing) return existing;

  binaryIdentityCounter += 1;
  const next = `${__WASM_HASH__}:${binaryIdentityCounter}`;
  binaryIdentityKeys.set(binary, next);
  return next;
}

interface UseSyncPDFiumResult {
  instance: PDFium | null;
  isInitialising: boolean;
  error: Error | null;
}

function disposeSyncInstanceSafely(instance: PDFium): void {
  disposeSafely(instance, {
    onError: (error) => {
      if (__DEV__) console.warn('[PDFium] Failed to dispose sync PDFium instance:', error);
    },
  });
}

/**
 * Provides a **main-thread** PDFium instance for synchronous operations
 * (e.g. `createDocument`, direct page manipulation).
 *
 * The instance is ref-counted: all consumers within the same provider share a
 * single `PDFium` instance, which is disposed only when the last consumer unmounts.
 *
 * Requires `<PDFiumProvider>` — uses the same WASM binary that the provider resolved.
 */
function useSyncPDFium(): UseSyncPDFiumResult {
  const binary = useContext(PDFiumBinaryContext);
  const [instance, setInstance] = useState<PDFium | null>(null);
  const [isInitialising, setIsInitialising] = useState(binary !== null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!binary) {
      setIsInitialising(false);
      setInstance(null);
      setError(null);
      return;
    }

    let active = true;
    const key = getBinaryIdentityKey(binary);

    // Cache hit — reuse existing instance
    const cached = syncCache.get(key);
    if (cached) {
      cached.refCount++;
      setInstance(cached.instance);
      setIsInitialising(false);
      return () => {
        if (--cached.refCount === 0) {
          disposeSyncInstanceSafely(cached.instance);
          syncCache.delete(key);
        }
      };
    }

    // No cache hit: this subscriber is pending until init resolves.
    setIsInitialising(true);
    setError(null);
    pendingRefCounts.set(key, (pendingRefCounts.get(key) ?? 0) + 1);

    // Deduplicate concurrent initialisations and finalise cache exactly once.
    let initPromise = pendingInits.get(key);
    if (!initPromise) {
      // Dynamic import avoids pulling the full PDFium class into the React bundle
      // when tree-shaken. It also avoids circular dependency issues.
      initPromise = import('../../pdfium.js')
        .then(({ PDFium: PDFiumClass }) => PDFiumClass.init({ wasmBinary: binary, forceWasm: true }))
        .then(
          (inst) => {
            const pending = pendingRefCounts.get(key) ?? 0;
            pendingRefCounts.delete(key);
            pendingInits.delete(key);

            if (pending <= 0) {
              // Everyone unmounted before init completed.
              disposeSyncInstanceSafely(inst);
              return inst;
            }

            const existing = syncCache.get(key);
            if (existing) {
              // Defensive: prefer already-cached instance and dispose duplicate.
              disposeSyncInstanceSafely(inst);
              existing.refCount += pending;
              return existing.instance;
            }

            syncCache.set(key, { instance: inst, refCount: pending });
            return inst;
          },
          (err: unknown) => {
            pendingRefCounts.delete(key);
            pendingInits.delete(key);
            throw err;
          },
        );
      pendingInits.set(key, initPromise);
    }

    initPromise.then(
      (inst) => {
        if (!active) return;

        setInstance(inst);
        setIsInitialising(false);
      },
      (err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsInitialising(false);
        }
      },
    );

    return () => {
      active = false;
      const entry = syncCache.get(key);
      if (entry && --entry.refCount === 0) {
        disposeSyncInstanceSafely(entry.instance);
        syncCache.delete(key);
        return;
      }
      const pending = pendingRefCounts.get(key);
      if (pending !== undefined) {
        if (pending <= 1) pendingRefCounts.delete(key);
        else pendingRefCounts.set(key, pending - 1);
      }
    };
  }, [binary]);

  return { instance, isInitialising, error };
}

export { useSyncPDFium };
export type { UseSyncPDFiumResult };
