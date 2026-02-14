'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { WorkerPDFium, WorkerPDFiumDocument } from '../../context/worker-client.js';
import { WorkerPDFium as WorkerPDFiumClient } from '../../context/worker-client.js';
import { disposeDocumentSafely, purgeDocumentCaches } from './document-cleanup.js';
import {
  type DocumentLifecycleAction,
  documentLifecycleReducer,
  INITIAL_DOCUMENT_LIFECYCLE_STATE,
} from './document-lifecycle.js';
import { runDocumentLoadPipeline } from './document-load-pipeline.js';
import { loadDocumentArrayBufferFromUrl } from './document-url-loader.js';
import { createErrorStateHandler } from './error-handler-adapter.js';
import { createWorkerPDFiumInstance, fetchWasmBinaryFromUrl } from './provider-bootstrap.js';
import type { UsePDFiumProviderControllerOptions } from './provider-config-types.js';
import { useProviderDocumentApi } from './provider-document-api.js';
import { disposeProviderResources, loadInitialDocumentOnInstanceReady } from './provider-lifecycle.js';
import type { ProviderPasswordValue, ProviderStableDocCallbacks } from './provider-types.js';
import { createPDFiumStores, type PDFiumStores } from './stores-context.js';
import { startWasmBinaryFetch, syncResolvedBinaryFromProp } from './wasm-binary-lifecycle.js';
import { startWorkerInitialisation } from './worker-lifecycle.js';

interface UsePDFiumProviderControllerResult {
  resolvedBinary: ArrayBuffer | null;
  scopedStores: PDFiumStores;
  instance: WorkerPDFium | null;
  document: WorkerPDFiumDocument | null;
  documentName: string | null;
  documentRevision: number;
  error: Error | null;
  isInitialising: boolean;
  stableDocCallbacks: ProviderStableDocCallbacks;
  passwordValue: ProviderPasswordValue;
}

function usePDFiumProviderController({
  wasmBinary,
  wasmUrl,
  workerUrl,
  initialDocument,
  maxCachedPages,
  stores,
}: UsePDFiumProviderControllerOptions): UsePDFiumProviderControllerResult {
  const [resolvedBinary, setResolvedBinary] = useState<ArrayBuffer | null>(wasmBinary ?? null);
  const [instance, setInstance] = useState<WorkerPDFium | null>(null);
  const [documentLifecycle, dispatchDocumentLifecycle] = useReducer(
    documentLifecycleReducer,
    INITIAL_DOCUMENT_LIFECYCLE_STATE,
  );
  const document = documentLifecycle.document;
  const documentName = documentLifecycle.documentName;
  const [documentRevision, setDocumentRevision] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialising, setIsInitialising] = useState(true);

  const documentRef = useRef<WorkerPDFiumDocument | null>(null);
  const instanceRef = useRef<WorkerPDFium | null>(null);
  const loadGenerationRef = useRef(0);
  const storesRef = useRef<PDFiumStores | null>(null);
  const warnedStoresChangeRef = useRef(false);
  const mountedRef = useRef(true);

  const dispatchDocumentLifecycleSafe = useCallback((action: DocumentLifecycleAction) => {
    if (!mountedRef.current) return;
    dispatchDocumentLifecycle(action);
  }, []);

  const setDocumentRevisionSafe = useCallback((updater: (prev: number) => number) => {
    if (!mountedRef.current) return;
    setDocumentRevision(updater);
  }, []);

  const setResolvedBinarySafe = useCallback((binary: ArrayBuffer) => {
    if (!mountedRef.current) return;
    setResolvedBinary(binary);
  }, []);

  const setInstanceSafe = useCallback((nextInstance: WorkerPDFium | null) => {
    if (!mountedRef.current) return;
    setInstance(nextInstance);
  }, []);

  const setIsInitialisingSafe = useCallback((value: boolean) => {
    if (!mountedRef.current) return;
    setIsInitialising(value);
  }, []);

  const setErrorStateSafe = useCallback<Dispatch<SetStateAction<Error | null>>>((nextErrorState) => {
    if (!mountedRef.current) return;
    setError(nextErrorState);
  }, []);

  const clearErrorStateSafe = useCallback(() => {
    if (!mountedRef.current) return;
    setError(null);
  }, []);

  const handleErrorState = useMemo(() => createErrorStateHandler(setErrorStateSafe), [setErrorStateSafe]);

  if (!storesRef.current) {
    storesRef.current = stores ?? createPDFiumStores();
  }
  if (__DEV__ && stores !== undefined && stores !== storesRef.current && !warnedStoresChangeRef.current) {
    warnedStoresChangeRef.current = true;
    console.warn(
      '[PDFium] The `stores` prop changed after initial mount. PDFiumProvider captures stores on first render only.',
    );
  }

  const scopedStores = storesRef.current;

  useEffect(() => {
    if (maxCachedPages !== undefined) {
      scopedStores.renderStore.maxEntries = maxCachedPages;
    }
  }, [maxCachedPages, scopedStores]);

  useEffect(() => {
    syncResolvedBinaryFromProp({
      wasmBinary,
      setResolvedBinary: setResolvedBinarySafe,
    });
  }, [setResolvedBinarySafe, wasmBinary]);

  useEffect(() => {
    return startWasmBinaryFetch({
      wasmBinary,
      wasmUrl,
      fetchBinaryFromUrl: (url, signal) => fetchWasmBinaryFromUrl(url, (input, init) => fetch(input, init), signal),
      setResolvedBinary: setResolvedBinarySafe,
      setError: handleErrorState,
      setIsInitialising: setIsInitialisingSafe,
    });
  }, [handleErrorState, setIsInitialisingSafe, setResolvedBinarySafe, wasmBinary, wasmUrl]);

  useEffect(() => {
    if (!resolvedBinary) return;
    return startWorkerInitialisation({
      workerUrl,
      wasmBinary: resolvedBinary,
      createWorker: ({ workerUrl: nextWorkerUrl, wasmBinary: nextWasmBinary }) =>
        createWorkerPDFiumInstance({
          workerUrl: nextWorkerUrl,
          wasmBinary: nextWasmBinary,
          createWorker: WorkerPDFiumClient.create,
        }),
      instanceRef,
      setInstance: setInstanceSafe,
      setIsInitialising: setIsInitialisingSafe,
      setError: handleErrorState,
    });
  }, [handleErrorState, resolvedBinary, setInstanceSafe, setIsInitialisingSafe, workerUrl]);

  const loadDocumentInternal = useCallback(
    async (inst: WorkerPDFium, data: ArrayBuffer | Uint8Array, name: string, password?: string) => {
      const generation = ++loadGenerationRef.current;
      const oldDoc = documentRef.current;

      const disposeOld = async () => {
        await disposeDocumentSafely({
          document: oldDoc,
          onError: (disposeErr) => {
            if (__DEV__) console.warn('[PDFium] Failed to dispose previous document:', disposeErr);
          },
        });
        purgeDocumentCaches(scopedStores, oldDoc?.id);
      };

      await runDocumentLoadPipeline({
        data,
        generation,
        getCurrentGeneration: () => loadGenerationRef.current,
        openDocument: (nextData, options) => inst.openDocument(nextData, options),
        disposePreviousDocument: disposeOld,
        onLoadSuccess: (newDoc) => {
          documentRef.current = newDoc;
          dispatchDocumentLifecycleSafe({ type: 'loadSuccess', document: newDoc, name });
          setDocumentRevisionSafe((prev: number) => prev + 1);
          clearErrorStateSafe();
        },
        onPasswordRequired: () => {
          documentRef.current = null;
          clearErrorStateSafe();
          dispatchDocumentLifecycleSafe({ type: 'passwordRequired', request: { data, name } });
        },
        onPasswordIncorrect: () => {
          documentRef.current = null;
          clearErrorStateSafe();
          dispatchDocumentLifecycleSafe({ type: 'passwordIncorrect' });
        },
        onGenericError: (nextError) => {
          documentRef.current = null;
          dispatchDocumentLifecycleSafe({ type: 'clearDocument' });
          handleErrorState(nextError);
        },
        onStaleDocumentDisposeError: (disposeErr) => {
          if (__DEV__) console.warn('[PDFium] Failed to dispose stale document:', disposeErr);
        },
        ...(password !== undefined ? { password } : {}),
      });
    },
    [clearErrorStateSafe, dispatchDocumentLifecycleSafe, handleErrorState, scopedStores, setDocumentRevisionSafe],
  );

  const loadDocumentBufferFromUrl = useCallback(
    async (url: string, signal?: AbortSignal) =>
      loadDocumentArrayBufferFromUrl({
        url,
        baseHref: globalThis.location?.href,
        fetchFn: (input, init) => fetch(input, init),
        ...(signal ? { signal } : {}),
      }),
    [],
  );

  const { stableDocCallbacks, passwordValue } = useProviderDocumentApi({
    instance,
    documentLifecycle,
    dispatchDocumentLifecycle: dispatchDocumentLifecycleSafe,
    scopedStores,
    loadDocumentInternal,
    loadDocumentBufferFromUrl,
    setDocumentRevision: setDocumentRevisionSafe,
    setError: handleErrorState,
  });

  useEffect(() => {
    // Any instance transition invalidates in-flight loads started by a prior worker.
    if (instance === null) {
      loadGenerationRef.current += 1;
      return;
    }
    loadGenerationRef.current += 1;
  }, [instance]);

  const initialDocRef = useRef(initialDocument);
  useEffect(() => {
    // Runs after generation invalidation so first load on a new instance is current.
    loadInitialDocumentOnInstanceReady({
      instance,
      initialDocument: initialDocRef.current,
      loadDocumentInternal,
    });
  }, [instance, loadDocumentInternal]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Invalidate in-flight loads so late opens are treated as stale and disposed.
      loadGenerationRef.current += 1;
      disposeProviderResources({
        document: documentRef.current,
        instance: instanceRef.current,
        scopedStores,
        onDocumentDisposeError: (err) => {
          if (__DEV__) console.warn('[PDFium] Failed to dispose document on unmount:', err);
        },
        onInstanceDisposeError: (err) => {
          if (__DEV__) console.warn('[PDFium] Failed to dispose worker instance on unmount:', err);
        },
      });
    };
  }, [scopedStores]);

  return {
    resolvedBinary,
    scopedStores,
    instance,
    document,
    documentName,
    documentRevision,
    error,
    isInitialising,
    stableDocCallbacks,
    passwordValue,
  };
}

export { usePDFiumProviderController };
export type { UsePDFiumProviderControllerOptions, UsePDFiumProviderControllerResult };
